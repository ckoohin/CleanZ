import { useEffect, useMemo } from 'react';
import { Socket } from 'socket.io-client';
import {
  connectSocket,
  disconnectSocket,
  getSocket,
  connectTrackingSocket,
  disconnectTrackingSocket,
  getTrackingSocket,
} from '@/lib/socket/socket.client';

/**
 * Hook kết nối socket và tự động ngắt kết nối khi unmount.
 * @param autoConnect - Tự động kết nối khi mount (mặc định: true)
 */
export function useSocket(autoConnect = true): Socket {
  const socket = useMemo(() => getSocket(), []);

  useEffect(() => {
    if (autoConnect) {
      connectSocket();
    }

    return () => {
      disconnectSocket();
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
): void {
  const socket = useSocket();

  useEffect(() => {
    socket.on(event, handler);
    return () => {
      socket.off(event, handler);
    };
  }, [event, handler, socket]);
}

/**
 * Hook kết nối socket namespace /tracking và tự động ngắt kết nối khi unmount.
 */
export function useTrackingSocket(autoConnect = true): Socket {
  const socket = useMemo(() => getTrackingSocket(), []);

  useEffect(() => {
    if (autoConnect) {
      connectTrackingSocket();
    }

    return () => {
      disconnectTrackingSocket();
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

  useEffect(() => {
    socket.on(event, handler);
    return () => {
      socket.off(event, handler);
    };
  }, [event, handler, socket]);
}
