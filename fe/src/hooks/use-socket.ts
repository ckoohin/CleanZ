import { useEffect, useMemo, useRef } from 'react';
import { Socket } from 'socket.io-client';
import {
  acquireAppRealtimeSocket,
  releaseAppRealtimeSocket,
  getAppRealtimeSocket,
  acquireBookingTrackingSocket,
  releaseBookingTrackingSocket,
  getBookingTrackingSocket,
} from '@/lib/socket/socket.client';

/**
 * Hook kết nối socket realtime app ở namespace mặc định `/`.
 *
 * Dùng cho notification, support ticket chat, unread badge.
 * Không dùng cho GPS booking tracking.
 *
 * @param autoConnect - Tự động kết nối khi mount (mặc định: true)
 */
export function useSocket(autoConnect = true): Socket {
  const socket = useMemo(() => getAppRealtimeSocket(), []);

  useEffect(() => {
    if (!autoConnect) return;
    acquireAppRealtimeSocket();
    return () => {
      releaseAppRealtimeSocket();
    };
  }, [autoConnect]);

  return socket;
}

/**
 * Hook lắng nghe một sự kiện socket cụ thể.
 * @param event - Tên sự kiện
 * @param handler - Callback xử lý khi nhận event
 */
export function useSocketEvent<T = unknown>(
  event: string,
  handler: (data: T) => void,
  autoConnect = true,
): void {
  const socket = useSocket(autoConnect);
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    if (!autoConnect) return;
    const listener = (data: T) => handlerRef.current(data);
    socket.on(event, listener);
    return () => {
      socket.off(event, listener);
    };
  }, [autoConnect, event, socket]);
}

/**
 * Hook kết nối socket booking GPS tracking ở namespace `/tracking`.
 */
export function useTrackingSocket(autoConnect = true): Socket {
  const socket = useMemo(() => getBookingTrackingSocket(), []);

  useEffect(() => {
    if (!autoConnect) return;
    acquireBookingTrackingSocket();
    return () => {
      releaseBookingTrackingSocket();
    };
  }, [autoConnect]);

  return socket;
}

/**
 * Hook lắng nghe một sự kiện socket của namespace /tracking.
 */
export function useTrackingSocketEvent<T = unknown>(
  event: string,
  handler: (data: T) => void,
): void {
  const socket = useTrackingSocket();
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    const listener = (data: T) => handlerRef.current(data);
    socket.on(event, listener);
    return () => {
      socket.off(event, listener);
    };
  }, [event, socket]);
}
