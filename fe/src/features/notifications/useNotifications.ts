"use client";

import { useCallback, useEffect } from "react";
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

export function useNotificationRealtime(enabled = true) {
  const qc = useQueryClient();
  const { data: user, isLoading: isAuthLoading } = useAuth();
  const isAuthenticated = enabled && !isAuthLoading && !!user;

  const handleNewNotification = useCallback(() => {
    qc.invalidateQueries({ queryKey: notificationKeys.all });
  }, [qc]);

  const handleUnreadCount = useCallback(
    (data: { count: number }) => {
      qc.setQueryData(notificationKeys.unread, data);
    },
    [qc],
  );

  useSocketEvent(NOTIFICATION_EVENT_NEW, handleNewNotification, isAuthenticated);
  useSocketEvent<{ count: number }>(
    NOTIFICATION_EVENT_UNREAD,
    handleUnreadCount,
    isAuthenticated,
  );

  // Đồng bộ lại khi quay lại tab.
  useEffect(() => {
    if (!isAuthenticated) return;
    const onFocus = () =>
      qc.invalidateQueries({ queryKey: notificationKeys.unread });
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [isAuthenticated, qc]);
}
