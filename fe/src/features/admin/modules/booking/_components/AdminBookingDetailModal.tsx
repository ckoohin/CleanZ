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
} from "lucide-react";
import { AdminButton, StatusBadge, BadgeTone } from "@/components/admin";
import { toast } from "sonner";
import { useCancelAdminBooking } from "@/features/admin/modules/booking/hooks/useAdminBooking";
import { AssignTaskerDialog } from "@/features/admin/modules/booking/_components/AssignTaskerDialog";
import { ChangeBookingStatusDialog } from "@/features/admin/modules/booking/_components/ChangeBookingStatusDialog";
import { AdminBookingDetail, AdminBookingTimelineEntry } from "@/features/admin/modules/booking/types/booking.types";
import { getApiErrorMessage } from "@/lib/api/error-message";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: AdminBookingDetail | null;
}

const STATUS_MAP: Record<string, { label: string; tone: BadgeTone }> = {
  POSTED:            { label: "Đang tìm kiếm nhân viên",   tone: "warning" },
  PENDING_CUSTOMER_CONFIRMATION: { label: "Chờ khách xác nhận", tone: "warning" },
  CONFIRMED:         { label: "Đã nhận đơn",     tone: "info" },
  TASKER_ON_THE_WAY: { label: "Nhân viên đang đến",   tone: "info" },
  CHECKED_IN:        { label: "Đã đến nơi",      tone: "info" },
  IN_PROGRESS:       { label: "Đang thực hiện",  tone: "purple" },
  COMPLETED:         { label: "Hoàn thành",      tone: "success" },
  CANCELLED:         { label: "Đã hủy",          tone: "danger" },
  EXPIRED:           { label: "Đã hết hạn",      tone: "neutral" },
};

function fmtPrice(n: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);
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

  if (paymentStatus === "PAID") return { label: "Đã thanh toán", tone: "success" };
  if (paymentStatus === "FAILED") return { label: "Thanh toán thất bại", tone: "danger" };
  if (paymentStatus === "REFUNDED") return { label: "Đã hoàn tiền", tone: "info" };
  if (paymentStatus === "PARTIALLY_REFUNDED") return { label: "Hoàn tiền một phần", tone: "info" };

  return { label: paymentStatus ?? "—", tone: "warning" };
}

function PriceRow({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  if (value === 0) return null;
  return (
    <div className={`flex justify-between text-sm ${highlight ? "border-t border-[var(--c-line)] pt-2 mt-1" : ""}`}>
      <span className="text-[var(--c-muted)]">{label}</span>
      <span className={`font-semibold ${highlight ? "text-[var(--c-primary-strong)] text-base" : "text-[var(--c-ink)]"}`}>
        {fmtPrice(value)}
      </span>
    </div>
  );
}

function TimelineRow({ entry }: { entry: AdminBookingTimelineEntry }) {
  const meta = STATUS_MAP[entry.newStatus] ?? { label: entry.newStatus, tone: "neutral" as BadgeTone };
  return (
    <div className="flex items-start gap-3 py-1">
      <div className="mt-1 w-2 h-2 rounded-full bg-[var(--c-primary-strong)] shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {entry.oldStatus && (
            <>
              <StatusBadge tone={(STATUS_MAP[entry.oldStatus]?.tone ?? "neutral") as BadgeTone} className="text-[10px]">
                {STATUS_MAP[entry.oldStatus]?.label ?? entry.oldStatus}
              </StatusBadge>
              <ArrowRight className="w-3 h-3 text-[var(--c-muted)]" />
            </>
          )}
          <StatusBadge tone={meta.tone} className="text-[10px]">{meta.label}</StatusBadge>
        </div>
        {entry.note && <p className="text-xs text-[var(--c-muted)] mt-0.5 truncate">{entry.note}</p>}
        {entry.cancelReason && <p className="text-xs text-red-500 mt-0.5">Lý do: {entry.cancelReason}</p>}
        <p className="text-[10px] text-[var(--c-muted)] mt-0.5">
          {fmtDateTime(entry.createdAt)}
          {entry.changedBy && ` · ${entry.changedBy.fullName}`}
        </p>
      </div>
    </div>
  );
}

export const AdminBookingDetailModal: React.FC<Props> = ({ open, onOpenChange, booking }) => {
  const cancelMutation = useCancelAdminBooking();
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isChangeStatusOpen, setIsChangeStatusOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  if (!booking) return null;

  const status = booking.status ?? "";
  const statusMeta = STATUS_MAP[status] ?? { label: status, tone: "neutral" as BadgeTone };

  const schedule = booking.schedule;
  const price = booking.price;
  const operation = booking.operation;
  const payment = booking.payment;
  const paymentStatusMeta = getPaymentStatusMeta(status, payment?.status);
  const isClosed = status === "COMPLETED" || status === "CANCELLED" || status === "EXPIRED";
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
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="cz-admin flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] flex-col overflow-hidden bg-[var(--c-card)] text-[var(--c-ink)] !max-w-6xl border-[var(--c-line)] sm:max-h-[calc(100dvh-3rem)] sm:!max-w-6xl">
        <DialogHeader className="shrink-0 pr-8">
          <DialogTitle className="flex flex-wrap items-center gap-3 text-xl text-[var(--c-ink)]">
            Chi Tiết Đơn Hàng
            <span className="font-mono text-base text-[var(--c-primary-strong)] bg-[var(--c-primary-soft)] px-3 py-1 rounded-full">
              {booking.bookingCode}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-2 grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
          <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">

          {/* Row 1: Status + Schedule */}
          <div className="contents">

            {/* Status & Payment */}
            <div className="bg-[var(--c-card-2)] rounded-xl p-4 border border-[var(--c-line)] space-y-3">
              <h3 className="font-bold text-sm flex items-center gap-2 pb-2 border-b border-[var(--c-line)]">
                <ShieldCheck className="w-4 h-4 text-[var(--c-primary-strong)]" /> Trạng thái & Thanh toán
              </h3>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--c-muted)]">Trạng thái đơn</span>
                <StatusBadge tone={statusMeta.tone}>{statusMeta.label}</StatusBadge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--c-muted)]">
                  Giá gốc {payment ? `(${fmtPrice(payment.baseAmount)})` : ""}
                </span>
                <StatusBadge tone="neutral">
                  {paymentMethodLabel(payment?.basePaymentMethod ?? payment?.method)}
                </StatusBadge>
              </div>
              {payment && payment.surchargeAmount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--c-muted)]">
                    Phụ thu ({fmtPrice(payment.surchargeAmount)})
                  </span>
                  <StatusBadge tone={payment.surchargePaymentMethod ? "warning" : "neutral"}>
                    {paymentMethodLabel(payment.surchargePaymentMethod)}
                  </StatusBadge>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--c-muted)]">Trạng thái TT</span>
                <StatusBadge tone={paymentStatusMeta.tone}>{paymentStatusMeta.label}</StatusBadge>
              </div>
              {payment?.voucher && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--c-muted)]">Voucher</span>
                  <span className="text-xs font-mono font-bold text-emerald-600">{payment.voucher.code}</span>
                </div>
              )}
            </div>

            {/* Schedule */}
            <div className="bg-[var(--c-card-2)] rounded-xl p-4 border border-[var(--c-line)] space-y-3">
              <h3 className="font-bold text-sm flex items-center gap-2 pb-2 border-b border-[var(--c-line)]">
                <Clock className="w-4 h-4 text-[var(--c-primary-strong)]" /> Lịch Hẹn
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-[var(--c-muted)] block mb-0.5">Ngày làm việc</span>
                  <span className="font-semibold text-sm">{schedule?.scheduledStartDate ?? "—"}</span>
                </div>
                <div>
                  <span className="text-xs text-[var(--c-muted)] block mb-0.5">Giờ bắt đầu</span>
                  <span className="font-semibold text-sm">{schedule?.scheduledStartTime ?? "—"}</span>
                </div>
                <div>
                  <span className="text-xs text-[var(--c-muted)] block mb-0.5">Thời lượng</span>
                  <span className="font-semibold text-sm">{schedule?.durationHours ?? "—"} giờ</span>
                </div>
                <div>
                  <span className="text-xs text-[var(--c-muted)] block mb-0.5">Dịch vụ</span>
                  <span className="font-semibold text-sm text-[var(--c-primary-strong)]">{booking.service?.name ?? "—"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Price breakdown */}
          {price && (
            <div className="bg-[var(--c-card-2)] rounded-xl p-4 border border-[var(--c-line)]">
              <h3 className="font-bold text-sm flex items-center gap-2 pb-2 border-b border-[var(--c-line)] mb-3">
                <Banknote className="w-4 h-4 text-[var(--c-primary-strong)]" /> Chi Tiết Giá
              </h3>
              <div className="space-y-1.5">
                <PriceRow label="Giá cơ bản" value={price.basePrice} />
                <PriceRow label="Dịch vụ thêm" value={price.addonPrice} />
                <PriceRow label="Phí cao điểm" value={price.peakFee} />
                <PriceRow label="Phí thú cưng" value={price.petFee} />
                <PriceRow label="Phụ phí" value={price.waitingFee} />
                {price.discountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--c-muted)]">Giảm giá voucher</span>
                    <span className="font-semibold text-emerald-600">-{fmtPrice(price.discountAmount)}</span>
                  </div>
                )}
                <PriceRow label="Tổng thanh toán" value={price.totalPrice} highlight />
              </div>
              {payment && payment.commissionRate !== null && (
                <div className="mt-3 pt-3 border-t border-[var(--c-line)] grid grid-cols-3 gap-2 text-center">
                  <div>
                    <span className="text-[10px] text-[var(--c-muted)] block">Hoa hồng tổng</span>
                    <span className="text-xs font-bold text-[var(--c-ink)]">
                      {payment.commissionRate}%{payment.isEstimated ? " *" : ""}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--c-muted)] block">Phí nền tảng</span>
                    <span className="text-xs font-bold text-red-500">
                      {payment.platformFee != null ? fmtPrice(payment.platformFee) : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--c-muted)] block">Tasker nhận</span>
                    <span className="text-xs font-bold text-emerald-600">
                      {payment.taskerIncome != null ? fmtPrice(payment.taskerIncome) : "—"}
                    </span>
                  </div>
                </div>
              )}
              {payment && payment.commissionRate !== null && (
                <div className="mt-2 grid grid-cols-2 gap-x-4 border-t border-[var(--c-line)] pt-2 text-[10px]">
                  <div className="flex justify-between gap-2">
                    <span className="text-[var(--c-muted)]">Phí giá gốc</span>
                    <span className="font-semibold text-red-500">{fmtPrice(payment.basePlatformFee)}</span>
                  </div>
                  {payment.surchargeAmount > 0 && (
                    <div className="flex justify-between gap-2">
                      <span className="text-[var(--c-muted)]">Phí phụ thu</span>
                      <span className="font-semibold text-red-500">{fmtPrice(payment.surchargePlatformFee)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Row 3: Customer + Address */}
          <div className="bg-[var(--c-card-2)] rounded-xl p-4 border border-[var(--c-line)]">
            <h3 className="font-bold text-sm flex items-center gap-2 pb-2 border-b border-[var(--c-line)] mb-3">
              <User className="w-4 h-4 text-blue-500" /> Khách Hàng & Địa Chỉ
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <span className="text-xs text-[var(--c-muted)] block mb-0.5">Họ tên</span>
                <span className="font-semibold text-sm">{booking.customer?.fullName ?? "N/A"}</span>
              </div>
              <div>
                <span className="text-xs text-[var(--c-muted)] block mb-0.5">Số điện thoại</span>
                <span className="font-semibold text-sm">{booking.customer?.phone ?? "N/A"}</span>
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
                  <p className="text-sm p-2 rounded border mt-1" style={{ background: "rgba(217,119,6,0.1)", color: "#D97706", borderColor: "rgba(217,119,6,0.3)" }}>
                    {booking.note}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Row 4: Tasker */}
          <div className="bg-[var(--c-card-2)] rounded-xl p-4 border border-[var(--c-line)] md:col-span-2">
            <h3 className="font-bold text-sm flex items-center gap-2 pb-2 border-b border-[var(--c-line)] mb-3">
              <User className="w-4 h-4 text-emerald-500" /> Nhân Viên (Tasker)
            </h3>
            {booking.tasker ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-[var(--c-muted)] block mb-0.5">Họ tên</span>
                  <span className="font-semibold text-sm">{booking.tasker.fullName}</span>
                </div>
                <div>
                  <span className="text-xs text-[var(--c-muted)] block mb-0.5">Số điện thoại</span>
                  <span className="font-semibold text-sm">{booking.tasker.phone ?? "N/A"}</span>
                </div>
                {booking.tasker.ratingAvg !== undefined && (
                  <div>
                    <span className="text-xs text-[var(--c-muted)] block mb-0.5">Đánh giá</span>
                    <span className="font-semibold text-sm text-amber-500">★ {booking.tasker.ratingAvg.toFixed(1)}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-[var(--c-muted)] italic text-center py-2">Chưa có nhân viên nhận đơn này.</p>
            )}
          </div>

          </div>

          <div className="min-w-0 space-y-3">
            {/* Row 5: Timeline */}
            {operation && operation.timeline.length > 0 && (
              <div className="bg-[var(--c-card-2)] rounded-xl p-3 border border-[var(--c-line)]">
                <h3 className="font-bold text-sm flex items-center gap-2 pb-1.5 border-b border-[var(--c-line)] mb-1">
                  <TrendingUp className="w-4 h-4 text-purple-500" /> Lịch Sử Trạng Thái
                </h3>
                <div className="pl-1">
                  {operation.timeline.map((entry) => (
                    <TimelineRow key={entry.id} entry={entry} />
                  ))}
                </div>
              </div>
            )}

          {/* Row 6: Actions */}
          <div className="bg-[var(--c-card-2)] rounded-xl p-3 border border-[var(--c-line)]">
            <h3 className="font-bold text-sm flex items-center gap-2 pb-1.5 border-b border-[var(--c-line)] mb-2">
              <CheckCircle2 className="w-4 h-4 text-purple-500" /> Hành Động
            </h3>

            {isClosed ? (
              <p className="text-sm text-[var(--c-muted)] italic">
                Đơn hàng ở trạng thái <strong>{statusMeta.label}</strong> — không thể thực hiện thêm thao tác.
              </p>
            ) : confirmCancel ? (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-red-600">Xác nhận hủy đơn <span className="font-mono">{booking.bookingCode}</span>?</p>
                <p className="text-xs text-[var(--c-muted)]">Thao tác này không thể hoàn tác. Khách hàng sẽ nhận được thông báo.</p>
                <div className="flex gap-2">
                  <AdminButton variant="secondary" onClick={() => setConfirmCancel(false)} className="flex-1">
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
              <div className="flex flex-wrap gap-3">
                {/* <AdminButton
                  variant="primary"
                  onClick={() => setIsAssignOpen(true)}
                  icon={<User className="w-4 h-4" />}
                >
                  {booking.tasker ? "Thay Tasker" : "Gán Tasker"}
                </AdminButton> */}
                <AdminButton className ="hidden" variant="secondary" onClick={() => setIsChangeStatusOpen(true)}>
                  Đổi trạng thái
                </AdminButton>
                <div className="m-auto">
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
          </div>
        </div>
      </DialogContent>

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
      />
    </Dialog>
  );
};
