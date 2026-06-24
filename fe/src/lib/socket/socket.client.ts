import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') ?? 'http://localhost:5000';

let socket: Socket | null = null;
let trackingSocket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
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

// ─── Quản lý vòng đời theo ref-count ──────────────────────────────────────────
// Nhiều nơi (chat, đổi tab luồng admin, notification) có thể cùng dùng 1 socket.
// Chỉ ngắt khi consumer cuối rời đi, kèm grace period để remount nhanh (đổi tab)
// không gây churn connect/disconnect.
let refCount = 0;
let idleTimer: ReturnType<typeof setTimeout> | null = null;
const IDLE_GRACE_MS = 5000;

export function acquireSocket(): Socket {
  refCount += 1;
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
  return connectSocket();
}

export function releaseSocket(): void {
  refCount = Math.max(0, refCount - 1);
  if (refCount > 0) return;
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    idleTimer = null;
    if (refCount === 0) disconnectSocket();
  }, IDLE_GRACE_MS);
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
