"use client";

import { useEffect } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useSocketEvent } from "@/hooks/use-socket";
import { notificationApi } from "./notification.service";
import {
  NOTIFICATION_EVENT_NEW,
  NOTIFICATION_EVENT_UNREAD,
  type NotificationQuery,
} from "./types";

export const notificationKeys = {
  all: ["notifications"] as const,
  list: (params?: NotificationQuery) =>
    ["notifications", "list", params] as const,
  unread: ["notifications", "unread"] as const,
};

export function useNotificationList(params?: NotificationQuery) {
  return useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: () => notificationApi.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unread,
    queryFn: () => notificationApi.unreadCount(),
    staleTime: 30 * 1000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/**
 * Lắng nghe realtime: tin mới / số chưa đọc → làm mới cache để badge + danh sách
 * cập nhật tức thì (không cần reload). Khớp event BE NotificationGateway.
 */
export function useNotificationRealtime() {
  const qc = useQueryClient();

  useSocketEvent(NOTIFICATION_EVENT_NEW, () => {
    qc.invalidateQueries({ queryKey: notificationKeys.all });
  });
  useSocketEvent<{ count: number }>(NOTIFICATION_EVENT_UNREAD, (data) => {
    qc.setQueryData(notificationKeys.unread, data);
  });

  // Đồng bộ lại khi quay lại tab.
  useEffect(() => {
    const onFocus = () =>
      qc.invalidateQueries({ queryKey: notificationKeys.unread });
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [qc]);
}
