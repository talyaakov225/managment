import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';

let io: SocketServer | null = null;

export function initSocket(httpServer: HttpServer, clientUrl: string): SocketServer {
  io = new SocketServer(httpServer, {
    cors: { origin: clientUrl, credentials: true },
  });

  io.on('connection', (socket) => {
    const userId = socket.handshake.auth?.userId;
    if (userId) {
      socket.join(`user:${userId}`);
    }

    socket.on('join:project', (projectId: string) => {
      socket.join(`project:${projectId}`);
    });

    socket.on('join:channel', (channelId: string) => {
      socket.join(`channel:${channelId}`);
    });

    socket.on('disconnect', () => {});
  });

  return io;
}

export function getIO(): SocketServer | null {
  return io;
}

export function emitToProject(projectId: string, event: string, data?: unknown): void {
  io?.to(`project:${projectId}`).emit(event, data);
}

export function emitToUser(userId: string, event: string, data?: unknown): void {
  io?.to(`user:${userId}`).emit(event, data);
}

export function emitToChannel(channelId: string, event: string, data?: unknown): void {
  io?.to(`channel:${channelId}`).emit(event, data);
}
