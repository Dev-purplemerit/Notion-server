import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

interface RoomParticipant {
  socketId: string;
  userId?: string;
  joinedAt: Date;
}

@WebSocketGateway({
  namespace: '/video',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  }
})
export class VideoGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Track participants in each room
  private rooms: Map<string, RoomParticipant[]> = new Map();

  handleConnection(client: Socket) {
    console.log(`✅ Client connected to video namespace: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`❌ Client disconnected from video namespace: ${client.id}`);

    // Remove client from all rooms
    this.rooms.forEach((participants, roomName) => {
      const index = participants.findIndex(p => p.socketId === client.id);
      if (index !== -1) {
        participants.splice(index, 1);

        // Notify other participants that someone left
        client.to(roomName).emit('user_left', { userId: client.id });

        console.log(`🚪 Client ${client.id} removed from room: ${roomName}`);
      }
    });
  }

  @SubscribeMessage('join_room')
  joinRoom(
    @MessageBody() data: { roomName: string; userId?: string },
    @ConnectedSocket() socket: Socket
  ) {
    const { roomName, userId } = data;
    socket.join(roomName);

    // Get or create room participants list
    if (!this.rooms.has(roomName)) {
      this.rooms.set(roomName, []);
    }

    const participants = this.rooms.get(roomName)!; // Non-null assertion since we just set it

    // Add new participant
    const newParticipant: RoomParticipant = {
      socketId: socket.id,
      userId,
      joinedAt: new Date(),
    };
    participants.push(newParticipant);

    console.log(`🚪 Client ${socket.id} joined room: ${roomName}`);
    console.log(`👥 Room ${roomName} now has ${participants.length} participants`);

    // Send existing participants to the new user
    const existingParticipants = participants
      .filter(p => p.socketId !== socket.id)
      .map(p => ({ socketId: p.socketId, userId: p.userId }));

    socket.emit('existing_participants', { participants: existingParticipants });

    // Notify existing participants about the new user
    socket.to(roomName).emit('user_joined', {
      socketId: socket.id,
      userId: userId
    });
  }

  @SubscribeMessage('send_connection_offer')
  handleOffer(
    @MessageBody() data: {
      offer: RTCSessionDescriptionInit;
      roomName: string;
      targetSocketId: string; // Specific target for this offer
    },
    @ConnectedSocket() socket: Socket,
  ) {
    console.log(`📡 Received offer from ${socket.id} for ${data.targetSocketId} in room ${data.roomName}`);

    // Send offer to specific participant
    this.server.to(data.targetSocketId).emit('connection_offer', {
      offer: data.offer,
      senderSocketId: socket.id
    });
  }

  @SubscribeMessage('send_answer')
  handleAnswer(
    @MessageBody() data: {
      answer: RTCSessionDescriptionInit;
      roomName: string;
      targetSocketId: string; // Specific target for this answer
    },
    @ConnectedSocket() socket: Socket,
  ) {
    console.log(`📡 Received answer from ${socket.id} for ${data.targetSocketId} in room ${data.roomName}`);

    // Send answer to specific participant
    this.server.to(data.targetSocketId).emit('answer', {
      answer: data.answer,
      senderSocketId: socket.id
    });
  }

  @SubscribeMessage('send_candidate')
  handleCandidate(
    @MessageBody() data: {
      candidate: RTCIceCandidate;
      roomName: string;
      targetSocketId: string; // Specific target for this ICE candidate
    },
    @ConnectedSocket() socket: Socket,
  ) {
    console.log(`🧊 Received ICE candidate from ${socket.id} for ${data.targetSocketId} in room ${data.roomName}`);

    // Send ICE candidate to specific participant
    this.server.to(data.targetSocketId).emit('candidate', {
      candidate: data.candidate,
      senderSocketId: socket.id
    });
  }

  @SubscribeMessage('leave_room')
  leaveRoom(@MessageBody() roomName: string, @ConnectedSocket() socket: Socket) {
    socket.leave(roomName);

    // Remove from participants list
    const participants = this.rooms.get(roomName);
    if (participants) {
      const index = participants.findIndex(p => p.socketId === socket.id);
      if (index !== -1) {
        participants.splice(index, 1);
      }
    }

    console.log(`🚪 Client ${socket.id} left room: ${roomName}`);

    // Notify others that user left
    socket.to(roomName).emit('user_left', { socketId: socket.id });
  }
}
