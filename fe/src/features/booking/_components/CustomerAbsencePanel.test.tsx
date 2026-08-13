import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CustomerBookingAbsenceReport } from "@/features/booking/types/absence-report.types";
import { CustomerAbsencePanel } from "./CustomerAbsencePanel";

const baseReport: CustomerBookingAbsenceReport = {
  id: "absence-1",
  status: "APPROVED",
  reportedAt: "2026-08-09T01:00:00.000Z",
  reviewDueAt: "2026-08-11T01:00:00.000Z",
  compensationAmount: 50000,
  reviewReason: "Đã đối chiếu ảnh và vị trí check-in",
  refundedUpfront: 80000,
  debtRecoveredUpfront: 30000,
  heldForReview: 50000,
  advancedByPlatform: 20000,
  refundedOnClose: 20000,
  debtRecoveredOnClose: 0,
};

describe("CustomerAbsencePanel", () => {
  it("chỉ hiển thị thông báo kết quả, không hiển thị số tiền", () => {
    render(
      <CustomerAbsencePanel
        report={baseReport}
        onDispute={vi.fn()}
        onOpenWallet={vi.fn()}
      />,
    );

    expect(
      screen.getByText("Báo cáo khách vắng đã được xác nhận"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Hoàn tiền danh nghĩa")).not.toBeInTheDocument();
    expect(screen.queryByText("100.000đ")).not.toBeInTheDocument();
    expect(screen.queryByText("70.000đ")).not.toBeInTheDocument();
  });

  it("giữ giao diện khách ở mức kết quả xử lý, không lộ bằng chứng nội bộ", () => {
    render(
      <CustomerAbsencePanel
        report={baseReport}
        onDispute={vi.fn()}
        onOpenWallet={vi.fn()}
      />,
    );

    expect(screen.getByText(baseReport.reviewReason!)).toBeInTheDocument();
    expect(screen.queryByText(/ảnh hiện trường/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/tọa độ|gps/i)).not.toBeInTheDocument();
  });

  it("mở đúng lối xử lý công nợ và khiếu nại sau khi có kết quả", () => {
    const onOpenWallet = vi.fn();
    const onDispute = vi.fn();
    render(
      <CustomerAbsencePanel
        report={baseReport}
        onDispute={onDispute}
        onOpenWallet={onOpenWallet}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Xem Ví CleanZ/i }));
    fireEvent.click(screen.getByRole("button", { name: /Khiếu nại/i }));

    expect(onOpenWallet).toHaveBeenCalledOnce();
    expect(onDispute).toHaveBeenCalledOnce();
  });

  it("chỉ thông báo thời hạn trong lúc đang xác minh", () => {
    render(
      <CustomerAbsencePanel
        report={{ ...baseReport, status: "PENDING_REVIEW" }}
        onDispute={vi.fn()}
        onOpenWallet={vi.fn()}
      />,
    );

    expect(
      screen.getByText("CleanZ đang xác minh báo cáo khách vắng"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Dự kiến có kết quả trước/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Khiếu nại/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Tasker có thể nhận bồi hoàn/i)).not.toBeInTheDocument();
  });
});
