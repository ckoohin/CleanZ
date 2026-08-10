import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { BookingNoShow } from "@/features/booking/types/booking.types";
import { CustomerNoShowPanel } from "./CustomerNoShowPanel";

const noShow: BookingNoShow = {
  reviewStatus: "PENDING_REVIEW",
  detectedAt: "2026-08-09T01:00:00.000Z",
  reviewedAt: null,
  refundAmount: 100_000,
};

describe("CustomerNoShowPanel — hoàn tiền có cấn nợ", () => {
  it("hiển thị số hoàn danh nghĩa, phần thu nợ và số thực tăng", () => {
    render(
      <CustomerNoShowPanel
        noShow={noShow}
        debtRecovered={30_000}
        onRebook={vi.fn()}
        onSupport={vi.fn()}
      />,
    );

    expect(screen.getByText("Hoàn tiền danh nghĩa")).toBeInTheDocument();
    expect(screen.getByText("100.000đ")).toBeInTheDocument();
    expect(screen.getByText("−30.000đ")).toBeInTheDocument();
    expect(screen.getByText("70.000đ")).toBeInTheDocument();
  });

  it("không dựng số âm nếu dữ liệu recovery lịch sử lớn hơn khoản hoàn", () => {
    render(
      <CustomerNoShowPanel
        noShow={noShow}
        debtRecovered={150_000}
        onRebook={vi.fn()}
        onSupport={vi.fn()}
      />,
    );

    expect(screen.getByText("0đ")).toBeInTheDocument();
    expect(screen.getByText("−100.000đ")).toBeInTheDocument();
  });
});
