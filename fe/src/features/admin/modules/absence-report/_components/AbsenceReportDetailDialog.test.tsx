import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminAbsenceReport } from "../types/absence-report.types";
import { AbsenceReportDetailDialog } from "./AbsenceReportDetailDialog";

const hooks = vi.hoisted(() => ({
  detail: vi.fn(),
  review: vi.fn(),
  writeOff: vi.fn(),
}));

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <div role="img" aria-label={alt} />,
}));

vi.mock("next/dynamic", () => ({
  default: () =>
    function CheckinMapProbe({
      checkinLatitude,
      checkinLongitude,
      targetLatitude,
      targetLongitude,
    }: {
      checkinLatitude: number | null;
      checkinLongitude: number | null;
      targetLatitude: number | null;
      targetLongitude: number | null;
    }) {
      return (
        <div
          data-testid="checkin-map"
          data-checkin={`${checkinLatitude},${checkinLongitude}`}
          data-target={`${targetLatitude},${targetLongitude}`}
        />
      );
    },
}));

vi.mock("@/components/admin", () => ({
  AdminDialog: ({
    open,
    title,
    children,
    footer,
    className,
    bodyClassName,
  }: {
    open: boolean;
    title: React.ReactNode;
    children: React.ReactNode;
    footer?: React.ReactNode;
    className?: string;
    bodyClassName?: string;
  }) =>
    open ? (
      <div
        data-testid="admin-dialog"
        data-class-name={className}
        data-body-class-name={bodyClassName}
      >
        {title}
        {children}
        {footer}
      </div>
    ) : null,
  AdminButton: ({
    children,
    variant,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => (
    <button data-variant={variant} {...props}>
      {children}
    </button>
  ),
  StatusBadge: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

vi.mock("../hooks/useAdminAbsenceReports", () => ({
  useAdminAbsenceReport: hooks.detail,
  useReviewAbsenceReport: () => ({
    mutateAsync: hooks.review,
    isPending: false,
  }),
  useWriteOffAbsenceDebt: () => ({
    mutateAsync: hooks.writeOff,
    isPending: false,
  }),
}));

const report: AdminAbsenceReport = {
  id: "absence-1",
  status: "PENDING_REVIEW",
  reportedAt: "2026-08-09T12:30:00.000Z",
  reviewDueAt: "2026-08-11T12:30:00.000Z",
  slaRemainingMs: 172_800_000,
  isGuest: false,
  proofPhotoUrl:
    "https://res.cloudinary.com/cleanz/image/upload/CleanZ/uploads/proof.jpg",
  callHistoryPhotoUrl:
    "https://res.cloudinary.com/cleanz/image/upload/CleanZ/uploads/call-history.jpg",
  hasCallHistoryPhoto: true,
  taskerNote: null,
  waitedMinutes: 18,
  checkinDistanceMeters: 4705,
  checkinFar: true,
  compensationAmount: 50_000,
  subtotalSnapshot: 200_000,
  refundedUpfront: 150_000,
  heldForReview: 50_000,
  fundingPreview: {
    paidFromEscrow: 50_000,
    paidFromCustomerWallet: 0,
    advancedByPlatform: 0,
    platformBorneAmount: 0,
  },
  settlement: {
    paidFromEscrow: 0,
    paidFromCustomerWallet: 0,
    advancedByPlatform: 0,
    platformBorneAmount: 0,
    refundedOnClose: 0,
  },
  debt: null,
  booking: {
    id: "booking-1",
    bookingCode: "BK-ABSENCE-1",
    status: "CANCELLED",
    paymentMethod: "WALLET",
    paymentStatus: "PARTIALLY_REFUNDED",
    totalPrice: 200_000,
    discountAmount: 0,
    checkedInAt: "2026-08-09T12:19:00.000Z",
    checkinReviewStatus: "PENDING_REVIEW",
    checkinLatitude: 21.06789,
    checkinLongitude: 105.81234,
    checkinTargetLatitude: 21.07567,
    checkinTargetLongitude: 105.82345,
    address: "141 Phố Trích Sài, Tây Hồ, Hà Nội",
    packageName: "Dọn nhà tiêu chuẩn",
  },
  tasker: {
    id: "tasker-1",
    fullName: "Nguyễn Văn Tasker",
    phone: "0900000001",
    avatarUrl: null,
    ratingAvg: 4.9,
  },
  customer: {
    id: "customer-1",
    fullName: "Nguyễn Văn Khách",
    phone: "0900000002",
  },
  taskerStats30d: { reported: 1, rejected: 0, expired: 0 },
  customerApproved90d: 0,
  needsAttention: true,
  attentionReasons: ["Check-in ngoài bán kính"],
  reviewedAt: null,
  reviewReason: null,
  reviewedBy: null,
};

describe("AbsenceReportDetailDialog", () => {
  beforeEach(() => {
    hooks.detail.mockReset();
    hooks.review.mockReset().mockResolvedValue(undefined);
    hooks.writeOff.mockReset().mockResolvedValue(undefined);
    hooks.detail.mockReturnValue({ data: report, isLoading: false });
  });

  it("truyền đúng vị trí Tasker và địa chỉ khách vào bản đồ đối chiếu", () => {
    render(
      <AbsenceReportDetailDialog
        reportId={report.id}
        open
        onOpenChange={vi.fn()}
      />,
    );

    const map = screen.getByTestId("checkin-map");
    expect(map).toHaveAttribute("data-checkin", "21.06789,105.81234");
    expect(map).toHaveAttribute("data-target", "21.07567,105.82345");
    expect(screen.getByText("Bản đồ đối chiếu vị trí")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Địa chỉ khách hàng" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Lịch sử cuộc gọi" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("141 Phố Trích Sài, Tây Hồ, Hà Nội"),
    ).toBeInTheDocument();
  });

  it("dùng modal rộng và chỉ chia sidebar ở màn hình lớn", () => {
    render(
      <AbsenceReportDetailDialog
        reportId={report.id}
        open
        onOpenChange={vi.fn()}
      />,
    );

    const dialog = screen.getByTestId("admin-dialog");
    expect(dialog).toHaveAttribute(
      "data-class-name",
      expect.stringContaining("sm:max-w-[96vw]"),
    );
    expect(dialog).toHaveAttribute(
      "data-body-class-name",
      expect.stringContaining("max-h-[calc(100dvh-12rem)]"),
    );
    expect(screen.getByTestId("absence-report-layout")).toHaveClass(
      "xl:grid-cols-[minmax(0,1.55fr)_minmax(22rem,0.85fr)]",
    );
  });

  it("mở ảnh bằng lightbox trong trang thay vì tab mới", () => {
    render(
      <AbsenceReportDetailDialog
        reportId={report.id}
        open
        onOpenChange={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("link", { name: /Mở ảnh Địa chỉ khách hàng/ }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Mở ảnh Địa chỉ khách hàng" }),
    );

    const lightbox = screen.getByRole("dialog", {
      name: "Xem ảnh Địa chỉ khách hàng",
    });
    expect(
      within(lightbox).getByRole("img", { name: "Địa chỉ khách hàng" }),
    ).toBeInTheDocument();

    fireEvent.click(
      within(lightbox).getByRole("button", { name: "Đóng xem ảnh" }),
    );
    expect(
      screen.queryByRole("dialog", { name: "Xem ảnh Địa chỉ khách hàng" }),
    ).not.toBeInTheDocument();
  });

  it("ưu tiên số tiền Tasker nhận và dùng nhãn dễ hiểu", () => {
    render(
      <AbsenceReportDetailDialog
        reportId={report.id}
        open
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Tasker sẽ nhận")).toBeInTheDocument();
    expect(screen.getByText("Tiền được lấy từ")).toBeInTheDocument();
    expect(screen.getByText("Tiền đơn đang giữ")).toBeInTheDocument();
    expect(screen.getByText("CleanZ ứng trước")).toBeInTheDocument();
    expect(screen.getByText("Thời hạn xử lý")).toBeInTheDocument();
    expect(
      screen.getByText("Vị trí check-in cách xa địa chỉ của khách"),
    ).toBeInTheDocument();

    expect(screen.queryByText("Từ khoản đang giữ")).not.toBeInTheDocument();
    expect(screen.queryByText("Nền tảng ứng, ghi nợ")).not.toBeInTheDocument();
    expect(screen.queryByText("SLA duyệt")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Check-in ngoài bán kính"),
    ).not.toBeInTheDocument();
  });

  it("điền nhanh lý do và gửi đúng nội dung khi từ chối", async () => {
    const onOpenChange = vi.fn();
    render(
      <AbsenceReportDetailDialog
        reportId={report.id}
        open
        onOpenChange={onOpenChange}
      />,
    );

    const reasonInput = screen.getByLabelText("Ghi chú cho quyết định");
    fireEvent.click(
      screen.getByRole("button", { name: "Ảnh địa chỉ chưa rõ" }),
    );

    expect(reasonInput).toHaveValue(
      "Ảnh địa chỉ chưa đủ rõ để xác minh Tasker đã đến.",
    );
    expect(
      screen.getByRole("button", { name: "Từ chối báo cáo" }),
    ).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Từ chối báo cáo" }));

    await waitFor(() =>
      expect(hooks.review).toHaveBeenCalledWith({
        id: report.id,
        decision: "REJECT",
        reason: "Ảnh địa chỉ chưa đủ rõ để xác minh Tasker đã đến.",
      }),
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("có gợi ý nhanh riêng cho lý do xóa khoản nợ", async () => {
    const debtReport: AdminAbsenceReport = {
      ...report,
      debt: {
        id: "debt-1",
        status: "OUTSTANDING",
        originalAmount: 70_000,
        recoveredAmount: 20_000,
        writtenOffAmount: 0,
        outstandingAmount: 50_000,
        createdAt: "2026-08-09T12:30:00.000Z",
        writeOffEligibleAt: "2026-08-10T12:30:00.000Z",
        canWriteOff: true,
      },
    };
    hooks.detail.mockReturnValue({ data: debtReport, isLoading: false });

    render(
      <AbsenceReportDetailDialog
        reportId={debtReport.id}
        open
        onOpenChange={vi.fn()}
      />,
    );

    const reasonInput = screen.getByLabelText("Lý do xóa khoản nợ");
    fireEvent.click(screen.getByRole("button", { name: "Không liên hệ được" }));

    expect(reasonInput).toHaveValue(
      "Không thể liên hệ khách sau nhiều lần thử.",
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Xác nhận xóa khoản nợ còn lại",
      }),
    );

    await waitFor(() =>
      expect(hooks.writeOff).toHaveBeenCalledWith({
        debtId: "debt-1",
        reason: "Không thể liên hệ khách sau nhiều lần thử.",
      }),
    );
  });
});
