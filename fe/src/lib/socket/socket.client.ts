import { io, Socket } from 'socket.io-client';
import { getBackendOrigin } from "@/lib/api/base-url";

const SOCKET_URL = getBackendOrigin();
const TRACKING_SOCKET_URL = `${SOCKET_URL.replace(/\/$/, '')}/tracking`;

let socket: Socket | null = null;
let trackingSocket: Socket | null = null;

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

export function getTrackingSocket(): Socket {
  if (!trackingSocket) {
    trackingSocket = io(`${SOCKET_URL}/tracking`, {
      withCredentials: true,
      autoConnect: false,
      transports: ['websocket', 'polling'],
    });
  }
  return trackingSocket;
}

export function connectTrackingSocket(): Socket {
  const s = getTrackingSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectTrackingSocket(): void {
  if (trackingSocket?.connected) {
    trackingSocket.disconnect();
  }
}
