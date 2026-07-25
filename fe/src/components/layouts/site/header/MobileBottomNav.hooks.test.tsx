import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import React from "react";

/**
 * Tái hiện lỗi thứ tự hook của MobileBottomNav.
 *
 * Component nằm trong customer/layout.tsx, mà /customer/booking KHÔNG có layout
 * riêng nên dùng chung layout đó → component KHÔNG remount khi điều hướng giữa
 * trang booking và trang khác. Nếu hook nằm SAU nhánh `return null`, số hook
 * giữa 2 lần render lệch nhau và React ném lỗi, làm sập cả layout khách.
 *
 * Kịch bản thật: socket bắn "cần xác nhận hoàn thành" → khách bấm "Xem & xác
 * nhận" (CustomerRealtimeNotifications.tsx) → router.push('/customer/booking/{id}')
 * → đúng lúc này số hook đổi.
 */

let currentPathname = "/customer";

vi.mock("next/navigation", () => ({
  usePathname: () => currentPathname,
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let MobileBottomNav: React.ComponentType<any>;

beforeEach(async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  ({ MobileBottomNav } = await import("./MobileBottomNav"));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("MobileBottomNav — thứ tự hook khi điều hướng", () => {
  it("đi từ trang thường SANG trang booking không được ném lỗi hook", () => {
    currentPathname = "/customer";
    const { rerender } = render(<MobileBottomNav />);

    // Socket → router.push('/customer/booking/{id}')
    currentPathname = "/customer/booking/abc-123";

    expect(() => rerender(<MobileBottomNav />)).not.toThrow();
  });

  it("đi từ trang booking RA trang thường không được ném lỗi hook", () => {
    currentPathname = "/customer/booking/abc-123";
    const { rerender } = render(<MobileBottomNav />);

    currentPathname = "/customer/history";

    expect(() => rerender(<MobileBottomNav />)).not.toThrow();
  });

  it("render được ở cả hai loại đường dẫn", () => {
    currentPathname = "/customer/booking/abc-123";
    const booking = render(<MobileBottomNav />);
    // Trang booking: cố tình ẩn thanh điều hướng
    expect(booking.container.querySelector("nav")).toBeNull();
    booking.unmount();

    currentPathname = "/customer";
    const normal = render(<MobileBottomNav />);
    expect(normal.container.querySelector("nav")).not.toBeNull();
  });
});
