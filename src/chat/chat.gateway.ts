import {
  WebSocketGateway,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AwsS3Service } from 'src/aws/aws-s3.service';
import { ChatService } from './chat.service';
import { Buffer } from 'buffer';
import { Readable } from 'stream';

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private users: Map<string, Socket> = new Map(); // email -> socket
  private userEmails: Map<string, string> = new Map(); // socket.id -> email

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly s3Service: AwsS3Service, // ✅ Injected S3 service
    private readonly chatService: ChatService, // ✅ Injected Chat service
  ) {}

  private extractTokenFromCookies(cookieHeader: string | undefined): string | null {
    if (!cookieHeader) return null;

    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    return cookies['accessToken'] || null;
  }

  async handleConnection(client: Socket) {
    // Try to get token from cookies first (HTTP-only cookie auth)
    const cookieHeader = client.handshake.headers.cookie;
    let token = this.extractTokenFromCookies(cookieHeader);

    // Fallback to query parameter for backwards compatibility
    if (!token) {
      const queryToken = client.handshake.query.token;
      token = Array.isArray(queryToken)
        ? queryToken[0]
        : (queryToken || null);
    }

    if (!token) {
      console.error('Authentication failed: Token is required');
      client.emit('error', {
        message: 'Token is required',
        code: 'AUTH_TOKEN_REQUIRED',
        requiresLogin: true
      });
      // Small delay to ensure client receives the error before disconnecting
      setTimeout(() => client.disconnect(), 100);
      return;
    }

    try {
      const decoded = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      const email = decoded.email;

      if (!email) {
        console.error('Authentication failed: Invalid token');
        client.emit('error', {
          message: 'Invalid token',
          code: 'AUTH_INVALID_TOKEN',
          requiresLogin: true
        });
        setTimeout(() => client.disconnect(), 100);
        return;
      }

      this.users.set(email, client);
      this.userEmails.set(client.id, email);

      console.log(`Client connected: ${email}`);

      // ✅ Send any unread messages to the user upon connection
      const unreadMessages = await this.chatService.getUnreadMessages(email);
      if (unreadMessages.length > 0) {
        console.log(`Delivering ${unreadMessages.length} unread messages to ${email}`);
        for (const message of unreadMessages) {
          const messagePayload = {
            sender: message.sender,
            text: message.text,
            receiver: message.receiver,
            mode: message.mode,
            mediaUrl: message.mediaUrl,
            filename: message.filename,
            mimetype: message.mimetype,
            isMedia: message.isMedia,
            _id: (message as any)._id,
            createdAt: message.createdAt,
          };
          
          // Emit with the correct event name based on message type
          if (message.isMedia) {
            client.emit('mediaMessage', messagePayload);
          } else {
            client.emit('message', messagePayload);
          }
          
          // Mark as delivered
          await this.chatService.markAsDelivered((message as any)._id.toString());
        }
      }
    } catch (error) {
      console.error('Authentication failed', error);
      client.emit('error', {
        message: 'Invalid or expired token',
        code: 'AUTH_TOKEN_EXPIRED',
        requiresLogin: true
      });
      setTimeout(() => client.disconnect(), 100);
    }
  }

  handleDisconnect(client: Socket) {
    const email = this.userEmails.get(client.id);

    if (email) {
      this.users.delete(email);
      this.userEmails.delete(client.id);
      console.log(`Client disconnected: ${email}`);
    }
  }

  /**
   * PRIVATE MESSAGE
   */
  @SubscribeMessage('message')
  async handlePrivateMessage(
    @MessageBody() message: { sender: string; receiver: string; text: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { sender, receiver, text } = message;

    // ✅ Save message to database first
    const savedMessage = await this.chatService.saveMessage({
      sender,
      receiver,
      text,
      mode: 'private',
    });

    const messagePayload = {
      sender,
      text,
      receiver,
      mode: 'private',
      _id: (savedMessage as any)._id,
      createdAt: savedMessage.createdAt,
    };

    const receiverSocket = this.users.get(receiver);

    if (receiverSocket) {
      // ✅ Receiver is online - send immediately and mark as delivered
      receiverSocket.emit('message', messagePayload);
      await this.chatService.markAsDelivered((savedMessage as any)._id.toString());
      console.log(`Private message from ${sender} to ${receiver}: ${text} - Delivered`);
    } else {
      // ✅ Receiver is offline - message is saved and will be delivered when they connect
      console.log(`Private message from ${sender} to ${receiver}: ${text} - Saved for later delivery`);
    }

    // ✅ Don't echo back to sender - frontend adds message optimistically
    // This prevents duplicate messages in the sender's chat
  }

  /**
   * CREATE GROUP
   */
  @SubscribeMessage('createGroup')
  handleCreateGroup(
    @MessageBody() data: { groupName: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { groupName } = data;

    client.join(groupName);
    console.log(`Client ${client.id} created and joined group: ${groupName}`);
    client.emit('groupCreated', { groupName });
  }

  /**
   * JOIN GROUP
   */
  @SubscribeMessage('joinGroup')
  handleJoinGroup(
    @MessageBody() data: { groupName: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { groupName } = data;

    client.join(groupName);
    console.log(`Client ${client.id} joined group: ${groupName}`);
    client.emit('groupJoined', { groupName });
  }

  /**
   * LEAVE GROUP (optional)
   */
  @SubscribeMessage('leaveGroup')
  handleLeaveGroup(
    @MessageBody() data: { groupName: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { groupName } = data;

    client.leave(groupName);
    console.log(`Client ${client.id} left group: ${groupName}`);
    client.emit('groupLeft', { groupName });
  }

  /**
   * GROUP MESSAGE
   */
  @SubscribeMessage('groupMessage')
  async handleGroupMessage(
    @MessageBody() message: { sender: string; groupName: string; text: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { sender, groupName, text } = message;

    // ✅ Save message to database first
    const savedMessage = await this.chatService.saveMessage({
      sender,
      groupName,
      text,
      mode: 'group',
    });

    const groupPayload = {
      sender,
      text,
      groupName,
      mode: 'group',
      _id: (savedMessage as any)._id,
      createdAt: savedMessage.createdAt,
    };

    client.to(groupName).emit('groupMessage', groupPayload);

    console.log(`Group message in ${groupName} from ${sender}: ${text}`);
  }

  /**
   * CALL INITIATION (WebRTC Signaling)
   */
  @SubscribeMessage('call:initiate')
  handleCallInitiate(
    @MessageBody() data: { caller: string; callee: string; offer: any; callType: 'audio' | 'video' },
    @ConnectedSocket() client: Socket,
  ) {
    const { caller, callee, offer, callType } = data;
    const calleeSocket = this.users.get(callee);

    if (calleeSocket) {
      calleeSocket.emit('call:incoming', { caller, offer, callType });
      console.log(`Call initiated from ${caller} to ${callee} (${callType})`);
    } else {
      client.emit('call:error', { message: `User ${callee} is not available` });
      console.log(`Call failed: ${callee} is not connected`);
    }
  }

  /**
   * CALL ANSWER
   */
  @SubscribeMessage('call:answer')
  handleCallAnswer(
    @MessageBody() data: { caller: string; callee: string; answer: any },
    @ConnectedSocket() client: Socket,
  ) {
    const { caller, callee, answer } = data;
    const callerSocket = this.users.get(caller);

    if (callerSocket) {
      callerSocket.emit('call:answered', { callee, answer });
      console.log(`Call answered by ${callee} to ${caller}`);
    } else {
      client.emit('call:error', { message: `User ${caller} disconnected` });
    }
  }

  /**
   * ICE CANDIDATE EXCHANGE
   */
  @SubscribeMessage('call:iceCandidate')
  handleIceCandidate(
    @MessageBody() data: { sender: string; receiver: string; candidate: any },
    @ConnectedSocket() client: Socket,
  ) {
    const { sender, receiver, candidate } = data;
    const receiverSocket = this.users.get(receiver);

    if (receiverSocket) {
      receiverSocket.emit('call:iceCandidate', { sender, candidate });
      console.log(`ICE candidate sent from ${sender} to ${receiver}`);
    }
  }

  /**
   * CALL REJECTION
   */
  @SubscribeMessage('call:reject')
  handleCallReject(
    @MessageBody() data: { caller: string; callee: string; reason?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { caller, callee, reason } = data;
    const callerSocket = this.users.get(caller);

    if (callerSocket) {
      callerSocket.emit('call:rejected', { callee, reason: reason || 'User declined the call' });
      console.log(`Call rejected by ${callee} to ${caller}`);
    }
  }

  /**
   * CALL END
   */
  @SubscribeMessage('call:end')
  handleCallEnd(
    @MessageBody() data: { caller: string; callee: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { caller, callee } = data;
    const otherUserEmail = caller === this.userEmails.get(client.id) ? callee : caller;
    const otherUserSocket = this.users.get(otherUserEmail);

    if (otherUserSocket) {
      otherUserSocket.emit('call:ended', { endedBy: this.userEmails.get(client.id) });
      console.log(`Call ended between ${caller} and ${callee}`);
    }
  }

  /**
   * MEDIA MESSAGE (PRIVATE)
   */
@SubscribeMessage('sendMedia')
async handleUploadMedia(
  @MessageBody()
  data: {
    sender: string;
    receiver?: string;
    groupName?: string;
    fileName: string;
    fileType: string;
    fileBase64: string;
    mode: 'private' | 'group';
  },
  @ConnectedSocket() client: Socket,
) {
  console.log('Received uploadMedia event with data:', data);
  const { sender, receiver, groupName, fileName, fileType, fileBase64, mode } = data;

  try {
    console.log(`Starting media upload for ${sender} - File: ${fileName}, Type: ${fileType}, Mode: ${mode}`);

    const buffer = Buffer.from(fileBase64, 'base64');
    const readableStream = new Readable();
    readableStream.push(buffer);
    readableStream.push(null);

    const fakeFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: fileName,
      encoding: '7bit',
      mimetype: fileType,
      size: buffer.length,
      buffer,
      stream: readableStream,
      destination: '',
      filename: '',
      path: '',
    };

    const mediaUrl = await this.s3Service.uploadFile(fakeFile);

    console.log(`Upload successful! Media URL: ${mediaUrl}`);

    // ✅ Save media message to database
    const savedMessage = await this.chatService.saveMessage({
      sender,
      receiver: mode === 'private' ? receiver : undefined,
      groupName: mode === 'group' ? groupName : undefined,
      text: fileName, // Store filename as text
      mode,
      isMedia: true,
      mediaUrl,
      filename: fileName,
      mimetype: fileType,
    });

    const messagePayload = {
      sender,
      mediaUrl,
      filename: fileName,
      mimetype: fileType,
      mode,
      isMedia: true,
      _id: (savedMessage as any)._id,
      createdAt: savedMessage.createdAt,
    };

    if (mode === 'private' && receiver) {
      messagePayload['receiver'] = receiver;
      const receiverSocket = this.users.get(receiver);
      if (receiverSocket) {
        receiverSocket.emit('mediaMessage', messagePayload);
        await this.chatService.markAsDelivered((savedMessage as any)._id.toString());
      } else {
        console.log(`Media message saved for offline receiver: ${receiver}`);
      }
      // ✅ Echo back to sender (needed for media - frontend doesn't add optimistically)
      client.emit('mediaMessage', messagePayload);
    } else if (mode === 'group' && groupName) {
      messagePayload['groupName'] = groupName;
      client.to(groupName).emit('mediaMessage', messagePayload);
      // ✅ Echo back to sender (needed for media - frontend doesn't add optimistically)
      client.emit('mediaMessage', messagePayload);
    } else {
      client.emit('error', 'Invalid media message data');
      console.log('Invalid media message data: missing receiver or groupName');
    }
  } catch (error) {
    console.error('Media upload failed:', error);
    client.emit('error', 'Media upload failed');
  }
}
}
