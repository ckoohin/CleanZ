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
  it("nêu rõ hoàn danh nghĩa, phần cấn nợ và số thực tăng trong ví", () => {
    render(
      <CustomerAbsencePanel
        report={baseReport}
        onDispute={vi.fn()}
        onOpenWallet={vi.fn()}
      />,
    );

    expect(screen.getByText("Hoàn tiền danh nghĩa")).toBeInTheDocument();
    expect(screen.getByText("100.000đ")).toBeInTheDocument();
    expect(screen.getByText("−30.000đ")).toBeInTheDocument();
    expect(screen.getByText("70.000đ")).toBeInTheDocument();
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

  it("mở đúng lối xử lý công nợ và khiếu nại", () => {
    const onOpenWallet = vi.fn();
    const onDispute = vi.fn();
    render(
      <CustomerAbsencePanel
        report={baseReport}
        onDispute={onDispute}
        onOpenWallet={onOpenWallet}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Mở Ví CleanZ/i }));
    fireEvent.click(screen.getByRole("button", { name: /Khiếu nại/i }));

    expect(onOpenWallet).toHaveBeenCalledOnce();
    expect(onDispute).toHaveBeenCalledOnce();
  });
});
