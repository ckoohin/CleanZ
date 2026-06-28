"use client";

import { useEffect } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useSocketEvent } from "@/hooks/use-socket";
import { useAuth } from "@/features/auth/hooks/auth.hooks";
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
  const { data: user, isLoading: isAuthLoading } = useAuth();
  const isAuthenticated = !isAuthLoading && !!user;

  return useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: () => notificationApi.list(params),
    enabled: isAuthenticated,
    placeholderData: (prev) => prev,
  });
}

export function useUnreadCount() {
  const { data: user, isLoading: isAuthLoading } = useAuth();
  const isAuthenticated = !isAuthLoading && !!user;

  return useQuery({
    queryKey: notificationKeys.unread,
    queryFn: () => notificationApi.unreadCount(),
    enabled: isAuthenticated,
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
  const { data: user, isLoading: isAuthLoading } = useAuth();
  const isAuthenticated = !isAuthLoading && !!user;

  useSocketEvent(NOTIFICATION_EVENT_NEW, () => {
    qc.invalidateQueries({ queryKey: notificationKeys.all });
  }, isAuthenticated);
  useSocketEvent<{ count: number }>(NOTIFICATION_EVENT_UNREAD, (data) => {
    qc.setQueryData(notificationKeys.unread, data);
  }, isAuthenticated);

  // Đồng bộ lại khi quay lại tab.
  useEffect(() => {
    if (!isAuthenticated) return;
    const onFocus = () =>
      qc.invalidateQueries({ queryKey: notificationKeys.unread });
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [isAuthenticated, qc]);
}
