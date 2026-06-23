"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  connectSocket,
  disconnectSocket,
  getSocket,
} from "@/lib/socket/socket.client";
import type {
  BookingTrackingPayload,
  TrackingErrorPayload,
} from "../types/tracking.types";

const MAX_TRACKING_ACCURACY_METERS = 100;
const MAX_LOCATION_AGE_MS = 20_000;

interface BrowserLocationSample {
  latitude: number;
  longitude: number;
  accuracy: number;
  capturedAt: number;
}

function getTrackingErrorMessage(payload: TrackingErrorPayload): string {
  return payload.message?.trim() || "Không thể cập nhật vị trí realtime";
}

export function useCustomerBookingTracking(
  bookingId: string,
  enabled: boolean,
) {
  const queryClient = useQueryClient();
  const [tracking, setTracking] = useState<BookingTrackingPayload | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !bookingId) {
      return;
    }

    if (!navigator.geolocation) {
      queueMicrotask(() => {
        setError("Trình duyệt không hỗ trợ định vị.");
      });
      return;
    }

    const socket = getSocket();
    const joinRoom = () => {
      setIsConnected(true);
      setError(null);
      socket.emit("booking:join", { bookingId });
    };
    const handleDisconnect = () => setIsConnected(false);
    const handleLocation = (payload: BookingTrackingPayload) => {
      if (payload.bookingId === bookingId) {
        setTracking(payload);
        setError(null);
      }
    };
    const handleError = (payload: TrackingErrorPayload) => {
      setError(getTrackingErrorMessage(payload));
    };
    const handleArrived = (payload: { bookingId?: string }) => {
      if (payload.bookingId === bookingId) {
        void queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
      }
    };

    socket.on("connect", joinRoom);
    socket.on("disconnect", handleDisconnect);
    socket.on("tasker:location:updated", handleLocation);
    socket.on("tracking:error", handleError);
    socket.on("tasker:arrived", handleArrived);

    connectSocket();
    if (socket.connected) {
      joinRoom();
    }

    return () => {
      socket.off("connect", joinRoom);
      socket.off("disconnect", handleDisconnect);
      socket.off("tasker:location:updated", handleLocation);
      socket.off("tracking:error", handleError);
      socket.off("tasker:arrived", handleArrived);
      disconnectSocket();
    };
  }, [bookingId, enabled, queryClient]);

  return { tracking, isConnected, error };
}

export function useTaskerLocationTracking(
  bookingId: string,
  enabled: boolean,
) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [tracking, setTracking] = useState<BookingTrackingPayload | null>(null);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const latestLocationRef = useRef<BrowserLocationSample | null>(null);
  const pendingLocationRequestRef = useRef(false);

  useEffect(() => {
    if (!enabled || !bookingId) {
      return;
    }

    const socket = getSocket();

    const emitLocation = (sample: BrowserLocationSample) => {
      socket.emit("tasker:location:update", {
        bookingId,
        latitude: sample.latitude,
        longitude: sample.longitude,
        accuracy: sample.accuracy,
        capturedAt: new Date(sample.capturedAt).toISOString(),
      });
      pendingLocationRequestRef.current = false;
    };

    const publishCurrentLocation = (payload?: { bookingId?: string }) => {
      if (payload?.bookingId && payload.bookingId !== bookingId) {
        return;
      }

      pendingLocationRequestRef.current = true;
      const sample = latestLocationRef.current;
      if (sample && Date.now() - sample.capturedAt <= MAX_LOCATION_AGE_MS) {
        emitLocation(sample);
      }
    };

    const startTracking = () => {
      setIsConnected(true);
      setError(null);
      socket.emit("booking:join", { bookingId });
      socket.emit("tasker:tracking:start", { bookingId });
    };
    const handleDisconnect = () => setIsConnected(false);
    const handleAccepted = (payload: BookingTrackingPayload) => {
      if (payload.bookingId === bookingId) {
        setTracking(payload);
        setLastUpdatedAt(payload.updatedAt);
        setError(null);
      }
    };
    const handleLocation = (payload: BookingTrackingPayload) => {
      if (payload.bookingId === bookingId) {
        setTracking(payload);
      }
    };
    const handleError = (payload: TrackingErrorPayload) => {
      setError(getTrackingErrorMessage(payload));
    };

    socket.on("connect", startTracking);
    socket.on("disconnect", handleDisconnect);
    socket.on("tasker:location:request", publishCurrentLocation);
    socket.on("tasker:location:accepted", handleAccepted);
    socket.on("tasker:location:updated", handleLocation);
    socket.on("tracking:error", handleError);

    // Giữ GPS hoạt động liên tục để trình duyệt có thời gian chuyển từ vị trí
    // ước lượng Wi-Fi/IP sang mẫu GPS chính xác, thay vì lấy lại mẫu đầu tiên
    // bằng getCurrentPosition mỗi 10 giây.
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const accuracy = Math.round(position.coords.accuracy);
        setLocationAccuracy(accuracy);

        if (accuracy > MAX_TRACKING_ACCURACY_METERS) {
          latestLocationRef.current = null;
          setError(
            `GPS chưa đủ chính xác (sai số khoảng ${accuracy} m). Hãy bật Vị trí chính xác và chờ tín hiệu ổn định.`,
          );
          return;
        }

        const sample: BrowserLocationSample = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy,
          capturedAt: position.timestamp || Date.now(),
        };
        latestLocationRef.current = sample;
        setError(null);

        if (pendingLocationRequestRef.current) {
          emitLocation(sample);
        }
      },
      (geolocationError) => {
        latestLocationRef.current = null;
        setError(
          geolocationError.code === geolocationError.PERMISSION_DENIED
            ? "Bạn cần cấp quyền vị trí chính xác để bắt đầu tracking."
            : "Không thể nhận tín hiệu GPS. Hãy bật định vị và kiểm tra kết nối.",
        );
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 20_000,
      },
    );

    connectSocket();
    if (socket.connected) {
      startTracking();
    }

    return () => {
      socket.emit("tasker:tracking:stop");
      socket.off("connect", startTracking);
      socket.off("disconnect", handleDisconnect);
      socket.off("tasker:location:request", publishCurrentLocation);
      socket.off("tasker:location:accepted", handleAccepted);
      socket.off("tasker:location:updated", handleLocation);
      socket.off("tracking:error", handleError);
      navigator.geolocation.clearWatch(watchId);
      latestLocationRef.current = null;
      pendingLocationRequestRef.current = false;
      disconnectSocket();
    };
  }, [bookingId, enabled]);

  return {
    tracking,
    isConnected,
    error,
    lastUpdatedAt,
    locationAccuracy,
  };
}
