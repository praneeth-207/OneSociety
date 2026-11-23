import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';

export class SocketService {
  private io: SocketIOServer | null = null;

  public init(server: HttpServer): SocketIOServer {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    this.io.on('connection', (socket) => {
      socket.on('join_society', (societyId: string) => {
        socket.join(`society_${societyId}`);
      });

      socket.on('join_user', (userId: string) => {
        socket.join(`user_${userId}`);
      });

      socket.on('join_room', (roomName: string) => {
        socket.join(roomName);
      });
    });

    console.log('Socket.IO real-time server initialized.');
    return this.io;
  }

  public emitToSociety(societyId: string, event: string, data: any): void {
    if (this.io) {
      this.io.to(`society_${societyId}`).emit(event, data);
    }
  }

  public emitToUser(userId: string, event: string, data: any): void {
    if (this.io) {
      this.io.to(`user_${userId}`).emit(event, data);
    }
  }

  public emitToRoom(roomName: string, event: string, data: any): void {
    if (this.io) {
      this.io.to(roomName).emit(event, data);
    }
  }
}

export const socketService = new SocketService();
