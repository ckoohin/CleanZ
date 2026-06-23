import type { BookingStatus } from "./booking.types";

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

export interface TrackingErrorPayload {
  event?: string;
  message?: string;
}
