import type { BookingStatus, PaymentStatus } from "./booking.types";

export interface BookingTrackingPayload {
  bookingId: string;
  status: BookingStatus;
  tasker: {
    id: string;
    fullName?: string | null;
    avatarUrl?: string | null;
  };
  currentLocation: {
    latitude: number;
    longitude: number;
    updatedAt: string;
    accuracy?: number | null;
    capturedAt?: string | null;
  };
  destination: {
    latitude: number;
    longitude: number;
    address: string;
    addressId?: string | null;
  };
  route: {
    distance: {
      meters: number;
      kilometers: number;
    };
    duration: {
      seconds: number;
      minutes: number;
    };
    encodedPolyline?: string | null;
  };
  latitude: number;
  longitude: number;
  updatedAt: string;
}

export interface BookingStatusUpdatedPayload {
  bookingId: string;
  bookingCode: string;
  previousStatus: BookingStatus;
  status: BookingStatus;
  changedAt: string;
  actor: {
    type: "TASKER" | "ADMIN" | "CUSTOMER" | "SYSTEM";
    id?: string | null;
    name?: string | null;
  };
  checkedInAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  paymentStatus?: PaymentStatus | null;
}

export interface TrackingErrorPayload {
  event?: string;
  message?: string;
}
