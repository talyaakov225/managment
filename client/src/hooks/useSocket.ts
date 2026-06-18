import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const API_URL = (import.meta.env.VITE_API_URL || '').replace('/api', '');

let socket: Socket | null = null;

export function getSocket(userId?: string): Socket {
  if (!socket) {
    socket = io(API_URL || window.location.origin, {
      auth: { userId },
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function useSocket(userId?: string) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!userId) return;
    socketRef.current = getSocket(userId);
    return () => {};
  }, [userId]);

  const on = useCallback((event: string, handler: (...args: unknown[]) => void) => {
    socketRef.current?.on(event, handler);
    return () => { socketRef.current?.off(event, handler); };
  }, []);

  const emit = useCallback((event: string, data?: unknown) => {
    socketRef.current?.emit(event, data);
  }, []);

  return { socket: socketRef.current, on, emit };
}
