import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from './config';

let socket: Socket | null = null;
let socketToken: string | null = null;

export function connectChatSocket(token: string): Socket {
  if (socket && socketToken === token) return socket;
  socket?.disconnect();
  socketToken = token;
  socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket'], reconnection: true });
  return socket;
}

export function getChatSocket(): Socket | null {
  return socket;
}

export function disconnectChatSocket() {
  socket?.disconnect();
  socket = null;
  socketToken = null;
}
