"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  acquireBookingTrackingSocket,
  releaseBookingTrackingSocket,
  getBookingTrackingSocket,
} from "@/lib/socket/socket.client";
import type {
  BookingStatusUpdatedPayload,
  BookingTrackingPayload,
  TrackingErrorPayload,
} from "../types/tracking.types";
import type { CustomerBookingDetail } from "../types/booking.types";

const MAX_LOCATION_AGE_MS = 20_000;

interface BrowserLocationSample {
  latitude: number;
  longitude: number;
  accuracy: number;
  capturedAt: number;
}

function getTrackingErrorMessage(payload?: TrackingErrorPayload | null): string {
  return payload?.message?.trim() || "Không thể cập nhật vị trí realtime";
}

const CUSTOMER_STATUS_TOAST: Partial<Record<BookingStatusUpdatedPayload["status"], string>> = {
  CONFIRMED: "Tasker đã nhận đơn của bạn.",
  TASKER_ON_THE_WAY: "Tasker đang trên đường tới địa điểm của bạn.",
  CHECKED_IN: "Tasker đã đến nơi và check-in.",
  IN_PROGRESS: "Tasker đã bắt đầu thực hiện công việc.",
  COMPLETED: "Dịch vụ đã hoàn thành.",
  CANCELLED: "Booking đã bị hủy.",
};

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

    const socket = getBookingTrackingSocket();
    const joinRoom = () => {
      setIsConnected(true);
      setError(null);
      socket.emit("booking:join", { bookingId });
    };
    const handleDisconnect = () => setIsConnected(false);
    const handleLocation = (payload: BookingTrackingPayload | null | undefined) => {
      if (payload?.bookingId === bookingId) {
        setTracking(payload);
        setError(null);
      }
    };
    const handleError = (payload?: TrackingErrorPayload | null) => {
      setError(getTrackingErrorMessage(payload));
    };
    const handleArrived = (payload?: { bookingId?: string } | null) => {
      if (payload?.bookingId === bookingId) {
        void queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
      }
    };
    const refreshBooking = () => {
      void queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
      void queryClient.invalidateQueries({ queryKey: ["booking", "my-active"] });
    };
    const handleStatusUpdated = (payload?: BookingStatusUpdatedPayload | null) => {
      if (payload?.bookingId !== bookingId) {
        return;
      }

      queryClient.setQueryData<CustomerBookingDetail | undefined>(
        ["booking", bookingId],
        (current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            status: payload.status,
            payment: payload.paymentStatus
              ? { ...current.payment, status: payload.paymentStatus }
              : current.payment,
            checkedInAt: payload.checkedInAt ?? current.checkedInAt,
            completedAt: payload.completedAt ?? current.completedAt,
            updatedAt: payload.changedAt,
          } as CustomerBookingDetail;
        },
      );

      const message = CUSTOMER_STATUS_TOAST[payload.status];
      if (message) {
        toast.info(message, { id: `booking-status-${payload.bookingId}-${payload.status}` });
      }
      setError(null);
      refreshBooking();
    };

    socket.on("connect", joinRoom);
    socket.on("disconnect", handleDisconnect);
    socket.on("tasker:location:updated", handleLocation);
    socket.on("tracking:error", handleError);
    socket.on("tasker:arrived", handleArrived);
    socket.on("booking:in_progress", handleArrived);
    socket.on("booking:completed", handleArrived);
    socket.on("booking:status_updated", handleStatusUpdated);

    acquireBookingTrackingSocket();
    if (socket.connected) {
      joinRoom();
    }

    return () => {
      if (socket.connected) {
        socket.emit("booking:leave", { bookingId });
      }
      socket.off("connect", joinRoom);
      socket.off("disconnect", handleDisconnect);
      socket.off("tasker:location:updated", handleLocation);
      socket.off("tracking:error", handleError);
      socket.off("tasker:arrived", handleArrived);
      socket.off("booking:in_progress", handleArrived);
      socket.off("booking:completed", handleArrived);
      socket.off("booking:status_updated", handleStatusUpdated);
      releaseBookingTrackingSocket();
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

    const socket = getBookingTrackingSocket();

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

    const publishCurrentLocation = (payload?: { bookingId?: string } | null) => {
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
    const handleAccepted = (payload: BookingTrackingPayload | null | undefined) => {
      if (payload?.bookingId === bookingId) {
        setTracking(payload);
        setLastUpdatedAt(payload.updatedAt);
        setError(null);
      }
    };
    const handleLocation = (payload: BookingTrackingPayload | null | undefined) => {
      if (payload?.bookingId === bookingId) {
        setTracking(payload);
      }
    };
    const handleError = (payload?: TrackingErrorPayload | null) => {
      setError(getTrackingErrorMessage(payload));
    };

    socket.on("connect", startTracking);
    socket.on("disconnect", handleDisconnect);
    socket.on("tasker:location:request", publishCurrentLocation);
    socket.on("tasker:location:accepted", handleAccepted);
    socket.on("tasker:location:updated", handleLocation);
    socket.on("tracking:error", handleError);

    let unsupportedBrowserTimer: ReturnType<typeof setTimeout> | null = null;
    if (!navigator.geolocation) {
      latestLocationRef.current = null;
      unsupportedBrowserTimer = setTimeout(() => {
        setError("Trình duyệt không hỗ trợ chia sẻ vị trí GPS.");
      }, 0);
    }

    // Giữ GPS hoạt động liên tục để trình duyệt có thời gian chuyển từ vị trí
    // ước lượng Wi-Fi/IP sang mẫu GPS chính xác, thay vì lấy lại mẫu đầu tiên
    // bằng getCurrentPosition mỗi 10 giây.
    let watchId: number | null = null;
    try {
      watchId = navigator.geolocation
        ? navigator.geolocation.watchPosition(
            (position) => {
              const accuracy = Math.round(position.coords.accuracy);
              setLocationAccuracy(accuracy);

              // if (accuracy > MAX_TRACKING_ACCURACY_METERS) {
              //   latestLocationRef.current = null;
              //   setError(
              //     `GPS chưa đủ chính xác (sai số khoảng ${accuracy} m). Hãy bật Vị trí chính xác và chờ tín hiệu ổn định.`,
              //   );
              //   return;
              // }

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
              if (geolocationError.code === geolocationError.PERMISSION_DENIED) {
                latestLocationRef.current = null;
                setError("Bạn cần cấp quyền vị trí chính xác để bắt đầu tracking.");
                return;
              }
              latestLocationRef.current = null;
              setError(
                "Không lấy được vị trí thật từ thiết bị. Hãy bật GPS/vị trí chính xác rồi thử lại.",
              );
            },
            {
              enableHighAccuracy: true,
              maximumAge: 0,
              timeout: 20_000,
            },
          )
        : null;
    } catch {
      latestLocationRef.current = null;
      unsupportedBrowserTimer = setTimeout(() => {
        setError("Không thể khởi động chia sẻ vị trí trên thiết bị này.");
      }, 0);
    }

    acquireBookingTrackingSocket();
    if (socket.connected) {
      startTracking();
    }

    return () => {
      socket.emit("tasker:tracking:stop");
      if (socket.connected) {
        socket.emit("booking:leave", { bookingId });
      }
      socket.off("connect", startTracking);
      socket.off("disconnect", handleDisconnect);
      socket.off("tasker:location:request", publishCurrentLocation);
      socket.off("tasker:location:accepted", handleAccepted);
      socket.off("tasker:location:updated", handleLocation);
      socket.off("tracking:error", handleError);
      if (watchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
      if (unsupportedBrowserTimer !== null) {
        clearTimeout(unsupportedBrowserTimer);
      }
      latestLocationRef.current = null;
      pendingLocationRequestRef.current = false;
      releaseBookingTrackingSocket();
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
