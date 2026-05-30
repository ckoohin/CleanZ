import { useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket/socket.client';

/**
 * Hook kết nối socket và tự động ngắt kết nối khi unmount.
 * @param autoConnect - Tự động kết nối khi mount (mặc định: true)
 */
export function useSocket(autoConnect = true): Socket {
  const socketRef = useRef<Socket>(getSocket());

  useEffect(() => {
    if (autoConnect) {
      connectSocket();
    }

    return () => {
      disconnectSocket();
    };
  }, [autoConnect]);

  return socketRef.current;
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
