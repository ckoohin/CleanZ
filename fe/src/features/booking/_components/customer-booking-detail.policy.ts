import type { BookingStatus } from "@/features/booking/types/booking.types";

const CUSTOMER_HISTORY_STATUSES = new Set<BookingStatus>([
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
]);

export function shouldShowCustomerLiveTracking(
  status?: BookingStatus,
): boolean {
  return status === "TASKER_ON_THE_WAY";
}

export function shouldShowCustomerStatusHistory(
  status?: BookingStatus,
): boolean {
  return status ? CUSTOMER_HISTORY_STATUSES.has(status) : false;
}
