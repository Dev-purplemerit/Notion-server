import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessagingService } from './messaging.service';
import { UseGuards } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  },
  namespace: '/messaging',
})
export class MessagingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Store user ID to socket ID mapping
  private userSockets = new Map<string, string>();

  constructor(private readonly messagingService: MessagingService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);

    // Store user ID from handshake auth
    const userId = client.handshake.auth?.userId;
    if (userId) {
      this.userSockets.set(userId, client.id);
      console.log(`User ${userId} connected with socket ${client.id}`);

      // Join user to their personal room
      client.join(`user:${userId}`);
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);

    // Remove user from mapping
    const userId = client.handshake.auth?.userId;
    if (userId) {
      this.userSockets.delete(userId);
      console.log(`User ${userId} disconnected`);
    }
  }

  /**
   * Handle sending a message
   */
  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() data: {
      senderEmail: string;
      receiverId: string;
      content: string;
      messageType?: string;
      fileUrl?: string;
      fileName?: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // Save message to database
      const message = await this.messagingService.sendMessage(data.senderEmail, {
        receiverId: data.receiverId,
        content: data.content,
        messageType: data.messageType,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
      });

      // Emit to receiver if they're online
      const receiverSocketId = this.userSockets.get(data.receiverId);
      if (receiverSocketId) {
        this.server.to(receiverSocketId).emit('newMessage', message);
      }

      // Emit back to sender for confirmation
      client.emit('messageSent', message);

      return { success: true, message };
    } catch (error) {
      client.emit('messageError', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle typing indicator
   */
  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { senderId: string; receiverId: string; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    const receiverSocketId = this.userSockets.get(data.receiverId);
    if (receiverSocketId) {
      this.server.to(receiverSocketId).emit('userTyping', {
        userId: data.senderId,
        isTyping: data.isTyping,
      });
    }
  }

  /**
   * Handle mark as read
   */
  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(
    @MessageBody() data: { userEmail: string; messageId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      await this.messagingService.markAsRead(data.userEmail, data.messageId);

      // Notify the sender that message was read
      const message = await this.messagingService['messageModel'].findById(data.messageId).populate('senderId');

      if (message && message.senderId) {
        const senderSocketId = this.userSockets.get(message.senderId._id.toString());

        if (senderSocketId) {
          this.server.to(senderSocketId).emit('messageRead', {
            messageId: data.messageId,
            readAt: new Date(),
          });
        }
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Notify user about new message (can be called from service)
   */
  notifyNewMessage(userId: string, message: any) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.server.to(socketId).emit('newMessage', message);
    }
  }

  /**
   * Get online status of a user
   */
  @SubscribeMessage('checkOnlineStatus')
  handleCheckOnlineStatus(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const isOnline = this.userSockets.has(data.userId);
    client.emit('onlineStatus', { userId: data.userId, isOnline });
    return { isOnline };
  }

  /**
   * Broadcast online status to all connected users
   */
  broadcastOnlineStatus(userId: string, isOnline: boolean) {
    this.server.emit('userOnlineStatusChanged', { userId, isOnline });
  }
}
