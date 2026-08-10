import { describe, expect, it } from "vitest";
import type { BookingStatus } from "@/features/booking/types/booking.types";
import {
  shouldShowCustomerLiveTracking,
  shouldShowCustomerStatusHistory,
} from "./customer-booking-detail.policy";

describe("Customer booking detail presentation policy", () => {
  it.each<BookingStatus>([
    "POSTED",
    "PENDING_CUSTOMER_CONFIRMATION",
    "CONFIRMED",
    "TASKER_ON_THE_WAY",
    "CHECKED_IN",
    "IN_PROGRESS",
  ])("ẩn lịch sử trạng thái của đơn đang hoạt động: %s", (status) => {
    expect(shouldShowCustomerStatusHistory(status)).toBe(false);
  });

  it.each<BookingStatus>(["COMPLETED", "CANCELLED", "EXPIRED"])(
    "hiện lịch sử khi xem lại đơn đã kết thúc: %s",
    (status) => {
      expect(shouldShowCustomerStatusHistory(status)).toBe(true);
    },
  );

  it("chỉ bật màn theo dõi trực tiếp khi Tasker bắt đầu di chuyển", () => {
    expect(shouldShowCustomerLiveTracking("TASKER_ON_THE_WAY")).toBe(true);
    expect(shouldShowCustomerLiveTracking("CONFIRMED")).toBe(false);
    expect(shouldShowCustomerLiveTracking("CHECKED_IN")).toBe(false);
  });
});
