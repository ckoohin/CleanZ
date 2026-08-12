"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Clock,
  MapPin,
  User,
  Banknote,
  ShieldCheck,
  FileText,
  CheckCircle2,
  XCircle,
  PawPrint,
  TrendingUp,
  ArrowRight,
  AlertTriangle,
  Camera,
  ExternalLink,
  Loader2,
  Navigation,
  UserX,
} from "lucide-react";
import { AdminButton, StatusBadge, BadgeTone } from "@/components/admin";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";
import {
  useAdminCheckinOverride,
  useCancelAdminBooking,
  useReviewBookingCheckin,
  useReviewBookingNoShow,
} from "@/features/admin/modules/booking/hooks/useAdminBooking";
import { AssignTaskerDialog } from "@/features/admin/modules/booking/_components/AssignTaskerDialog";
import { ChangeBookingStatusDialog } from "@/features/admin/modules/booking/_components/ChangeBookingStatusDialog";
import { useRouter } from "next/navigation";
import {
  AdminBookingDetail,
  AdminBookingTimelineEntry,
} from "@/features/admin/modules/booking/types/booking.types";
import {
  CheckinLocationDialog,
  CheckinProofDialog,
} from "@/features/admin/modules/checkin-review/_components/CheckinEvidenceDialogs";
import { getApiErrorMessage } from "@/lib/api/error-message";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: AdminBookingDetail | null;
  onBookingUpdated?: (booking: AdminBookingDetail) => void;
}

type BookingDetailTab = "overview" | "payment" | "work" | "checkin" | "history";

const STATUS_MAP: Record<string, { label: string; tone: BadgeTone }> = {
  POSTED: { label: "Đang tìm kiếm nhân viên", tone: "warning" },
  PENDING_CUSTOMER_CONFIRMATION: {
    label: "Chờ khách xác nhận",
    tone: "warning",
  },
  CONFIRMED: { label: "Đã nhận đơn", tone: "info" },
  TASKER_ON_THE_WAY: { label: "Nhân viên đang đến", tone: "info" },
  CHECKED_IN: { label: "Đã đến nơi", tone: "info" },
  IN_PROGRESS: { label: "Đang thực hiện", tone: "purple" },
  COMPLETED: { label: "Hoàn thành", tone: "success" },
  CANCELLED: { label: "Đã hủy", tone: "danger" },
  EXPIRED: { label: "Đã hết hạn", tone: "neutral" },
};

const CHECKIN_REVIEW_META: Record<string, { label: string; tone: BadgeTone }> =
  {
    NOT_REQUIRED: { label: "GPS hợp lệ", tone: "success" },
    PENDING_REVIEW: { label: "Chờ Admin duyệt", tone: "warning" },
    APPROVED: { label: "Đã chấp nhận", tone: "success" },
    REJECTED: { label: "Đã xác nhận vi phạm", tone: "danger" },
    NOT_VERIFIABLE: { label: "Không thể xác minh", tone: "neutral" },
  };

const CHECKIN_SOURCE_LABEL: Record<string, string> = {
  GPS: "GPS trong bán kính",
  GPS_WITH_PROOF: "GPS ngoài bán kính + ảnh",
  GPS_LOW_ACCURACY_WITH_PROOF: "GPS sai số lớn + ảnh",
  NO_GPS_WITH_PROOF: "Không có GPS + ảnh",
  TARGET_MISSING_WITH_PROOF: "Địa chỉ thiếu tọa độ + ảnh",
  ADMIN_OVERRIDE: "Admin xác nhận thủ công",
};

function fmtPrice(n: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(n);
}

function paymentMethodLabel(method?: string | null) {
  if (method === "WALLET") return "Ví CleanZ";
  if (method === "CASH") return "Tiền mặt";
  return method ?? "Chưa xác định";
}

function fmtDateTime(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

function getPaymentStatusMeta(
  bookingStatus?: string | null,
  paymentStatus?: string | null,
): { label: string; tone: BadgeTone } {
  if (bookingStatus === "CANCELLED" || bookingStatus === "EXPIRED") {
    return { label: "Đã hủy", tone: "danger" };
  }

  if (paymentStatus === "PAID")
    return { label: "Đã thanh toán", tone: "success" };
  if (paymentStatus === "FAILED")
    return { label: "Thanh toán thất bại", tone: "danger" };
  if (paymentStatus === "REFUNDED")
    return { label: "Đã hoàn tiền", tone: "info" };
  if (paymentStatus === "PARTIALLY_REFUNDED")
    return { label: "Hoàn tiền một phần", tone: "info" };

  return { label: paymentStatus ?? "—", tone: "warning" };
}

function PriceRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  if (value === 0) return null;
  return (
    <div
      className={`flex justify-between text-sm ${highlight ? "border-t border-[var(--c-line)] pt-2 mt-1" : ""}`}
    >
      <span className="text-[var(--c-muted)]">{label}</span>
      <span
        className={`font-semibold ${highlight ? "text-[var(--c-primary-strong)] text-base" : "text-[var(--c-ink)]"}`}
      >
        {fmtPrice(value)}
      </span>
    </div>
  );
}

function TimelineRow({
  entry,
  onNavigate,
}: {
  entry: AdminBookingTimelineEntry;
  onNavigate?: (url: string) => void;
}) {
  const meta = STATUS_MAP[entry.newStatus] ?? {
    label: entry.newStatus,
    tone: "neutral" as BadgeTone,
  };
  return (
    <div className="flex items-start gap-3 py-1">
      <div className="mt-1 w-2 h-2 rounded-full bg-[var(--c-primary-strong)] shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {entry.oldStatus && (
            <>
              <StatusBadge
                tone={
                  (STATUS_MAP[entry.oldStatus]?.tone ?? "neutral") as BadgeTone
                }
                className="text-[10px]"
              >
                {STATUS_MAP[entry.oldStatus]?.label ?? entry.oldStatus}
              </StatusBadge>
              <ArrowRight className="w-3 h-3 text-[var(--c-muted)]" />
            </>
          )}
          <StatusBadge tone={meta.tone} className="text-[10px]">
            {meta.label}
          </StatusBadge>
        </div>
        {entry.note && (
          <p className="text-xs text-[var(--c-muted)] mt-0.5 truncate">
            {entry.note}
          </p>
        )}
        {entry.cancelReason && (
          <p className="text-xs text-red-500 mt-0.5">
            Lý do: {entry.cancelReason}
          </p>
        )}
        <p className="text-[10px] text-[var(--c-muted)] mt-0.5">
          {fmtDateTime(entry.createdAt)}
          {entry.changedBy && (
            <>
              {" · "}
              {entry.changedBy.role === "CUSTOMER" ||
              entry.changedBy.role === "TASKER" ? (
                <button
                  type="button"
                  onClick={() => {
                    const path =
                      entry.changedBy!.role === "CUSTOMER"
                        ? "customers"
                        : "taskers";
                    if (onNavigate) {
                      onNavigate(`/admin/${path}/${entry.changedBy!.id}`);
                    }
                  }}
                  className="hover:text-blue-600 hover:underline cursor-pointer"
                  title="Xem hồ sơ"
                >
                  {entry.changedBy.fullName}
                </button>
              ) : (
                entry.changedBy.fullName
              )}
            </>
          )}
        </p>
      </div>
    </div>
  );
}

export const AdminBookingDetailModal: React.FC<Props> = ({
  open,
  onOpenChange,
  booking,
  onBookingUpdated,
}) => {
  const router = useRouter();
  const cancelMutation = useCancelAdminBooking();
  const reviewMutation = useReviewBookingCheckin();
  const noShowReviewMutation = useReviewBookingNoShow();
  const overrideMutation = useAdminCheckinOverride();
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isChangeStatusOpen, setIsChangeStatusOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [reviewDecision, setReviewDecision] = useState<
    "APPROVE" | "REJECT" | "MARK_NOT_VERIFIABLE"
  >("APPROVE");
  const [reviewReason, setReviewReason] = useState("");
  const [openIncident, setOpenIncident] = useState(false);
  const [claimedAmount, setClaimedAmount] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [noShowDecision, setNoShowDecision] = useState<
    "CONFIRM_NO_SHOW" | "EXCUSE_TASKER"
  >("CONFIRM_NO_SHOW");
  const [noShowReason, setNoShowReason] = useState("");
  const [openNoShowIncident, setOpenNoShowIncident] = useState(false);
  const [noShowClaimedAmount, setNoShowClaimedAmount] = useState("");
  const [activeTab, setActiveTab] = useState<BookingDetailTab>("overview");
  const [isCheckinProofOpen, setIsCheckinProofOpen] = useState(false);
  const [isCheckinLocationOpen, setIsCheckinLocationOpen] = useState(false);

  const resetCheckinForm = () => {
    setReviewDecision("APPROVE");
    setReviewReason("");
    setOpenIncident(false);
    setClaimedAmount("");
    setOverrideReason("");
    setNoShowDecision("CONFIRM_NO_SHOW");
    setNoShowReason("");
    setOpenNoShowIncident(false);
    setNoShowClaimedAmount("");
    setActiveTab("overview");
    setIsCheckinProofOpen(false);
    setIsCheckinLocationOpen(false);
  };

  if (!booking) return null;

  const status = booking.status ?? "";
  const statusMeta = STATUS_MAP[status] ?? {
    label: status,
    tone: "neutral" as BadgeTone,
  };

  const schedule = booking.schedule;
  const price = booking.price;
  const operation = booking.operation;
  const workTiming = operation?.workTiming;
  const noShow = operation?.noShow;
  const payment = booking.payment;
  const paymentStatusMeta = getPaymentStatusMeta(status, payment?.status);
  const isClosed =
    status === "COMPLETED" || status === "CANCELLED" || status === "EXPIRED";
  const hasPendingSurcharge =
    workTiming?.surchargeStatus === "PENDING_CUSTOMER" ||
    workTiming?.surchargeStatus === "PENDING_TASKER_CONFIRM";
  const handleCancel = () => {
    cancelMutation.mutate(
      { id: booking.id, reason: "Hệ thống đã hủy đơn" },
      {
        onSuccess: () => {
          toast.success("Hủy đơn thành công");
          setConfirmCancel(false);
          onOpenChange(false);
        },
        onError: (err: unknown) => {
          toast.error(getApiErrorMessage(err, "Không thể hủy đơn"));
        },
      },
    );
  };

  const handleReviewCheckin = () => {
    if (reviewReason.trim().length < 3) {
      toast.error("Vui lòng nhập lý do review ít nhất 3 ký tự");
      return;
    }
    const amount = Number(claimedAmount);
    if (
      reviewDecision === "REJECT" &&
      openIncident &&
      (!Number.isInteger(amount) || amount <= 0)
    ) {
      toast.error("Vui lòng nhập số tiền yêu cầu bồi thường hợp lệ");
      return;
    }

    reviewMutation.mutate(
      {
        id: booking.id,
        payload: {
          decision: reviewDecision,
          reason: reviewReason.trim(),
          openIncident: reviewDecision === "REJECT" && openIncident,
          claimedAmount:
            reviewDecision === "REJECT" && openIncident ? amount : undefined,
        },
      },
      {
        onSuccess: (updated: AdminBookingDetail) => {
          onBookingUpdated?.(updated);
          toast.success(
            openIncident
              ? "Đã review và mở hồ sơ Incident"
              : "Đã lưu kết quả review check-in",
          );
        },
        onError: (err: unknown) => {
          toast.error(getApiErrorMessage(err, "Không thể review check-in"));
        },
      },
    );
  };

  const handleOverrideCheckin = () => {
    if (overrideReason.trim().length < 5) {
      toast.error("Vui lòng nhập lý do override ít nhất 5 ký tự");
      return;
    }
    overrideMutation.mutate(
      {
        id: booking.id,
        payload: { reason: overrideReason.trim() },
      },
      {
        onSuccess: (updated: AdminBookingDetail) => {
          onBookingUpdated?.(updated);
          toast.success("Đã xác nhận check-in thủ công");
        },
        onError: (err: unknown) => {
          toast.error(getApiErrorMessage(err, "Không thể override check-in"));
        },
      },
    );
  };

  const handleOpenIncidentAfterReview = () => {
    const amount = Number(claimedAmount);
    const reason = workTiming?.checkinReviewReason?.trim();
    if (!reason) {
      toast.error("Kết quả review chưa có lý do hợp lệ");
      return;
    }
    if (!Number.isInteger(amount) || amount <= 0) {
      toast.error("Vui lòng nhập số tiền yêu cầu bồi thường hợp lệ");
      return;
    }

    reviewMutation.mutate(
      {
        id: booking.id,
        payload: {
          decision: "REJECT",
          reason,
          openIncident: true,
          claimedAmount: amount,
        },
      },
      {
        onSuccess: (updated: AdminBookingDetail) => {
          onBookingUpdated?.(updated);
          toast.success("Đã mở hồ sơ Incident từ kết quả review");
        },
        onError: (err: unknown) => {
          toast.error(getApiErrorMessage(err, "Không thể mở Incident"));
        },
      },
    );
  };

  const submitNoShowReview = ({
    decision,
    reason,
    openIncident,
    claimedAmount,
  }: {
    decision: "CONFIRM_NO_SHOW" | "EXCUSE_TASKER";
    reason: string;
    openIncident: boolean;
    claimedAmount?: number;
  }) => {
    noShowReviewMutation.mutate(
      {
        id: booking.id,
        payload: {
          decision,
          reason,
          openIncident,
          claimedAmount,
        },
      },
      {
        onSuccess: (updated: AdminBookingDetail) => {
          onBookingUpdated?.(updated);
          toast.success(
            openIncident
              ? "Đã kết luận no-show và mở Incident"
              : "Đã lưu kết luận no-show",
          );
        },
        onError: (err: unknown) => {
          toast.error(getApiErrorMessage(err, "Không thể review no-show"));
        },
      },
    );
  };

  const handleReviewNoShow = () => {
    const reason = noShowReason.trim();
    if (reason.length < 10) {
      toast.error("Vui lòng nhập căn cứ review ít nhất 10 ký tự");
      return;
    }
    const amount = Number(noShowClaimedAmount);
    const shouldOpenIncident =
      noShowDecision === "CONFIRM_NO_SHOW" && openNoShowIncident;
    if (shouldOpenIncident && (!Number.isInteger(amount) || amount <= 0)) {
      toast.error("Vui lòng nhập số tiền yêu cầu bồi thường hợp lệ");
      return;
    }
    submitNoShowReview({
      decision: noShowDecision,
      reason,
      openIncident: shouldOpenIncident,
      claimedAmount: shouldOpenIncident ? amount : undefined,
    });
  };

  const handleOpenNoShowIncidentAfterReview = () => {
    const reason = noShow?.reviewReason?.trim();
    const amount = Number(noShowClaimedAmount);
    if (!reason) {
      toast.error("Kết luận no-show chưa có căn cứ hợp lệ");
      return;
    }
    if (!Number.isInteger(amount) || amount <= 0) {
      toast.error("Vui lòng nhập số tiền yêu cầu bồi thường hợp lệ");
      return;
    }
    submitNoShowReview({
      decision: "CONFIRM_NO_SHOW",
      reason,
      openIncident: true,
      claimedAmount: amount,
    });
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetCheckinForm();
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="cz-admin flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] flex-col overflow-hidden bg-[var(--c-card)] text-[var(--c-ink)] !max-w-6xl border-[var(--c-line)] sm:max-h-[calc(100dvh-3rem)] sm:!max-w-6xl">
        <DialogHeader className="shrink-0 pr-8">
          <DialogTitle className="flex flex-wrap items-center gap-3 text-xl text-[var(--c-ink)]">
            Chi Tiết Đơn Hàng
            <span className="font-mono text-base text-[var(--c-primary-strong)] bg-[var(--c-primary-soft)] px-3 py-1 rounded-full">
              {booking.bookingCode}
            </span>
          </DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as BookingDetailTab)}
          className="mt-2 flex min-h-0 flex-1 flex-col"
        >
          <div className="-mx-1 shrink-0 overflow-x-auto px-1 pb-1">
            <TabsList
              aria-label="Nhóm thông tin đơn hàng"
              className="h-auto w-max min-w-full justify-start gap-1 rounded-xl border border-[var(--c-line)] bg-[var(--c-card-2)] p-1 sm:w-full sm:justify-between"
            >
              <TabsTrigger
                value="overview"
                className="h-9 shrink-0 rounded-lg px-3 text-xs font-semibold text-[var(--c-muted)] data-[state=active]:bg-[var(--c-card)] data-[state=active]:text-[var(--c-ink)] data-[state=active]:shadow-sm"
              >
                Tổng quan
              </TabsTrigger>
              <TabsTrigger
                value="payment"
                className="h-9 shrink-0 rounded-lg px-3 text-xs font-semibold text-[var(--c-muted)] data-[state=active]:bg-[var(--c-card)] data-[state=active]:text-[var(--c-ink)] data-[state=active]:shadow-sm"
              >
                Tiền &amp; thanh toán
              </TabsTrigger>
              <TabsTrigger
                value="work"
                className="h-9 shrink-0 rounded-lg px-3 text-xs font-semibold text-[var(--c-muted)] data-[state=active]:bg-[var(--c-card)] data-[state=active]:text-[var(--c-ink)] data-[state=active]:shadow-sm"
              >
                <span>Ca làm</span>
                {noShow?.reviewStatus === "PENDING_REVIEW" && (
                  <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                    Cần xử lý
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="checkin"
                className="h-9 shrink-0 rounded-lg px-3 text-xs font-semibold text-[var(--c-muted)] data-[state=active]:bg-[var(--c-card)] data-[state=active]:text-[var(--c-ink)] data-[state=active]:shadow-sm"
              >
                <span>Kiểm tra</span>
                {workTiming?.checkinReviewStatus === "PENDING_REVIEW" && (
                  <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                    Cần xử lý
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="h-9 shrink-0 rounded-lg px-3 text-xs font-semibold text-[var(--c-muted)] data-[state=active]:bg-[var(--c-card)] data-[state=active]:text-[var(--c-ink)] data-[state=active]:shadow-sm"
              >
                Lịch sử
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value={activeTab}
            forceMount
            className="mt-2 min-h-0 flex-1 overflow-y-auto pr-1"
          >
            <div className="grid min-h-full w-full gap-3">
              <div
                className={
                  activeTab === "overview"
                    ? "grid min-h-full min-w-0 grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 lg:auto-rows-fr"
                    : activeTab === "payment"
                      ? "grid w-full min-w-0 grid-cols-1 gap-3 md:grid-cols-2"
                    : "hidden"
                }
              >
                {/* Row 1: Status + Schedule */}
                <div
                  className={activeTab === "overview" ? "contents" : "hidden"}
                >
                  {/* Booking status */}
                  <div className="bg-[var(--c-card-2)] rounded-xl p-4 border border-[var(--c-line)] space-y-3">
                    <h3 className="font-bold text-sm flex items-center gap-2 pb-2 border-b border-[var(--c-line)]">
                      <ShieldCheck className="w-4 h-4 text-[var(--c-primary-strong)]" />{" "}
                      Trạng thái đơn
                    </h3>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[var(--c-muted)]">
                        Trạng thái đơn
                      </span>
                      <StatusBadge tone={statusMeta.tone}>
                        {statusMeta.label}
                      </StatusBadge>
                    </div>
                  </div>

                  {/* Schedule */}
                  <div className="bg-[var(--c-card-2)] rounded-xl p-4 border border-[var(--c-line)] space-y-3">
                    <h3 className="font-bold text-sm flex items-center gap-2 pb-2 border-b border-[var(--c-line)]">
                      <Clock className="w-4 h-4 text-[var(--c-primary-strong)]" />{" "}
                      Lịch Hẹn
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-xs text-[var(--c-muted)] block mb-0.5">
                          Ngày làm việc
                        </span>
                        <span className="font-semibold text-sm">
                          {schedule?.scheduledStartDate ?? "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-[var(--c-muted)] block mb-0.5">
                          Giờ bắt đầu
                        </span>
                        <span className="font-semibold text-sm">
                          {schedule?.scheduledStartTime ?? "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-[var(--c-muted)] block mb-0.5">
                          Thời lượng
                        </span>
                        <span className="font-semibold text-sm">
                          {schedule?.durationHours ?? "—"} giờ
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-[var(--c-muted)] block mb-0.5">
                          Dịch vụ
                        </span>
                        {booking.service?.id ? (
                          <button
                            type="button"
                            onClick={() =>
                              window.open(
                                `/admin/services/${booking.service!.id}`,
                                "_blank",
                              )
                            }
                            className="inline-flex items-center gap-1 font-semibold text-sm text-[var(--c-primary-strong)] hover:text-blue-600 hover:underline cursor-pointer group"
                            title="Mở cấu hình dịch vụ trong tab mới"
                          >
                            {booking.service?.name ?? "N/A"}
                            <ExternalLink className="w-3 h-3 text-[var(--c-primary-soft)] group-hover:text-blue-600" />
                          </button>
                        ) : (
                          <span className="font-semibold text-sm text-[var(--c-primary-strong)]">
                            {booking.service?.name ?? "N/A"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className={
                    activeTab === "payment"
                      ? "rounded-xl border border-[var(--c-line)] bg-[var(--c-card-2)] p-4"
                      : "hidden"
                  }
                >
                  <h3 className="mb-3 flex items-center gap-2 border-b border-[var(--c-line)] pb-2 text-sm font-bold">
                    <Banknote className="size-4 text-[var(--c-primary-strong)]" />
                    Thanh toán
                  </h3>
                  {payment ? (
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[var(--c-muted)]">Giá gốc</span>
                        <span className="font-semibold">
                          {fmtPrice(payment.baseAmount)} ·{" "}
                          {paymentMethodLabel(
                            payment.basePaymentMethod ?? payment.method,
                          )}
                        </span>
                      </div>
                      {payment.surchargeAmount > 0 && (
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[var(--c-muted)]">
                            Phần phát sinh
                          </span>
                          <span className="text-right font-semibold">
                            {fmtPrice(payment.surchargeAmount)} ·{" "}
                            {paymentMethodLabel(payment.surchargePaymentMethod)}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[var(--c-muted)]">
                          Trạng thái thanh toán
                        </span>
                        <StatusBadge tone={paymentStatusMeta.tone}>
                          {paymentStatusMeta.label}
                        </StatusBadge>
                      </div>
                      {payment.voucher && (
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[var(--c-muted)]">
                            Mã ưu đãi
                          </span>
                          <span className="font-mono text-xs font-bold text-emerald-600">
                            {payment.voucher.code}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--c-muted)]">
                      Chưa có thông tin thanh toán cho đơn này.
                    </p>
                  )}
                </div>

                {/* Row 2: Price breakdown */}
                {price && activeTab === "payment" && (
                  <div className="bg-[var(--c-card-2)] rounded-xl p-4 border border-[var(--c-line)]">
                    <h3 className="font-bold text-sm flex items-center gap-2 pb-2 border-b border-[var(--c-line)] mb-3">
                      <Banknote className="w-4 h-4 text-[var(--c-primary-strong)]" />{" "}
                      Chi Tiết Giá
                    </h3>
                    <div className="space-y-1.5">
                      <PriceRow label="Giá cơ bản" value={price.basePrice} />
                      <PriceRow label="Dịch vụ thêm" value={price.addonPrice} />
                      <PriceRow label="Phí cao điểm" value={price.peakFee} />
                      <PriceRow label="Phí thú cưng" value={price.petFee} />
                      <PriceRow label="Phụ phí" value={price.waitingFee} />
                      {price.discountAmount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-[var(--c-muted)]">
                            Giảm giá voucher
                          </span>
                          <span className="font-semibold text-emerald-600">
                            -{fmtPrice(price.discountAmount)}
                          </span>
                        </div>
                      )}
                      <PriceRow
                        label="Tổng thanh toán"
                        value={price.totalPrice}
                        highlight
                      />
                    </div>
                    {payment && payment.commissionRate !== null && (
                      <div className="mt-3 pt-3 border-t border-[var(--c-line)] grid grid-cols-3 gap-2 text-center">
                        <div>
                          <span className="text-[10px] text-[var(--c-muted)] block">
                            Hoa hồng tổng
                          </span>
                          <span className="text-xs font-bold text-[var(--c-ink)]">
                            {payment.commissionRate}%
                            {payment.isEstimated ? " *" : ""}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[var(--c-muted)] block">
                            Phí nền tảng
                          </span>
                          <span className="text-xs font-bold text-red-500">
                            {payment.platformFee != null
                              ? fmtPrice(payment.platformFee)
                              : "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[var(--c-muted)] block">
                            Tasker nhận
                          </span>
                          <span className="text-xs font-bold text-emerald-600">
                            {payment.taskerIncome != null
                              ? fmtPrice(payment.taskerIncome)
                              : "—"}
                          </span>
                        </div>
                      </div>
                    )}
                    {payment && payment.commissionRate !== null && (
                      <div className="mt-2 grid grid-cols-2 gap-x-4 border-t border-[var(--c-line)] pt-2 text-[10px]">
                        <div className="flex justify-between gap-2">
                          <span
                            className="text-[var(--c-muted)]"
                            title="Phí nền tảng tính trên phần giá gốc dịch vụ"
                          >
                            HH / Giá gốc
                          </span>
                          <span className="font-semibold text-red-500">
                            {fmtPrice(payment.basePlatformFee)}
                          </span>
                        </div>
                        {payment.surchargeAmount > 0 && (
                          <div className="flex justify-between gap-2">
                            <span
                              className="text-[var(--c-muted)]"
                              title={`Phí nền tảng tính trên phần phụ thu (${fmtPrice(payment.surchargeAmount)})`}
                            >
                              HH / Phụ thu
                            </span>
                            <span className="font-semibold text-red-500">
                              {fmtPrice(payment.surchargePlatformFee)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Row 3: Customer + Address */}
                <div
                  className={
                    activeTab === "overview"
                      ? "rounded-xl border border-[var(--c-line)] bg-[var(--c-card-2)] p-4"
                      : "hidden"
                  }
                >
                  <h3 className="font-bold text-sm flex items-center gap-2 pb-2 border-b border-[var(--c-line)] mb-3">
                    <User className="w-4 h-4 text-blue-500" /> Khách Hàng & Địa
                    Chỉ
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <span className="text-xs text-[var(--c-muted)] block mb-0.5">
                        Họ tên
                      </span>
                      {booking.customer ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (booking.customer?.id) {
                              window.open(
                                `/admin/customers/${booking.customer.id}`,
                                "_blank",
                              );
                            }
                          }}
                          className="inline-flex items-center gap-1 font-semibold text-sm text-[var(--c-ink)] hover:text-blue-600 hover:underline cursor-pointer group"
                          title="Mở chi tiết khách hàng trong tab mới"
                        >
                          {booking.customer.fullName}
                          <ExternalLink className="w-3 h-3 text-[var(--c-primary-soft)] group-hover:text-blue-600" />
                        </button>
                      ) : (
                        <span className="font-semibold text-sm">N/A</span>
                      )}
                    </div>
                    <div>
                      <span className="text-xs text-[var(--c-muted)] block mb-0.5">
                        Số điện thoại
                      </span>
                      <span className="font-semibold text-sm">
                        {booking.customer?.phone ?? "N/A"}
                      </span>
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-xs text-[var(--c-muted)] mb-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Địa chỉ làm việc
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm bg-[var(--c-card)] p-2 rounded border border-[var(--c-line)] flex-1 min-w-0">
                          {booking.address?.fullAddress ?? "N/A"}
                        </span>
                        {booking.address?.hasPet && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg shrink-0">
                            <PawPrint className="w-3 h-3" /> Có thú cưng
                          </span>
                        )}
                      </div>
                    </div>
                    {booking.note && (
                      <div className="md:col-span-2">
                        <span className="text-xs text-[var(--c-muted)] mb-0.5 flex items-center gap-1">
                          <FileText className="w-3 h-3" /> Ghi chú
                        </span>
                        <p
                          className="text-sm p-2 rounded border mt-1"
                          style={{
                            background: "rgba(217,119,6,0.1)",
                            color: "#D97706",
                            borderColor: "rgba(217,119,6,0.3)",
                          }}
                        >
                          {booking.note}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Row 4: Tasker */}
                <div
                  className={
                    activeTab === "overview"
                      ? "rounded-xl border border-[var(--c-line)] bg-[var(--c-card-2)] p-4"
                      : "hidden"
                  }
                >
                  <h3 className="font-bold text-sm flex items-center gap-2 pb-2 border-b border-[var(--c-line)] mb-3">
                    <User className="w-4 h-4 text-emerald-500" /> Nhân Viên
                    (Tasker)
                  </h3>
                  {booking.tasker ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-xs text-[var(--c-muted)] block mb-0.5">
                          Họ tên
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (booking.tasker?.id) {
                              onOpenChange(false);
                              router.push(
                                `/admin/taskers/${booking.tasker.id}`,
                              );
                            }
                          }}
                          className="inline-flex items-center gap-1 font-semibold text-sm text-[var(--c-ink)] hover:text-blue-600 hover:underline cursor-pointer group"
                          title="Xem chi tiết nhân viên"
                        >
                          {booking.tasker.fullName}
                          <ExternalLink className="w-3 h-3 text-[var(--c-primary-soft)] group-hover:text-blue-600" />
                        </button>
                      </div>
                      <div>
                        <span className="text-xs text-[var(--c-muted)] block mb-0.5">
                          Số điện thoại
                        </span>
                        <span className="font-semibold text-sm">
                          {booking.tasker.phone ?? "N/A"}
                        </span>
                      </div>
                      {booking.tasker.ratingAvg !== undefined && (
                        <div>
                          <span className="text-xs text-[var(--c-muted)] block mb-0.5">
                            Đánh giá
                          </span>
                          <span className="font-semibold text-sm text-amber-500">
                            ★ {booking.tasker.ratingAvg.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--c-muted)] italic text-center py-2">
                      Chưa có nhân viên nhận đơn này.
                    </p>
                  )}
                </div>

                <div
                  className={
                    activeTab === "overview"
                      ? "rounded-xl border border-[var(--c-line)] bg-[var(--c-card-2)] p-4"
                      : "hidden"
                  }
                >
                  <h3 className="mb-3 flex items-center gap-2 border-b border-[var(--c-line)] pb-2 text-sm font-bold">
                    <Banknote className="size-4 text-[var(--c-primary-strong)]" />
                    Thanh toán
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="block text-xs text-[var(--c-muted)]">
                        Tổng thanh toán
                      </span>
                      <strong className="text-lg text-[var(--c-primary-strong)]">
                        {fmtPrice(payment?.totalPrice ?? price?.totalPrice ?? 0)}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-[var(--c-muted)]">
                        Trạng thái
                      </span>
                      <StatusBadge tone={paymentStatusMeta.tone}>
                        {paymentStatusMeta.label}
                      </StatusBadge>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("payment")}
                    className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[var(--c-primary-strong)] hover:underline"
                  >
                    Xem chi tiết thanh toán <ArrowRight className="size-3.5" />
                  </button>
                </div>

                <div
                  className={
                    activeTab === "overview"
                      ? "rounded-xl border border-[var(--c-line)] bg-[var(--c-card-2)] p-4"
                      : "hidden"
                  }
                >
                  <h3 className="mb-3 flex items-center gap-2 border-b border-[var(--c-line)] pb-2 text-sm font-bold">
                    <Clock className="size-4 text-[var(--c-primary-strong)]" />
                    Tiến độ ca làm
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-[var(--c-muted)]">
                        Trạng thái hiện tại
                      </span>
                      <StatusBadge tone={statusMeta.tone}>
                        {statusMeta.label}
                      </StatusBadge>
                    </div>
                    <div>
                      <span className="block text-xs text-[var(--c-muted)]">
                        Check-in
                      </span>
                      <strong>{fmtDateTime(workTiming?.checkedInAt)}</strong>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveTab(
                        workTiming?.checkedInAt || status === "TASKER_ON_THE_WAY"
                          ? "checkin"
                          : "work",
                      )
                    }
                    className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[var(--c-primary-strong)] hover:underline"
                  >
                    Xem chi tiết ca làm <ArrowRight className="size-3.5" />
                  </button>
                </div>
              </div>

              <div
                className={
                  activeTab === "checkin" ||
                  activeTab === "work" ||
                  activeTab === "history"
                    ? "min-w-0 space-y-3"
                    : "hidden"
                }
              >
                {activeTab === "work" && (
                  <div className="rounded-xl border border-[var(--c-line)] bg-[var(--c-card-2)] p-4">
                    <h3 className="mb-3 flex items-center gap-2 border-b border-[var(--c-line)] pb-2 text-sm font-bold">
                      <Clock className="size-4 text-[var(--c-primary-strong)]" />
                      Tiến độ ca làm
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                      <div>
                        <span className="block text-xs text-[var(--c-muted)]">
                          Nhận đơn
                        </span>
                        <strong>{fmtDateTime(operation?.acceptedAt)}</strong>
                      </div>
                      <div>
                        <span className="block text-xs text-[var(--c-muted)]">
                          Check-in
                        </span>
                        <strong>{fmtDateTime(workTiming?.checkedInAt)}</strong>
                      </div>
                      <div>
                        <span className="block text-xs text-[var(--c-muted)]">
                          Check-out
                        </span>
                        <strong>{fmtDateTime(workTiming?.checkedOutAt)}</strong>
                      </div>
                      <div>
                        <span className="block text-xs text-[var(--c-muted)]">
                          Hoàn thành
                        </span>
                        <strong>{fmtDateTime(operation?.completedAt)}</strong>
                      </div>
                    </div>
                    {workTiming &&
                      (workTiming.surchargeFee > 0 ||
                        workTiming.overtimeMinutes > 0 ||
                        workTiming.earlyMinutes > 0) && (
                        <div className="mt-3 grid gap-2 border-t border-[var(--c-line)] pt-3 text-xs sm:grid-cols-3">
                          <span>
                            Phát sinh:{" "}
                            <strong>{fmtPrice(workTiming.surchargeFee)}</strong>
                          </span>
                          <span>
                            Làm thêm:{" "}
                            <strong>{workTiming.overtimeMinutes} phút</strong>
                          </span>
                          <span>
                            Kết thúc sớm:{" "}
                            <strong>{workTiming.earlyMinutes} phút</strong>
                          </span>
                        </div>
                      )}
                    {workTiming?.surchargeStatus &&
                      workTiming.surchargeStatus !== "NONE" && (
                        <p className="mt-3 rounded-lg border border-[var(--c-line)] bg-[var(--c-card)] px-3 py-2 text-xs text-[var(--c-muted)]">
                          Trạng thái phần phát sinh:{" "}
                          <strong className="text-[var(--c-ink)]">
                            {workTiming.surchargeStatus}
                          </strong>
                        </p>
                      )}
                  </div>
                )}

                {activeTab === "checkin" &&
                  (workTiming?.checkedInAt ||
                    status === "TASKER_ON_THE_WAY") && (
                    <div className="rounded-xl border border-[var(--c-line)] bg-[var(--c-card-2)] p-3">
                      <h3 className="mb-3 flex items-center gap-2 border-b border-[var(--c-line)] pb-2 text-sm font-bold">
                        <Navigation className="size-4 text-amber-500" /> Xác
                        minh check-in
                      </h3>

                      {workTiming?.checkedInAt ? (
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs text-[var(--c-muted)]">
                              {fmtDateTime(workTiming.checkedInAt)}
                            </span>
                            <StatusBadge
                              tone={
                                (
                                  CHECKIN_REVIEW_META[
                                    workTiming.checkinReviewStatus
                                  ] ?? { tone: "neutral" }
                                ).tone as BadgeTone
                              }
                            >
                              {CHECKIN_REVIEW_META[
                                workTiming.checkinReviewStatus
                              ]?.label ?? workTiming.checkinReviewStatus}
                            </StatusBadge>
                          </div>

                          <div className="grid grid-cols-2 gap-2 rounded-lg border border-[var(--c-line)] bg-[var(--c-card)] p-2 text-xs">
                            <div>
                              <span className="block text-[var(--c-muted)]">
                                Khoảng cách
                              </span>
                              <strong>
                                {workTiming.checkinDistanceMeters != null
                                  ? `${Math.round(workTiming.checkinDistanceMeters)} m`
                                  : "Không đo được"}
                              </strong>
                            </div>
                            <div>
                              <span className="block text-[var(--c-muted)]">
                                Độ chính xác GPS
                              </span>
                              <strong>
                                {workTiming.checkinAccuracyMeters != null
                                  ? `${Math.round(workTiming.checkinAccuracyMeters)} m`
                                  : "—"}
                              </strong>
                            </div>
                            <div className="col-span-2">
                              <span className="block text-[var(--c-muted)]">
                                Nguồn xác minh
                              </span>
                              <strong>
                                {workTiming.checkinVerificationSource
                                  ? (CHECKIN_SOURCE_LABEL[
                                      workTiming.checkinVerificationSource
                                    ] ?? workTiming.checkinVerificationSource)
                                  : "—"}
                              </strong>
                            </div>
                            <div>
                              <span className="block text-[var(--c-muted)]">
                                GPS Tasker
                              </span>
                              <strong className="break-all">
                                {workTiming.checkinLatitude != null &&
                                workTiming.checkinLongitude != null
                                  ? `${workTiming.checkinLatitude.toFixed(6)}, ${workTiming.checkinLongitude.toFixed(6)}`
                                  : "—"}
                              </strong>
                            </div>
                            <div>
                              <span className="block text-[var(--c-muted)]">
                                Tọa độ đích
                              </span>
                              <strong className="break-all">
                                {workTiming.checkinTargetLatitude != null &&
                                workTiming.checkinTargetLongitude != null
                                  ? `${workTiming.checkinTargetLatitude.toFixed(6)}, ${workTiming.checkinTargetLongitude.toFixed(6)}`
                                  : "—"}
                              </strong>
                            </div>
                          </div>

                          {workTiming.checkinProofPhotoUrl && (
                            <button
                              type="button"
                              onClick={() => setIsCheckinProofOpen(true)}
                              className="group relative block w-full overflow-hidden rounded-xl border border-[var(--c-line)] text-left"
                              aria-label="Mở ảnh minh chứng check-in"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={workTiming.checkinProofPhotoUrl}
                                alt="Ảnh minh chứng check-in"
                                className="max-h-56 w-full object-cover"
                              />
                              <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-[10px] font-semibold text-white">
                                <Camera className="size-3" /> Xem ảnh
                              </span>
                            </button>
                          )}

                          {workTiming.checkinLatitude != null &&
                            workTiming.checkinLongitude != null && (
                              <button
                                type="button"
                                onClick={() => setIsCheckinLocationOpen(true)}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--c-line)] bg-[var(--c-card)] px-3 py-2 text-xs font-semibold text-[var(--c-ink)] transition-colors hover:bg-[var(--c-card-2)]"
                              >
                                <MapPin className="size-3.5 text-[var(--c-primary-strong)]" />
                                Xem vị trí đối chiếu
                              </button>
                            )}

                          {workTiming.checkinReviewStatus ===
                            "PENDING_REVIEW" && (
                            <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3">
                              <div className="grid grid-cols-3 gap-1.5">
                                {[
                                  ["APPROVE", "Chấp nhận"],
                                  ["REJECT", "Vi phạm"],
                                  ["MARK_NOT_VERIFIABLE", "Không xác minh"],
                                ].map(([value, label]) => (
                                  <button
                                    key={value}
                                    type="button"
                                    onClick={() => {
                                      setReviewDecision(
                                        value as typeof reviewDecision,
                                      );
                                      if (value !== "REJECT")
                                        setOpenIncident(false);
                                    }}
                                    className={`rounded-lg border px-2 py-2 text-[11px] font-semibold transition-colors ${
                                      reviewDecision === value
                                        ? "border-amber-500 bg-amber-500 text-white"
                                        : "border-amber-200 bg-white text-amber-800"
                                    }`}
                                  >
                                    {label}
                                  </button>
                                ))}
                              </div>
                              <Textarea
                                value={reviewReason}
                                onChange={(event) =>
                                  setReviewReason(event.target.value)
                                }
                                maxLength={1000}
                                placeholder="Ghi rõ căn cứ review..."
                                className="min-h-20 bg-white text-sm"
                              />
                              {reviewDecision === "REJECT" && (
                                <div className="space-y-2 rounded-lg border border-red-200 bg-white p-2">
                                  <label className="flex items-start gap-2 text-xs">
                                    <input
                                      type="checkbox"
                                      checked={openIncident}
                                      disabled={
                                        !booking.customer?.id ||
                                        !booking.tasker?.id
                                      }
                                      onChange={(event) =>
                                        setOpenIncident(event.target.checked)
                                      }
                                      className="mt-0.5"
                                    />
                                    <span>
                                      Mở Incident để xác minh trách nhiệm và bồi
                                      thường
                                      {(!booking.customer?.id ||
                                        !booking.tasker?.id) &&
                                        " (booking thiếu customer/tasker)"}
                                    </span>
                                  </label>
                                  {openIncident && (
                                    <Input
                                      type="number"
                                      min={1}
                                      max={20000000}
                                      step={1000}
                                      value={claimedAmount}
                                      onChange={(event) =>
                                        setClaimedAmount(event.target.value)
                                      }
                                      placeholder="Số tiền yêu cầu ban đầu (VND)"
                                      className="bg-white"
                                    />
                                  )}
                                  <p className="text-[10px] leading-relaxed text-red-700">
                                    Số tiền này chưa được chi ngay. Incident vẫn
                                    phải qua xác minh, phân trách nhiệm và phê
                                    duyệt.
                                  </p>
                                </div>
                              )}
                              <AdminButton
                                variant={
                                  reviewDecision === "REJECT"
                                    ? "danger"
                                    : "primary"
                                }
                                onClick={handleReviewCheckin}
                                disabled={reviewMutation.isPending}
                                className="w-full justify-center"
                              >
                                {reviewMutation.isPending && (
                                  <Loader2 className="mr-1 size-4 animate-spin" />
                                )}
                                Lưu kết quả review
                              </AdminButton>
                            </div>
                          )}

                          {workTiming.checkinReviewStatus !==
                            "PENDING_REVIEW" &&
                            workTiming.checkinReviewReason && (
                              <div className="rounded-lg border border-[var(--c-line)] bg-[var(--c-card)] p-2 text-xs">
                                <p className="font-semibold">
                                  {workTiming.checkinReviewedByAdmin
                                    ?.fullName ?? "Admin"}{" "}
                                  · {fmtDateTime(workTiming.checkinReviewedAt)}
                                </p>
                                <p className="mt-1 text-[var(--c-muted)]">
                                  {workTiming.checkinReviewReason}
                                </p>
                              </div>
                            )}

                          {workTiming.checkinReviewStatus === "REJECTED" &&
                            !workTiming.checkinIncident &&
                            booking.customer?.id &&
                            booking.tasker?.id && (
                              <div className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-3">
                                <p className="text-xs font-semibold text-red-800">
                                  Chưa mở hồ sơ bồi thường
                                </p>
                                <Input
                                  type="number"
                                  min={1}
                                  max={20000000}
                                  step={1000}
                                  value={claimedAmount}
                                  onChange={(event) =>
                                    setClaimedAmount(event.target.value)
                                  }
                                  placeholder="Số tiền yêu cầu ban đầu (VND)"
                                  className="bg-white"
                                />
                                <AdminButton
                                  variant="danger"
                                  onClick={handleOpenIncidentAfterReview}
                                  disabled={reviewMutation.isPending}
                                  className="w-full justify-center"
                                >
                                  {reviewMutation.isPending
                                    ? "Đang mở hồ sơ..."
                                    : "Mở Incident xử lý bồi thường"}
                                </AdminButton>
                              </div>
                            )}

                          {workTiming.checkinIncident && (
                            <a
                              href={`/admin/incidents?incidentId=${workTiming.checkinIncident.id}`}
                              className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
                            >
                              <span>
                                Incident{" "}
                                {workTiming.checkinIncident.incidentCode ??
                                  "đang xử lý"}
                              </span>
                              <ExternalLink className="size-3.5" />
                            </a>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                          <div className="flex items-start gap-2 text-xs text-amber-800">
                            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                            <p>
                              Chỉ override khi đã xác minh Tasker thực sự có
                              mặt. Hệ thống sẽ ghi rõ đây là xác nhận thủ công,
                              không tạo GPS giả.
                            </p>
                          </div>
                          <Textarea
                            value={overrideReason}
                            onChange={(event) =>
                              setOverrideReason(event.target.value)
                            }
                            maxLength={1000}
                            placeholder="Căn cứ override (ví dụ customer xác nhận qua điện thoại)..."
                            className="min-h-20 bg-white text-sm"
                          />
                          <AdminButton
                            variant="secondary"
                            onClick={handleOverrideCheckin}
                            disabled={overrideMutation.isPending}
                            className="w-full justify-center"
                            icon={<Camera className="size-4" />}
                          >
                            {overrideMutation.isPending
                              ? "Đang xác nhận..."
                              : "Xác nhận check-in thủ công"}
                          </AdminButton>
                        </div>
                      )}
                    </div>
                  )}

                {activeTab === "checkin" &&
                  !workTiming?.checkedInAt &&
                  status !== "TASKER_ON_THE_WAY" && (
                    <div className="rounded-xl border border-dashed border-[var(--c-line-strong)] bg-[var(--c-card-2)] px-5 py-10 text-center">
                      <Navigation className="mx-auto size-7 text-[var(--c-muted)]" />
                      <p className="mt-3 text-sm font-semibold">
                        Chưa có dữ liệu check-in
                      </p>
                      <p className="mt-1 text-xs text-[var(--c-muted)]">
                        Thông tin vị trí và ảnh xác minh sẽ xuất hiện sau khi
                        nhân viên check-in.
                      </p>
                    </div>
                  )}

                {activeTab === "checkin" &&
                  !workTiming?.checkedInAt &&
                  status !== "TASKER_ON_THE_WAY" && (
                    <div className="rounded-xl border border-dashed border-[var(--c-line-strong)] bg-[var(--c-card-2)] px-5 py-10 text-center">
                      <Navigation className="mx-auto size-7 text-[var(--c-muted)]" />
                      <p className="mt-3 text-sm font-semibold">
                        Chưa có dữ liệu check-in
                      </p>
                      <p className="mt-1 text-xs text-[var(--c-muted)]">
                        Thông tin vị trí và ảnh xác minh sẽ xuất hiện sau khi
                        nhân viên check-in.
                      </p>
                    </div>
                  )}

                {activeTab === "work" &&
                  noShow &&
                  noShow.reviewStatus !== "NONE" && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3">
                      <h3 className="mb-3 flex items-center gap-2 border-b border-amber-200 pb-2 text-sm font-bold text-amber-900">
                        <UserX className="size-4" /> Review Tasker no-show
                      </h3>

                      <div className="grid grid-cols-2 gap-2 rounded-lg border border-amber-200 bg-white p-2 text-xs">
                        <div>
                          <span className="block text-[var(--c-muted)]">
                            Phát hiện lúc
                          </span>
                          <strong>{fmtDateTime(noShow.detectedAt)}</strong>
                        </div>
                        <div>
                          <span className="block text-[var(--c-muted)]">
                            Đã hoàn customer
                          </span>
                          <strong className="text-emerald-700">
                            {fmtPrice(noShow.refundAmount ?? 0)}
                          </strong>
                        </div>
                      </div>

                      <div className="mt-2 rounded-lg border border-amber-200 bg-white p-2 text-xs">
                        <p className="font-semibold text-amber-900">
                          Giải trình Tasker
                        </p>
                        <p className="mt-1 whitespace-pre-wrap leading-relaxed text-[var(--c-muted)]">
                          {noShow.explanation || "Tasker chưa gửi giải trình."}
                        </p>
                        {noShow.explanationSubmittedAt && (
                          <p className="mt-1 text-[10px] text-[var(--c-muted)]">
                            Cập nhật{" "}
                            {fmtDateTime(noShow.explanationSubmittedAt)}
                          </p>
                        )}
                      </div>

                      {noShow.reviewStatus === "PENDING_REVIEW" ? (
                        <div className="mt-3 space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              ["CONFIRM_NO_SHOW", "Xác nhận vi phạm"],
                              ["EXCUSE_TASKER", "Miễn trách nhiệm"],
                            ].map(([value, label]) => (
                              <button
                                key={value}
                                type="button"
                                onClick={() => {
                                  setNoShowDecision(
                                    value as typeof noShowDecision,
                                  );
                                  if (value === "EXCUSE_TASKER") {
                                    setOpenNoShowIncident(false);
                                  }
                                }}
                                className={`rounded-lg border px-2 py-2 text-xs font-semibold ${
                                  noShowDecision === value
                                    ? value === "CONFIRM_NO_SHOW"
                                      ? "border-red-500 bg-red-500 text-white"
                                      : "border-emerald-500 bg-emerald-500 text-white"
                                    : "border-amber-200 bg-white text-amber-900"
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                          <Textarea
                            value={noShowReason}
                            onChange={(event) =>
                              setNoShowReason(event.target.value)
                            }
                            maxLength={1000}
                            placeholder="Căn cứ kết luận (lịch sử cuộc gọi, bằng chứng bất khả kháng...)"
                            className="min-h-20 bg-white text-sm"
                          />
                          {noShowDecision === "CONFIRM_NO_SHOW" && (
                            <div className="space-y-2 rounded-lg border border-red-200 bg-white p-2">
                              <label className="flex items-start gap-2 text-xs">
                                <input
                                  type="checkbox"
                                  checked={openNoShowIncident}
                                  disabled={
                                    !booking.customer?.id || !booking.tasker?.id
                                  }
                                  onChange={(event) =>
                                    setOpenNoShowIncident(event.target.checked)
                                  }
                                  className="mt-0.5"
                                />
                                <span>
                                  Mở Incident để xem xét bồi thường bổ sung
                                </span>
                              </label>
                              {openNoShowIncident && (
                                <Input
                                  type="number"
                                  min={1}
                                  max={20000000}
                                  step={1000}
                                  value={noShowClaimedAmount}
                                  onChange={(event) =>
                                    setNoShowClaimedAmount(event.target.value)
                                  }
                                  placeholder="Số tiền yêu cầu ban đầu (VND)"
                                />
                              )}
                            </div>
                          )}
                          <AdminButton
                            variant={
                              noShowDecision === "CONFIRM_NO_SHOW"
                                ? "danger"
                                : "primary"
                            }
                            onClick={handleReviewNoShow}
                            disabled={noShowReviewMutation.isPending}
                            className="w-full justify-center"
                          >
                            {noShowReviewMutation.isPending && (
                              <Loader2 className="mr-1 size-4 animate-spin" />
                            )}
                            Lưu kết luận no-show
                          </AdminButton>
                        </div>
                      ) : (
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <StatusBadge
                              tone={
                                noShow.reviewStatus === "CONFIRMED"
                                  ? "danger"
                                  : "success"
                              }
                            >
                              {noShow.reviewStatus === "CONFIRMED"
                                ? `Đã xác nhận vi phạm · +${noShow.warningPoints ?? 0} điểm`
                                : "Đã miễn trách nhiệm · không phạt"}
                            </StatusBadge>
                            <span className="text-[10px] text-[var(--c-muted)]">
                              {fmtDateTime(noShow.reviewedAt)}
                            </span>
                          </div>
                          <p className="rounded-lg border border-amber-200 bg-white p-2 text-xs leading-relaxed">
                            {noShow.reviewReason}
                          </p>
                          {noShow.reviewStatus === "CONFIRMED" &&
                            !noShow.incident &&
                            booking.customer?.id &&
                            booking.tasker?.id && (
                              <div className="space-y-2">
                                <Input
                                  type="number"
                                  min={1}
                                  max={20000000}
                                  step={1000}
                                  value={noShowClaimedAmount}
                                  onChange={(event) =>
                                    setNoShowClaimedAmount(event.target.value)
                                  }
                                  placeholder="Số tiền yêu cầu ban đầu (VND)"
                                  className="bg-white"
                                />
                                <AdminButton
                                  variant="danger"
                                  onClick={handleOpenNoShowIncidentAfterReview}
                                  disabled={noShowReviewMutation.isPending}
                                  className="w-full justify-center"
                                >
                                  Mở Incident bồi thường
                                </AdminButton>
                              </div>
                            )}
                          {noShow.incident && (
                            <a
                              href={`/admin/incidents?incidentId=${noShow.incident.id}`}
                              className="flex items-center justify-between rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700"
                            >
                              <span>
                                Incident{" "}
                                {noShow.incident.incidentCode ?? "đang xử lý"}
                              </span>
                              <ExternalLink className="size-3.5" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                {/* Row 5: Timeline */}
                {activeTab === "history" &&
                  operation &&
                  operation.timeline.length > 0 && (
                    <div className="bg-[var(--c-card-2)] rounded-xl p-3 border border-[var(--c-line)]">
                      <h3 className="font-bold text-sm flex items-center gap-2 pb-1.5 border-b border-[var(--c-line)] mb-1">
                        <TrendingUp className="w-4 h-4 text-purple-500" /> Lịch
                        Sử Trạng Thái
                      </h3>
                      <div className="pl-1">
                        {operation.timeline.map((entry) => (
                          <TimelineRow
                            key={entry.id}
                            entry={entry}
                            onNavigate={(url) => {
                              onOpenChange(false);
                              router.push(url);
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                {activeTab === "history" &&
                  (!operation || operation.timeline.length === 0) && (
                    <div className="rounded-xl border border-dashed border-[var(--c-line-strong)] bg-[var(--c-card-2)] px-5 py-10 text-center">
                      <TrendingUp className="mx-auto size-7 text-[var(--c-muted)]" />
                      <p className="mt-3 text-sm font-semibold">
                        Chưa có lịch sử trạng thái
                      </p>
                      <p className="mt-1 text-xs text-[var(--c-muted)]">
                        Các thay đổi trạng thái của đơn sẽ được ghi lại tại đây.
                      </p>
                    </div>
                  )}
              </div>
            </div>
          </TabsContent>

          <div className="mt-3 shrink-0 border-t border-[var(--c-line)] pt-3">
            {isClosed ? (
              <p className="text-sm italic text-[var(--c-muted)]">
                Đơn hàng ở trạng thái <strong>{statusMeta.label}</strong> —
                không thể thực hiện thêm thao tác.
              </p>
            ) : confirmCancel ? (
              <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-3">
                <p className="text-sm font-semibold text-red-700">
                  Xác nhận hủy đơn{" "}
                  <span className="font-mono">{booking.bookingCode}</span>?
                </p>
                <p className="text-xs text-red-700">
                  Thao tác này không thể hoàn tác. Khách hàng sẽ nhận được thông
                  báo.
                </p>
                <div className="flex gap-2">
                  <AdminButton
                    variant="secondary"
                    onClick={() => setConfirmCancel(false)}
                    className="flex-1"
                  >
                    Quay lại
                  </AdminButton>
                  <AdminButton
                    variant="danger"
                    onClick={handleCancel}
                    disabled={cancelMutation.isPending}
                    className="flex-1"
                    icon={<XCircle className="w-4 h-4" />}
                  >
                    {cancelMutation.isPending ? "Đang hủy..." : "Xác nhận hủy"}
                  </AdminButton>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {status === "IN_PROGRESS" && hasPendingSurcharge && (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                    Đơn đang chờ xác nhận phần phát sinh. Admin chỉ được hoàn
                    thành sau khi phụ phí được thu, miễn hoặc chuyển tranh chấp.
                  </p>
                )}
                <div className="flex flex-wrap justify-end gap-2">
                  {status === "IN_PROGRESS" && (
                    <AdminButton
                      variant="primary"
                      onClick={() => setIsChangeStatusOpen(true)}
                      disabled={hasPendingSurcharge}
                      icon={<CheckCircle2 className="w-4 h-4" />}
                    >
                      Xác nhận hoàn thành
                    </AdminButton>
                  )}
                  <AdminButton
                    variant="danger"
                    onClick={() => setConfirmCancel(true)}
                    icon={<XCircle className="w-4 h-4" />}
                  >
                    Hủy đơn
                  </AdminButton>
                </div>
              </div>
            )}
          </div>
        </Tabs>
      </DialogContent>

      <CheckinProofDialog
        open={isCheckinProofOpen}
        onOpenChange={setIsCheckinProofOpen}
        bookingCode={booking.bookingCode}
        photoUrl={workTiming?.checkinProofPhotoUrl}
      />
      <CheckinLocationDialog
        open={isCheckinLocationOpen}
        onOpenChange={setIsCheckinLocationOpen}
        bookingCode={booking.bookingCode}
        address={booking.address?.fullAddress}
        checkedInAt={workTiming?.checkedInAt}
        checkinLatitude={workTiming?.checkinLatitude}
        checkinLongitude={workTiming?.checkinLongitude}
        targetLatitude={workTiming?.checkinTargetLatitude}
        targetLongitude={workTiming?.checkinTargetLongitude}
        distanceMeters={workTiming?.checkinDistanceMeters}
        accuracyMeters={workTiming?.checkinAccuracyMeters}
      />

      <AssignTaskerDialog
        bookingId={booking.id}
        open={isAssignOpen}
        onOpenChange={setIsAssignOpen}
        currentTaskerId={booking.tasker?.id}
      />
      <ChangeBookingStatusDialog
        bookingId={booking.id}
        currentStatus={booking.status}
        open={isChangeStatusOpen}
        onOpenChange={setIsChangeStatusOpen}
        onSuccess={() => onOpenChange(false)}
      />
    </Dialog>
  );
};
