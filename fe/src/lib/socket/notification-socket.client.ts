import { io, Socket } from "socket.io-client";
import { getBackendOrigin } from "@/lib/api/base-url";

const SOCKET_URL = getBackendOrigin();

let notificationSocket: Socket | null = null;

export function getNotificationSocket(): Socket {
  if (!notificationSocket) {
    notificationSocket = io(SOCKET_URL, {
      withCredentials: true,
      autoConnect: false,
      transports: ["websocket", "polling"],
    });
  }

  return notificationSocket;
}

export function connectNotificationSocket(): Socket {
  const socket = getNotificationSocket();
  if (!socket.connected) {
    socket.connect();
  }

  return socket;
}

export function disconnectNotificationSocket(): void {
  if (notificationSocket?.connected) {
    notificationSocket.disconnect();
  }
}
