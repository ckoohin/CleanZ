import { io, Socket } from 'socket.io-client';
import { getBackendOrigin } from "@/lib/api/base-url";

const SOCKET_URL = getBackendOrigin();
const TRACKING_SOCKET_URL = `${SOCKET_URL.replace(/\/$/, '')}/tracking`;

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(TRACKING_SOCKET_URL, {
      withCredentials: true,
      autoConnect: false,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function connectSocket(): Socket {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect();
  }
}
