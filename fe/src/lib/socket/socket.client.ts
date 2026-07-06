import { io, Socket } from 'socket.io-client';
import { getBackendOrigin } from "@/lib/api/base-url";

const SOCKET_URL = getBackendOrigin();
const TRACKING_SOCKET_URL = `${SOCKET_URL.replace(/\/$/, '')}/tracking`;

let appRealtimeSocket: Socket | null = null;
let bookingTrackingSocket: Socket | null = null;

/**
 * Socket namespace mặc định `/`.
 *
 * Dùng cho realtime cấp ứng dụng:
 * - notification bell/inbox;
 * - support ticket chat;
 * - unread badges.
 *
 * Không dùng socket này cho GPS booking tracking.
 */
export function getAppRealtimeSocket(): Socket {
  if (!appRealtimeSocket) {
    appRealtimeSocket = io(SOCKET_URL, {
      withCredentials: true,
      autoConnect: false,
      transports: ['websocket', 'polling'],
    });
  }
  return appRealtimeSocket;
}

export function connectAppRealtimeSocket(): Socket {
  const s = getAppRealtimeSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectAppRealtimeSocket(): void {
  if (appRealtimeSocket?.connected) {
    appRealtimeSocket.disconnect();
  }
}

// ─── Quản lý vòng đời theo ref-count ──────────────────────────────────────────
// Nhiều nơi (chat, đổi tab luồng admin, notification) có thể cùng dùng 1 socket.
// Chỉ ngắt khi consumer cuối rời đi, kèm grace period để remount nhanh (đổi tab)
// không gây churn connect/disconnect.
let refCount = 0;
let idleTimer: ReturnType<typeof setTimeout> | null = null;
const IDLE_GRACE_MS = 5000;

export function acquireAppRealtimeSocket(): Socket {
  refCount += 1;
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
  return connectAppRealtimeSocket();
}

export function releaseAppRealtimeSocket(): void {
  refCount = Math.max(0, refCount - 1);
  if (refCount > 0) return;
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    idleTimer = null;
    if (refCount === 0) disconnectAppRealtimeSocket();
  }, IDLE_GRACE_MS);
}

/**
 * Socket namespace `/tracking`.
 *
 * Chỉ dùng cho luồng GPS/route realtime của booking:
 * - customer xem vị trí tasker;
 * - tasker gửi vị trí hiện tại;
 * - route/distance tracking.
 */
export function getBookingTrackingSocket(): Socket {
  if (!bookingTrackingSocket) {
    bookingTrackingSocket = io(TRACKING_SOCKET_URL, {
      withCredentials: true,
      autoConnect: false,
      transports: ['websocket', 'polling'],
    });
  }
  return bookingTrackingSocket;
}

export function connectBookingTrackingSocket(): Socket {
  const s = getBookingTrackingSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectBookingTrackingSocket(): void {
  if (bookingTrackingSocket?.connected) {
    bookingTrackingSocket.disconnect();
  }
}
let trackingRefCount = 0;
let trackingIdleTimer: ReturnType<typeof setTimeout> | null = null;

export function acquireBookingTrackingSocket(): Socket {
  trackingRefCount += 1;
  if (trackingIdleTimer) {
    clearTimeout(trackingIdleTimer);
    trackingIdleTimer = null;
  }
  return connectBookingTrackingSocket();
}

export function releaseBookingTrackingSocket(): void {
  trackingRefCount = Math.max(0, trackingRefCount - 1);
  if (trackingRefCount > 0) return;
  if (trackingIdleTimer) clearTimeout(trackingIdleTimer);
  trackingIdleTimer = setTimeout(() => {
    trackingIdleTimer = null;
    if (trackingRefCount === 0) disconnectBookingTrackingSocket();
  }, IDLE_GRACE_MS);
}

// Backward-compatible aliases. Prefer the explicit names above in new code.
export const getSocket = getAppRealtimeSocket;
export const connectSocket = connectAppRealtimeSocket;
export const disconnectSocket = disconnectAppRealtimeSocket;
export const acquireSocket = acquireAppRealtimeSocket;
export const releaseSocket = releaseAppRealtimeSocket;
export const getTrackingSocket = getBookingTrackingSocket;
export const connectTrackingSocket = connectBookingTrackingSocket;
export const disconnectTrackingSocket = disconnectBookingTrackingSocket;
