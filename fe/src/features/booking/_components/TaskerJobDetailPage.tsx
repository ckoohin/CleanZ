"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { SwipeToAccept } from "@/features/tasker/_components/SwipeToAccept";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Calendar,
  Phone,
  User,
  Navigation,
  CheckCircle2,
  PlayCircle,
  Flag,
  PawPrint,
  AlertTriangle,
  Route,
  Loader2,
  ShieldAlert,
  LockKeyhole,
  Wrench,
  XCircle,
  Crown,
} from "lucide-react";
import {
  usePostedBookingDetail,
  useAssignedBookingDetail,
  useAcceptBooking,
  useMarkOnTheWay,
  useMarkCheckedIn,
  useMarkStart,
  useMarkComplete,
  useCancelByTasker,
  useRequestOvertime,
  useConfirmSurchargeReceived,
  isSilentTaskerBookingError,
} from "@/features/booking/hooks/useTaskerBooking";
import type {
  BookingSchedule,
  BookingStatus,
  TaskerAssignedBookingDetail,
  TaskerPostedBookingDetail,
} from "@/features/booking/types/booking.types";
import { useTaskerLocationTracking } from "@/features/booking/hooks/useBookingTracking";
import { BookingTrackingMap } from "./BookingTrackingMap";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { BookingStatusStepper } from "@/features/tasker/_components/BookingStatusStepper";
import { toast } from "sonner";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtCurrency(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

const STATUS_CONFIG: Record<
  BookingStatus,
  { label: string; color: string; bg: string }
> = {
  POSTED: { label: "Chờ nhận", color: "text-blue-600", bg: "bg-blue-50" },
  PENDING_CUSTOMER_CONFIRMATION: {
    label: "Chờ khách xác nhận",
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  CONFIRMED: {
    label: "Đã xác nhận",
    color: "text-indigo-600",
    bg: "bg-indigo-50",
  },
  TASKER_ON_THE_WAY: {
    label: "Đang di chuyển",
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  CHECKED_IN: {
    label: "Đã đến nơi",
    color: "text-orange-600",
    bg: "bg-orange-50",
  },
  IN_PROGRESS: {
    label: "Đang làm việc",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  COMPLETED: {
    label: "Hoàn thành",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  CANCELLED: { label: "Đã hủy", color: "text-slate-500", bg: "bg-slate-100" },
  EXPIRED: { label: "Hết hạn", color: "text-slate-500", bg: "bg-slate-100" },
};

type LocationErrorKind =
  | "permission-denied"
  | "location-disabled"
  | "timeout"
  | "inaccurate"
  | "insecure-context"
  | "unsupported"
  | null;

// ─── Action Button ─────────────────────────────────────────────────────────────
function ActionButton({
  label,
  icon: Icon,
  onClick,
  isPending,
  color = "primary",
}: {
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  isPending: boolean;
  color?: "primary" | "emerald" | "amber";
}) {
  const colorMap = {
    primary: "bg-primary shadow-primary/25 hover:bg-orange-600",
    emerald: "bg-emerald-500 shadow-emerald-500/25 hover:bg-emerald-600",
    amber: "bg-amber-500 shadow-amber-500/25 hover:bg-amber-600",
  };

  return (
    <button
      onClick={onClick}
      disabled={isPending}
      className={`w-full py-4 text-white font-bold text-sm rounded-2xl shadow-lg ${colorMap[color]} active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2`}
    >
      {isPending ? (
        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        <>
          <Icon className="w-4 h-4" />
          {label}
        </>
      )}
    </button>
  );
}

// ─── Checkin Window Banner ────────────────────────────────────────────────────
const CHECKIN_OPEN_BEFORE = 30; // T-30
const CHECKIN_AUTO_CANCEL = 45; // T+45

function parseScheduledStart(schedule: BookingSchedule): Date | null {
  if (!schedule.scheduledStartDate || !schedule.scheduledStartTime) return null;
  const d = new Date(
    `${schedule.scheduledStartDate}T${schedule.scheduledStartTime}`,
  );
  return isNaN(d.getTime()) ? null : d;
}

function fmtTime(date: Date) {
  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return m > 0 ? `${m} phút ${s} giây` : `${s} giây`;
}

function CheckinWindowBanner({
  schedule,
  policy,
}: {
  schedule: BookingSchedule;
  policy?: TaskerAssignedBookingDetail["checkinPolicy"];
}) {
  const [now, setNow] = useState(() => Date.now());
  const timingPolicy = policy ?? {
    exemptFromLatePenalty: false,
    lateGraceMinutes: 5,
  };

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const scheduledStart = parseScheduledStart(schedule);
  if (!scheduledStart) return null;

  const startMs = scheduledStart.getTime();
  const diffMin = (now - startMs) / 60_000;

  const windowOpenTime = new Date(startMs - CHECKIN_OPEN_BEFORE * 60_000);
  const autoCancelTime = new Date(startMs + CHECKIN_AUTO_CANCEL * 60_000);

  if (timingPolicy.exemptFromLatePenalty && diffMin <= CHECKIN_AUTO_CANCEL) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="mb-1 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
            Đơn làm ngay
          </p>
        </div>
        <p className="text-sm font-semibold text-emerald-800">
          Check-in khi đến nơi, không áp dụng điểm phạt đến muộn.
        </p>
      </div>
    );
  }

  if (diffMin < -CHECKIN_OPEN_BEFORE) {
    const secsUntilOpen = Math.ceil((-diffMin - CHECKIN_OPEN_BEFORE) * 60);
    return (
      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-4 h-4 text-blue-600 shrink-0" />
          <p className="text-xs font-black text-blue-700 uppercase tracking-wide">
            Cửa sổ check-in chưa mở
          </p>
        </div>
        <p className="text-sm font-semibold text-blue-800">
          Mở lúc {fmtTime(windowOpenTime)} · còn{" "}
          <span className="font-black">{fmtCountdown(secsUntilOpen)}</span>
        </p>
        <p className="text-[11px] text-blue-600 mt-1">
          Hãy di chuyển để đến nơi đúng giờ. Check-in sớm nhất từ 30 phút trước
          lịch hẹn.
        </p>
      </div>
    );
  }

  if (diffMin <= timingPolicy.lateGraceMinutes) {
    const secsUntilCancel = Math.ceil((CHECKIN_AUTO_CANCEL - diffMin) * 60);
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <p className="text-xs font-black text-emerald-700 uppercase tracking-wide">
            Đúng giờ
          </p>
        </div>
        <p className="text-sm font-semibold text-emerald-800">
          Đến nơi rồi bấm check-in trước{" "}
          <span className="font-black">{fmtTime(autoCancelTime)}</span>
        </p>
        <div className="mt-2 flex items-center gap-1.5 bg-white/70 rounded-xl px-3 py-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <p className="text-xs font-bold text-emerald-700">
            Hủy tự động sau{" "}
            <span className="font-black">{fmtCountdown(secsUntilCancel)}</span>
          </p>
        </div>
      </div>
    );
  }

  if (diffMin <= CHECKIN_AUTO_CANCEL) {
    const secsUntilCancel = Math.ceil((CHECKIN_AUTO_CANCEL - diffMin) * 60);
    const minutesLate = Math.ceil(diffMin);
    const warningPoints = diffMin > 15 ? 2 : 1;
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <p className="text-xs font-black text-red-700 uppercase tracking-wide">
            Đang đến muộn — {minutesLate} phút
          </p>
        </div>
        <p className="text-sm font-semibold text-red-800">
          Vẫn có thể check-in, nhưng bạn sẽ bị +{warningPoints} điểm cảnh báo
        </p>
        <div className="mt-2 flex items-center gap-1.5 bg-white/70 rounded-xl px-3 py-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <p className="text-xs font-bold text-red-700">
            Đơn bị hủy tự động sau{" "}
            <span className="font-black">{fmtCountdown(secsUntilCancel)}</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-slate-500 shrink-0" />
        <p className="text-sm font-semibold text-slate-600">
          Cửa sổ check-in đã đóng lúc {fmtTime(autoCancelTime)}
        </p>
      </div>
    </div>
  );
}

// ─── Posted Detail View ───────────────────────────────────────────────────────
function PostedDetailView({
  data,
  bookingId,
  onAccepted,
  onUnavailable,
}: {
  data: TaskerPostedBookingDetail;
  bookingId: string;
  onAccepted: () => void;
  onUnavailable: () => void;
}) {
  const router = useRouter();
  const accept = useAcceptBooking();
  const platformCommissionRate = data.price.platformCommissionRate;
  const platformFee = data.price.platformFee;
  const taskerIncome = data.price.taskerIncome;
  const premiumLocked =
    data.serviceTier === "PREMIUM" && data.premiumAccess?.canAccept === false;

  const handleAccept = async () => {
    try {
      await accept.mutateAsync(bookingId);
      onAccepted();
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response
        ?.status;
      if (status === 409 || status === 403 || status === 404) {
        onUnavailable();
      }
      throw err;
    }
  };

  return (
    <div className="space-y-4">
      {/* Distance */}
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/15 rounded-xl flex items-center justify-center">
          <Route className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Khoảng cách từ bạn</p>
          <p className="text-xl font-black text-primary">
            {data.distance.kilometers.toFixed(1)} km
          </p>
        </div>
      </div>

      {/* Service info */}
      <div className="bg-card rounded-2xl border border-border/50 p-4 space-y-3">
        <h3 className="font-bold text-foreground text-sm">Dịch vụ</h3>
        <p className="text-base font-semibold">{data.service.name}</p>
        {data.service.description && (
          <p className="text-sm text-muted-foreground">
            {data.service.description}
          </p>
        )}
      </div>

      {/* Schedule */}
      <div className="bg-card rounded-2xl border border-border/50 p-4 space-y-2">
        <h3 className="font-bold text-foreground text-sm mb-2">
          Lịch làm việc
        </h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>
            {data.schedule.scheduledStartDate} ·{" "}
            {data.schedule.scheduledStartTime}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>Thời lượng: {data.schedule.durationHours} giờ</span>
        </div>
      </div>

      {/* Price breakdown */}
      <div className="bg-card rounded-2xl border border-border/50 p-4 space-y-2">
        <h3 className="font-bold text-foreground text-sm mb-2">Giá đơn hàng</h3>
        {[
          { label: "Giá cơ bản", value: data.price.basePrice },
          { label: "Dịch vụ thêm", value: data.price.addonPrice ?? 0 },
          { label: "Phí cao điểm", value: data.price.peakFee },
          { label: "Phí thú cưng", value: data.price.petFee },
          { label: "Giảm giá", value: -data.price.discountAmount },
        ]
          .filter((r) => r.value !== 0)
          .map((r) => (
            <div key={r.label} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{r.label}</span>
              <span
                className={r.value < 0 ? "text-emerald-600 font-medium" : ""}
              >
                {r.value < 0 ? "-" : ""}
                {fmtCurrency(Math.abs(r.value))}
              </span>
            </div>
          ))}
        <div className="space-y-2 pt-2 border-t border-border/40">
          <div className="flex justify-between text-sm">
            <span className="font-bold">Tổng tiền của đơn</span>
            <span className="font-black text-foreground">
              {fmtCurrency(data.price.totalPrice)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Phí nền tảng ({platformCommissionRate}%)
            </span>
            <span className="font-semibold text-red-500">
              -{fmtCurrency(platformFee)}
            </span>
          </div>
          <div className="flex justify-between pt-2 border-t border-border/40">
            <span className="font-bold text-sm">Thu nhập của bạn</span>
            <span className="font-black text-primary">
              {fmtCurrency(taskerIncome)}
            </span>
          </div>
        </div>
      </div>

      {/* Accept button / lý do khóa đơn Premium */}
      {premiumLocked ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-start gap-2">
            <LockKeyhole className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-bold text-amber-700 dark:text-amber-400">
                Bạn chưa thể nhận đơn Cao cấp này
              </p>
              <p className="mt-1 text-xs leading-relaxed text-amber-700/90 dark:text-amber-400/90">
                {data.premiumAccess?.message ??
                  "Cần bổ sung bộ dụng cụ chuyên dụng và chờ admin duyệt."}
              </p>
            </div>
          </div>
          {data.premiumAccess?.issues.includes("EQUIPMENT_NOT_APPROVED") && (
            <button
              type="button"
              onClick={() => router.push("/tasker/profile")}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-3 text-xs font-black text-white"
            >
              <Wrench className="size-4" />
              Bổ sung bộ dụng cụ chuyên dụng
            </button>
          )}
        </div>
      ) : (
        <SwipeToAccept
          label="Vuốt để nhận đơn"
          successLabel="Đã nhận đơn!"
          onConfirm={handleAccept}
          isLoading={accept.isPending}
        />
      )}
    </div>
  );
}

// ─── Tasker Cancel Dialog ─────────────────────────────────────────────────────
const PRESET_CANCEL_REASONS = [
  "Có việc đột xuất, không thể đến được",
  "Phương tiện di chuyển gặp sự cố",
  "Ốm / Không đủ sức khoẻ để làm việc",
  "Sai thông tin lịch hẹn",
];

const CANCEL_POLICY_ITEMS = [
  { title: "Lần 1 / tuần", value: "50.000đ" },
  { title: "Lần 2 / tuần", value: "100.000đ" },
  { title: "Lần 3+ / tuần", value: "200.000đ", note: "Khóa 7 ngày" },
];

function TaskerCancelDialog({
  bookingCode,
  isPending,
  cancelReason,
  onReasonChange,
  onClose,
  onConfirm,
}: {
  bookingCode: string;
  isPending: boolean;
  cancelReason: string;
  onReasonChange: (v: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const handlePreset = (reason: string) => {
    onReasonChange(cancelReason === reason ? "" : reason);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-3 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-border/60 bg-card shadow-2xl shadow-black/20">
        {/* Header */}
        <div className="space-y-4 px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-red-500/10 text-red-600">
              <ShieldAlert className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-red-500">
                Xác nhận hủy đơn
              </p>
              <h3 className="mt-1 text-lg font-black leading-tight text-foreground">
                #{bookingCode}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Đơn sẽ được trả về trạng thái chờ Tasker mới. Hành động này
                không thể hoàn tác.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
              aria-label="Đóng"
            >
              <XCircle className="size-5" />
            </button>
          </div>
        </div>

        {/* Cảnh báo phí phạt */}
        <div className="mx-5 rounded-2xl border border-red-200 bg-red-50/90 p-3.5 sm:mx-6">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0 text-red-500" />
            <p className="text-xs font-black uppercase tracking-wide text-red-600">
              Chính sách phạt hủy đơn
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {CANCEL_POLICY_ITEMS.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-red-200/80 bg-white/65 px-2 py-2 text-center"
              >
                <p className="text-[10px] font-bold text-red-500">
                  {item.title}
                </p>
                <p className="mt-1 text-xs font-black text-red-600">
                  {item.value}
                </p>
                {item.note && (
                  <p className="mt-0.5 text-[9px] font-semibold text-red-400">
                    {item.note}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Lý do gợi ý */}
        <div className="space-y-3 px-5 py-4 sm:px-6">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Chọn lý do hủy
          </p>
          <div className="grid gap-2">
            {PRESET_CANCEL_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => handlePreset(r)}
                className={`flex min-h-11 items-center rounded-2xl border px-3.5 py-2.5 text-left text-sm font-semibold transition-all ${
                  cancelReason === r
                    ? "border-red-300 bg-red-50 text-red-700 shadow-sm shadow-red-500/10"
                    : "border-border bg-background text-foreground hover:border-primary/30 hover:bg-muted/30"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Tự nhập */}
          <textarea
            value={
              PRESET_CANCEL_REASONS.includes(cancelReason) ? "" : cancelReason
            }
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="Hoặc nhập lý do khác..."
            rows={3}
            className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-100 placeholder:text-muted-foreground"
          />
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-3 border-t border-border/60 bg-muted/20 px-5 py-4 sm:px-6">
          <button
            type="button"
            className="min-h-12 rounded-2xl border border-border bg-background text-sm font-black text-foreground transition-colors hover:bg-muted/40 disabled:opacity-50"
            onClick={onClose}
            disabled={isPending}
          >
            Quay lại
          </button>
          <button
            type="button"
            className="min-h-12 rounded-2xl bg-red-500 text-sm font-black text-white shadow-lg shadow-red-500/20 transition-colors hover:bg-red-600 disabled:opacity-60 disabled:shadow-none"
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mx-auto" />
            ) : (
              "Xác nhận hủy"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Bảng kê tiền của đơn đã nhận / đã hoàn thành ─────────────────────────────
const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PENDING: "Chưa thanh toán",
  PAID: "Đã thanh toán",
  REFUNDED: "Đã hoàn tiền",
  FAILED: "Thanh toán thất bại",
};

function fmtMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h} giờ ${m} phút`;
  if (h) return `${h} giờ`;
  return `${m} phút`;
}

function AssignedPriceBreakdown({
  data,
}: {
  data: TaskerAssignedBookingDetail;
}) {
  const price = data.price;
  const commissionRate = price.platformCommissionRate;
  const subtotal = price.subtotal ?? price.totalPrice + price.discountAmount;
  const platformFee = price.platformFee;
  const taskerIncome = price.taskerIncome;
  const surcharge = price.waitingFee ?? 0;
  const isCompleted = data.status === "COMPLETED";

  const workedMinutes =
    data.checkedInAt && data.checkedOutAt
      ? Math.round(
          (new Date(data.checkedOutAt).getTime() -
            new Date(data.checkedInAt).getTime()) /
            60_000,
        )
      : null;

  const rows = [
    { label: "Giá cơ bản", value: price.basePrice },
    { label: "Dịch vụ thêm", value: price.addonPrice ?? 0 },
    { label: "Phí cao điểm", value: price.peakFee },
    { label: "Phí thú cưng", value: price.petFee },
    { label: "Phụ phí phát sinh thêm giờ", value: surcharge },
    { label: "Giảm giá (voucher của khách)", value: -price.discountAmount },
  ].filter((r) => r.value !== 0);

  return (
    <div className="bg-card rounded-2xl border border-border/50 p-4 space-y-2">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-foreground text-sm">
          {isCompleted ? "Quyết toán đơn hàng" : "Giá đơn hàng"}
        </h3>
        {data.serviceTier === "PREMIUM" && (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-black text-amber-600">
            <Crown className="w-3 h-3" />
            ĐƠN CAO CẤP
          </span>
        )}
      </div>

      {rows.map((r) => (
        <div key={r.label} className="flex justify-between text-sm">
          <span className="text-muted-foreground">{r.label}</span>
          <span className={r.value < 0 ? "text-emerald-600 font-medium" : ""}>
            {r.value < 0 ? "-" : ""}
            {fmtCurrency(Math.abs(r.value))}
          </span>
        </div>
      ))}

      <div className="space-y-2 pt-2 border-t border-border/40">
        <div className="flex justify-between text-sm">
          <span className="font-bold">Khách thanh toán</span>
          <span className="font-black text-foreground">
            {fmtCurrency(price.totalPrice)}
          </span>
        </div>
        {price.discountAmount > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">
              Giá tính hoa hồng (trước voucher)
            </span>
            <span className="text-muted-foreground">
              {fmtCurrency(subtotal)}
            </span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            Phí nền tảng ({commissionRate}%)
          </span>
          <span className="font-semibold text-red-500">
            -{fmtCurrency(platformFee)}
          </span>
        </div>
        <div className="flex justify-between pt-2 border-t border-border/40">
          <span className="font-bold text-sm">
            {isCompleted ? "Bạn đã nhận" : "Thu nhập của bạn"}
          </span>
          <span className="font-black text-primary">
            {fmtCurrency(taskerIncome)}
          </span>
        </div>
      </div>

      {/* Thời gian làm việc thực tế */}
      {workedMinutes !== null && (
        <div className="pt-3 mt-1 border-t border-border/40 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Thời lượng đặt</span>
            <span>
              {fmtMinutes(Math.round(data.schedule.durationHours * 60))}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Làm thực tế</span>
            <span className="font-semibold">{fmtMinutes(workedMinutes)}</span>
          </div>
          {!!data.workTiming?.overtimeMinutes && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Phát sinh tính phí</span>
              <span className="font-semibold text-amber-600">
                +{fmtMinutes(data.workTiming.overtimeMinutes)}
              </span>
            </div>
          )}
          {!!data.workTiming?.earlyMinutes && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Kết thúc sớm</span>
              <span className="font-semibold text-orange-600">
                -{fmtMinutes(data.workTiming.earlyMinutes)}
              </span>
            </div>
          )}
        </div>
      )}

      {data.payment && (
        <div className="pt-3 mt-1 border-t border-border/40 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Hình thức thanh toán</span>
            <span className="font-semibold">
              {data.payment.method === "CASH"
                ? "Tiền mặt (thu tại nhà khách)"
                : "Ví CleanZ (khách trả trước)"}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Trạng thái</span>
            <span className="font-semibold">
              {PAYMENT_STATUS_LABEL[data.payment.status] ?? data.payment.status}
            </span>
          </div>
          {data.payment.method === "CASH" && !isCompleted && (
            <p className="text-[11px] text-amber-600 pt-1">
              Bạn thu {fmtCurrency(price.totalPrice)} tiền mặt từ khách; phí nền
              tảng {fmtCurrency(platformFee)} sẽ được trừ vào ví của bạn.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Khu vực thêm giờ / phụ phí khi đang làm việc ──────────────────────────────
function TaskerOvertimeSection({
  data,
  bookingId,
  onRequestComplete,
  isCompletePending,
}: {
  data: TaskerAssignedBookingDetail;
  bookingId: string;
  onRequestComplete: () => void;
  isCompletePending: boolean;
}) {
  const requestOvertime = useRequestOvertime(bookingId);
  const confirmReceived = useConfirmSurchargeReceived(bookingId);
  const [showSheet, setShowSheet] = useState(false);

  const surchargeStatus = data.workTiming?.surchargeStatus;
  const request = data.overtimeRequest;
  const approvedMinutes = data.workTiming?.approvedOvertimeMinutes ?? 0;

  // Khách đồng ý trả tiền mặt → tasker phải xác nhận đã nhận đủ thì đơn mới xong.
  if (surchargeStatus === "PENDING_TASKER_CONFIRM") {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
        <div className="text-center space-y-1">
          <p className="text-sm font-bold text-emerald-700">
            Khách đã đồng ý trả phần phát sinh
          </p>
          <p className="text-xs text-emerald-600"></p>
        </div>
        <ActionButton
          label="Thu tiền mặt"
          icon={CheckCircle2}
          onClick={() => confirmReceived.mutate()}
          isPending={confirmReceived.isPending}
          color="emerald"
        />
      </div>
    );
  }

  // Đã checkout, đang chờ khách xác nhận phần vượt ngoài hạn mức đã duyệt.
  if (surchargeStatus === "PENDING_CUSTOMER") {
    return (
      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-center space-y-1">
        <p className="text-sm font-bold text-amber-700">
          Đã checkout — chờ khách xác nhận phát sinh
        </p>
        <p className="text-xs text-amber-600">
          Phần phát sinh thêm giờ (
          {fmtCurrency(data.workTiming?.surchargeFee ?? 0)}) sẽ được thu sau khi
          khách xác nhận.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Trạng thái yêu cầu thêm giờ */}
      {request?.status === "PENDING" && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-center space-y-1">
          <p className="text-sm font-bold text-blue-700">
            Đang chờ khách duyệt thêm {request.minutes} phút
          </p>
          <p className="text-xs text-blue-600">
            Phụ phí {fmtCurrency(request.fee)}. Khách chưa phản hồi thì hãy
            checkout đúng giờ đã đặt.
          </p>
        </div>
      )}
      {request?.status === "NOTIFIED" && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3 text-center space-y-1">
          <p className="text-xs font-semibold text-amber-700">
            Đã báo khách công việc có thể phát sinh thêm giờ
          </p>
          <p className="text-[11px] text-amber-600">
            Thời gian và phụ phí chính thức sẽ được tính khi bạn hoàn thành công
            việc.
          </p>
        </div>
      )}
      {approvedMinutes > 0 && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 text-center">
          <p className="text-xs font-semibold text-emerald-700">
            Khách đã duyệt thêm {fmtMinutes(approvedMinutes)} — phần này được
            thu chắc chắn, không cần xác nhận lại
          </p>
        </div>
      )}
      {request?.status === "REJECTED" && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
          <p className="text-xs text-slate-600">
            Khách từ chối thêm giờ. Hãy checkout đúng giờ đã đặt.
          </p>
        </div>
      )}
      {request?.status === "EXPIRED" && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
          <p className="text-xs text-slate-600">
            Khách không phản hồi kịp yêu cầu thêm giờ.
          </p>
        </div>
      )}

      {/* Báo trước cho khách; tiền chốt theo checkout thực tế. */}
      {request?.status !== "PENDING" && request?.status !== "NOTIFIED" && (
        <button
          onClick={() => setShowSheet(true)}
          className="w-full py-3 rounded-2xl border-2 border-amber-300 text-amber-600 font-semibold text-sm hover:bg-amber-50 transition-colors flex items-center justify-center gap-2"
        >
          <Clock className="w-4 h-4" />
          Báo khách có phát sinh thêm giờ
        </button>
      )}

      <ActionButton
        label="Hoàn thành công việc ✅"
        icon={Flag}
        onClick={onRequestComplete}
        isPending={isCompletePending}
        color="emerald"
      />

      {/* Sheet xác nhận gửi thông báo */}
      <AnimatePresence>
        {showSheet && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setShowSheet(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="fixed inset-x-4 bottom-6 md:max-w-md md:mx-auto z-[60] bg-card border border-border/50 rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="text-center space-y-1">
                <h3 className="font-bold text-base">
                  Báo khách có phát sinh thêm giờ
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Gửi thông báo để khách biết công việc có thể kéo dài. Không
                  chốt trước số phút hay số tiền.
                </p>
              </div>

              <div className="rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3 space-y-1">
                <p className="text-xs font-semibold text-amber-700">
                  Phụ phí phụ thuộc thời gian checkout
                </p>
                <p className="text-[11px] text-amber-600 leading-relaxed">
                  Hệ thống tính thời gian làm thực tế từ check-in đến checkout.
                  Phát sinh bao nhiêu phút sẽ tính đúng bấy nhiêu phút và gửi
                  khách xác nhận.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowSheet(false)}
                  className="flex-1 py-3 rounded-2xl border border-border text-sm font-semibold"
                >
                  Hủy
                </button>
                <button
                  onClick={() =>
                    requestOvertime.mutate(undefined, {
                      onSuccess: () => setShowSheet(false),
                    })
                  }
                  disabled={requestOvertime.isPending}
                  className="flex-1 py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50"
                >
                  {requestOvertime.isPending ? (
                    <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                  ) : (
                    "Gửi thông báo"
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Assigned Detail View ─────────────────────────────────────────────────────
function AssignedDetailView({
  data,
  bookingId,
}: {
  data: TaskerAssignedBookingDetail;
  bookingId: string;
}) {
  const router = useRouter();
  const markOnWay = useMarkOnTheWay(bookingId);
  const markCheckedIn = useMarkCheckedIn(bookingId);
  const markStart = useMarkStart(bookingId);
  const markComplete = useMarkComplete(bookingId);
  const cancelByTasker = useCancelByTasker(bookingId);
  const checkinRequestLockRef = useRef(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const {
    tracking,
    isConnected: isTrackingConnected,
    error: trackingError,
    locationAccuracy,
  } = useTaskerLocationTracking(bookingId, data.status === "TASKER_ON_THE_WAY");

  const [showConfirmComplete, setShowConfirmComplete] = useState(false);

  const statusCfg = STATUS_CONFIG[data.status] ?? STATUS_CONFIG.CONFIRMED;
  const canContact = data.canContactCustomer;

  const handleComplete = () => {
    markComplete.mutate(undefined, {
      onSuccess: () => {
        setShowConfirmComplete(false);
        router.push("/tasker/jobs");
      },
    });
  };

  const handleCheckin = () => {
    if (checkinRequestLockRef.current || markCheckedIn.isPending) return;
    checkinRequestLockRef.current = true;
    markCheckedIn.mutate(undefined, {
      onSettled: () => {
        checkinRequestLockRef.current = false;
      },
    });
  };

  if (data.status === "TASKER_ON_THE_WAY") {
    const customerName =
      data.address?.contactName || data.customer?.fullName || "Khách hàng";
    const customerPhone = data.address?.contactPhone || data.customer?.phone;
    const destinationAddress =
      data.address?.fullAddress || "Địa chỉ khách hàng";
    const isGpsOnline =
      isTrackingConnected &&
      !trackingError &&
      locationAccuracy !== null &&
      locationAccuracy <= 100;
    const routeSummary =
      tracking?.route?.distance?.kilometers !== undefined &&
      tracking.route.duration?.minutes !== undefined
        ? `${tracking.route.distance.kilometers.toFixed(1)} km · ${tracking.route.duration.minutes} phút`
        : "Đang tính tuyến đường";

    return (
      <div className="-mx-4 -mt-4 md:mx-0 md:mt-0">
        <div className="relative min-h-[calc(100svh-88px)] overflow-hidden bg-background md:rounded-3xl md:border md:border-border/50 md:shadow-md">
          <ErrorBoundary
            fallback={(reset) => (
              <div className="m-4 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 shadow-sm">
                <p className="font-semibold">Không thể tải bản đồ điều hướng</p>
                <p className="mt-1 text-xs text-amber-600">
                  Bản đồ vừa gặp sự cố hiển thị. Bạn vẫn có thể thao tác các
                  phần khác của đơn.
                </p>
                <button
                  type="button"
                  onClick={reset}
                  className="mt-3 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-bold text-white"
                >
                  Thử lại bản đồ
                </button>
              </div>
            )}
          >
            <BookingTrackingMap
              viewer="tasker"
              tracking={tracking}
              mobileFull
              grabFull
              isConnected={isGpsOnline}
              error={trackingError}
              fallbackDestination={{
                latitude: data.address?.latitude,
                longitude: data.address?.longitude,
                address: data.address?.fullAddress,
              }}
            />
          </ErrorBoundary>

          <div className="relative z-20 -mt-28 rounded-t-[32px] border-t border-border/50 bg-card px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4 shadow-[0_-14px_44px_rgba(15,23,42,0.16)] md:mx-4 md:mb-4 md:rounded-[28px] md:border md:px-5 md:shadow-lg">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-muted-foreground/20 md:hidden" />

            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                    isGpsOnline ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                />
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-black uppercase tracking-wider text-foreground">
                    Đang di chuyển tới khách hàng
                  </p>
                  <p className="mt-0.5 text-[10px] font-semibold text-muted-foreground">
                    {isGpsOnline
                      ? `GPS đang chia sẻ${locationAccuracy ? ` · sai số ${Math.round(locationAccuracy)}m` : ""}`
                      : "Đang chờ GPS ổn định"}
                  </p>
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-primary">
                Realtime GPS
              </span>
            </div>

            <div className="mb-3 grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-foreground">
                        {customerName}
                      </p>
                      <p className="mt-0.5 text-xs font-semibold text-primary">
                        Khách hàng đang chờ bạn đến
                      </p>
                    </div>
                  </div>
                  {customerPhone && (
                    <a
                      href={`tel:${customerPhone}`}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 active:scale-95"
                      aria-label="Gọi khách hàng"
                    >
                      <Phone className="h-4 w-4" />
                    </a>
                  )}
                </div>

                <div className="rounded-xl bg-white/80 p-3">
                  <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-primary">
                    Điểm đến
                  </p>
                  <p className="text-sm font-bold leading-relaxed text-foreground">
                    {destinationAddress}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-1">
                <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-primary">
                    Dự kiến còn lại
                  </p>
                  <p className="mt-2 text-base font-black text-primary">
                    {routeSummary}
                  </p>
                </div>

                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destinationAddress)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary px-4 py-3 text-xs font-black uppercase tracking-wider text-primary-foreground shadow-lg shadow-primary/20 active:scale-[0.98]"
                >
                  <Navigation className="h-4 w-4" />
                  Mở chỉ đường
                </a>
              </div>
            </div>

            {trackingError && (
              <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <p className="text-sm font-bold text-red-700">
                    Chưa thể chia sẻ vị trí
                  </p>
                </div>
                <p className="mt-1 text-xs text-red-600">{trackingError}</p>
              </div>
            )}

            <div className="mb-4 rounded-2xl border border-border/50 bg-muted/20 p-4">
              <p className="mb-4 text-[10px] font-black uppercase tracking-wider text-primary">
                Tiến trình chuyến đi
              </p>
              <BookingStatusStepper currentStatus={data.status} />
            </div>

            <div className="mb-3">
              <CheckinWindowBanner
                schedule={data.schedule}
                policy={data.checkinPolicy}
              />
            </div>

            <ActionButton
              label="Check-in — Tôi đã đến nơi"
              icon={MapPin}
              onClick={handleCheckin}
              isPending={markCheckedIn.isPending}
              color="amber"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status badge */}
      <div
        className={`flex items-center gap-2 px-4 py-3 rounded-2xl ${statusCfg.bg}`}
      >
        <div
          className={`w-2 h-2 rounded-full ${statusCfg.color.replace("text-", "bg-")} ${data.status === "IN_PROGRESS" ? "animate-pulse" : ""}`}
        />
        <span className={`text-sm font-bold ${statusCfg.color}`}>
          {statusCfg.label}
        </span>
      </div>

      {/* Customer info (chỉ hiện khi canContactCustomer) */}
      {canContact && data.customer && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
          <h3 className="font-bold text-sm text-emerald-800 mb-3">
            Thông tin khách hàng
          </h3>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm text-foreground">
                {data.address?.contactName || data.customer.fullName || "—"}
              </p>
              {(data.address?.contactPhone || data.customer.phone) && (
                <a
                  href={`tel:${data.address?.contactPhone || data.customer.phone}`}
                  className="flex items-center gap-1 text-xs text-emerald-600 font-medium mt-0.5"
                >
                  <Phone className="w-3 h-3" />{" "}
                  {data.address?.contactPhone || data.customer.phone}
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Address (full khi canContactCustomer) */}
      {canContact && data.address ? (
        <div className="bg-card rounded-2xl border border-border/50 p-4">
          <div className="flex justify-between items-start gap-2">
            <div className="space-y-1">
              <h3 className="font-bold text-sm mb-2 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-primary" /> Địa chỉ làm việc
              </h3>
              <p className="text-sm text-foreground font-medium">
                {data.address.fullAddress}
              </p>
              {data.address.wardDetail && (
                <p className="text-xs text-muted-foreground">
                  {data.address.wardDetail}
                </p>
              )}
              {(data.address.buildingFloor || data.address.gate) && (
                <div className="flex items-center gap-2 mt-1">
                  {data.address.buildingFloor && (
                    <span className="text-xs bg-muted px-2 py-1 rounded-md text-foreground">
                      <span className="font-semibold">Tòa/Tầng:</span>{" "}
                      {data.address.buildingFloor}
                    </span>
                  )}
                  {data.address.gate && (
                    <span className="text-xs bg-muted px-2 py-1 rounded-md text-foreground">
                      <span className="font-semibold">Cổng:</span>{" "}
                      {data.address.gate}
                    </span>
                  )}
                </div>
              )}
              {data.address.driverNote && (
                <div className="text-xs bg-orange-50 text-orange-700 px-3 py-2 rounded-lg mt-2 border border-orange-100">
                  <span className="font-bold block mb-0.5">
                    Lưu ý cho tài xế:
                  </span>
                  {data.address.driverNote}
                </div>
              )}
              {data.address.hasPet && (
                <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full inline-flex items-center gap-0.5 mt-2">
                  <PawPrint className="w-2.5 h-2.5" /> Nhà có thú cưng
                </span>
              )}
            </div>
            {data.status === "CONFIRMED" && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(data.address.fullAddress)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-primary/20 transition-colors shrink-0"
              >
                <Navigation className="w-3.5 h-3.5" />
                Chỉ đường
              </a>
            )}
          </div>
        </div>
      ) : !canContact ? (
        <div className="bg-muted/50 border border-border/30 rounded-2xl p-4 text-center">
          <MapPin className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground font-medium">
            {data.status === "COMPLETED"
              ? "Thông tin liên hệ đã được ẩn"
              : "Địa chỉ đầy đủ sẽ hiển thị"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {data.status === "COMPLETED"
              ? "Số điện thoại và địa chỉ được bảo vệ sau khi hoàn thành đơn"
              : "khi bạn bắt đầu di chuyển tới"}
          </p>
        </div>
      ) : null}

      {/* Service + Schedule */}
      <div className="bg-card rounded-2xl border border-border/50 p-4 space-y-2">
        <p className="font-bold text-sm text-foreground">{data.service.name}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="w-3.5 h-3.5" />
          <span>
            {data.schedule.scheduledStartDate} ·{" "}
            {data.schedule.scheduledStartTime}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          <span>{data.schedule.durationHours} giờ</span>
        </div>
        {data.note && (
          <div className="mt-2 bg-muted/50 rounded-xl p-3">
            <p className="text-xs text-muted-foreground">
              💬 Ghi chú: {data.note}
            </p>
          </div>
        )}
      </div>

      {/* Price */}
      <AssignedPriceBreakdown data={data} />

      {/* Action buttons based on status */}
      {data.status === "CONFIRMED" && (
        <div className="flex flex-col gap-3">
          <ActionButton
            label="Bắt đầu di chuyển tới"
            icon={Navigation}
            onClick={() => markOnWay.mutate()}
            isPending={markOnWay.isPending}
            color="amber"
          />
          <button
            onClick={() => setShowCancelDialog(true)}
            className="w-full py-3 rounded-2xl border-2 border-red-200 text-red-500 font-semibold text-sm hover:bg-red-50 transition-colors"
          >
            Hủy đơn này
          </button>
        </div>
      )}

      {/* Cancel dialog */}
      {showCancelDialog && (
        <TaskerCancelDialog
          bookingCode={data.bookingCode}
          isPending={cancelByTasker.isPending}
          cancelReason={cancelReason}
          onReasonChange={setCancelReason}
          onClose={() => {
            setShowCancelDialog(false);
            setCancelReason("");
          }}
          onConfirm={() =>
            cancelByTasker.mutate(cancelReason || undefined, {
              onSuccess: (res) => {
                setShowCancelDialog(false);
                setCancelReason("");
                if (res.suspended) {
                  toast.warning(
                    `Tài khoản bị khóa nhận đơn 7 ngày do hủy quá 3 lần trong tuần`,
                    { duration: 8000 },
                  );
                }
                router.push("/tasker/jobs");
              },
            })
          }
        />
      )}
      {data.status === "CHECKED_IN" && (
        <ActionButton
          label="Bắt đầu làm việc"
          icon={PlayCircle}
          onClick={() => markStart.mutate()}
          isPending={markStart.isPending}
          color="primary"
        />
      )}
      {data.status === "IN_PROGRESS" && (
        <TaskerOvertimeSection
          data={data}
          bookingId={bookingId}
          onRequestComplete={() => setShowConfirmComplete(true)}
          isCompletePending={markComplete.isPending}
        />
      )}
      {data.status === "COMPLETED" && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
          <p className="text-sm font-bold text-foreground">Đã hoàn thành</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {data.payment?.method === "CASH"
              ? "Bạn đã thu tiền mặt, phí nền tảng đã trừ vào ví"
              : "Thu nhập đã được ghi vào ví"}
          </p>
          {data.completedAt && (
            <p className="text-[11px] text-muted-foreground mt-1">
              Hoàn thành lúc{" "}
              {new Date(data.completedAt).toLocaleString("vi-VN")}
            </p>
          )}
        </div>
      )}
      {data.status === "CANCELLED" && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-center">
          <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-sm font-bold text-foreground">Đơn đã bị hủy</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Đơn có thể đã bị hủy do không check-in đúng giờ hoặc do yêu cầu hủy
          </p>
          <button
            onClick={() => router.push("/tasker/jobs")}
            className="mt-3 text-xs font-bold text-primary"
          >
            ← Về danh sách đơn
          </button>
        </div>
      )}

      {/* Complete Confirmation Modal */}
      <AnimatePresence>
        {showConfirmComplete && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setShowConfirmComplete(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-x-4 top-[30%] md:max-w-md md:mx-auto z-[60] bg-card border border-border/50 rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto text-emerald-600">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="font-bold text-base text-foreground">
                  Hoàn thành công việc?
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Xác nhận rằng bạn đã hoàn tất toàn bộ các đầu việc dọn dẹp
                  theo yêu cầu của khách hàng. Thu nhập ước tính sẽ được cộng
                  trực tiếp vào tài khoản của bạn.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowConfirmComplete(false)}
                  disabled={markComplete.isPending}
                  className="flex-1 py-3 border border-border rounded-xl text-xs font-bold text-foreground bg-muted/20 hover:bg-muted/50 transition-colors"
                >
                  Quay lại
                </button>
                <button
                  onClick={handleComplete}
                  disabled={markComplete.isPending}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  {markComplete.isPending ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Flag className="w-3.5 h-3.5" />
                      Xác nhận hoàn thành
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export const TaskerJobDetailPage: React.FC<{ bookingId: string }> = ({
  bookingId,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPostedMode = searchParams.get("mode") === "posted";

  // Geolocation (optional — chỉ gửi nếu user cho phép)
  const [location, setLocation] = useState<{
    currentLatitude?: number;
    currentLongitude?: number;
  }>({});
  const [locationResolved, setLocationResolved] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationErrorKind, setLocationErrorKind] =
    useState<LocationErrorKind>(null);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);

  const requestCurrentLocation = () => {
    setLocationResolved(false);
    setLocationError(null);
    setLocationErrorKind(null);
    setLocation({});
    setIsRequestingLocation(true);

    if (!window.isSecureContext) {
      setLocationError(
        "Trình duyệt chỉ cho phép yêu cầu GPS qua HTTPS. Hãy mở ứng dụng bằng HTTPS rồi thử lại.",
      );
      setLocationErrorKind("insecure-context");
      setLocationResolved(true);
      setIsRequestingLocation(false);
      return;
    }

    if (!navigator.geolocation) {
      setLocationError("Trình duyệt không hỗ trợ định vị.");
      setLocationErrorKind("unsupported");
      setLocationResolved(true);
      setIsRequestingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          currentLatitude: position.coords.latitude,
          currentLongitude: position.coords.longitude,
        });
        setLocationResolved(true);
        setIsRequestingLocation(false);
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError(
            "Quyền vị trí đang bị chặn. Hãy mở cài đặt trang của trình duyệt, chọn Vị trí → Cho phép rồi thử lại.",
          );
          setLocationErrorKind("permission-denied");
          setLocationResolved(true);
          setIsRequestingLocation(false);
          return;
        }
        setLocationError(
          "Không lấy được vị trí thật từ thiết bị. Hãy bật GPS/vị trí chính xác rồi thử lại.",
        );
        setLocationErrorKind(
          error.code === error.POSITION_UNAVAILABLE
            ? "location-disabled"
            : "timeout",
        );
        setLocationResolved(true);
        setIsRequestingLocation(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15_000,
      },
    );
  };

  useEffect(() => {
    const timer = window.setTimeout(requestCurrentLocation, 0);

    // Chỉ lấy vị trí khi mở booking hoặc khi người dùng chủ động thử lại.
    return () => window.clearTimeout(timer);
  }, []);

  const postedQuery = usePostedBookingDetail(bookingId, location, isPostedMode);
  const assignedQuery = useAssignedBookingDetail(
    bookingId,
    location,
    !isPostedMode,
  );

  // Detect auto-cancel khi tasker đang di chuyển
  const prevStatusRef = useRef<BookingStatus | null>(null);
  useEffect(() => {
    const current = assignedQuery.data?.status ?? null;
    const prev = prevStatusRef.current;
    if (prev === "TASKER_ON_THE_WAY" && current === "CANCELLED") {
      toast.error("Đơn đã bị hủy tự động do không check-in đúng giờ", {
        duration: 8000,
      });
    }
    prevStatusRef.current = current;
  }, [assignedQuery.data?.status]);

  const isWaitingForLocation =
    isPostedMode &&
    (!Number.isFinite(location.currentLatitude) ||
      !Number.isFinite(location.currentLongitude));
  const isLoading =
    isWaitingForLocation ||
    (isPostedMode ? postedQuery.isLoading : assignedQuery.isLoading);
  const isLocationUnavailable =
    isPostedMode &&
    locationResolved &&
    (!Number.isFinite(location.currentLatitude) ||
      !Number.isFinite(location.currentLongitude));
  const activeStatus = isPostedMode ? null : assignedQuery.data?.status;
  const activeQuery = isPostedMode ? postedQuery : assignedQuery;
  const isSilentBookingError =
    activeQuery.isError && isSilentTaskerBookingError(activeQuery.error);

  useEffect(() => {
    if (!isSilentBookingError) return;

    console.info(
      "[TaskerJobDetail] Bỏ qua lỗi booking stale/không thuộc tasker:",
      activeQuery.error,
    );
    router.replace("/tasker/jobs");
  }, [activeQuery.error, isSilentBookingError, router]);

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="bg-card px-4 pt-12 pb-4 shadow-sm sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0 hover:bg-muted/80 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-sm text-foreground">
              {isPostedMode ? "Chi tiết đơn chờ nhận" : "Đơn hàng của tôi"}
            </h1>
            {activeStatus && (
              <p className="text-xs text-muted-foreground">
                {STATUS_CONFIG[activeStatus]?.label ?? activeStatus}
              </p>
            )}
          </div>
        </div>

        {locationError && (
          <div className="mt-3 bg-amber-50 text-amber-800 border border-amber-200 text-[11px] px-3 py-2 rounded-lg flex gap-2 items-start">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
            <p className="leading-tight">{locationError}</p>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        {isLocationUnavailable ? (
          <div className="text-center py-16 text-muted-foreground">
            <MapPin className="w-10 h-10 mx-auto mb-2 text-amber-400" />
            <p className="text-sm font-semibold">Cần quyền truy cập vị trí</p>
            <p className="text-xs mt-1">
              {locationError ??
                "Hãy cho phép trình duyệt dùng vị trí để tính khoảng cách tới đơn."}
            </p>
            {locationErrorKind === "permission-denied" && (
              <p className="mx-auto mt-2 max-w-sm text-[11px] text-muted-foreground">
                Android: biểu tượng ổ khóa cạnh địa chỉ → Quyền → Vị trí.
                iPhone: Cài đặt → Safari/Chrome → Vị trí → Khi dùng ứng dụng.
              </p>
            )}
            <button
              type="button"
              onClick={requestCurrentLocation}
              disabled={isRequestingLocation}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRequestingLocation && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              {isRequestingLocation
                ? "Đang yêu cầu vị trí..."
                : locationErrorKind === "permission-denied" ||
                    locationErrorKind === "location-disabled"
                  ? "Bật định vị và thử lại"
                  : "Thử lấy lại vị trí"}
            </button>
          </div>
        ) : isLoading || isSilentBookingError ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-20 bg-card rounded-2xl border border-border/50 animate-pulse"
              />
            ))}
          </div>
        ) : isPostedMode ? (
          postedQuery.isError ? (
            // Check if error is 404 (Not Found / Picked)
            (postedQuery.error as { response?: { status?: number } })?.response
              ?.status === 404 ? (
              <div className="text-center py-16 text-muted-foreground">
                <AlertTriangle className="w-10 h-10 mx-auto mb-2 text-amber-400" />
                <p className="text-sm font-semibold">Đơn không còn khả dụng</p>
                <p className="text-xs mt-1">
                  Có thể đã được nhận bởi tasker khác
                </p>
                <button
                  onClick={() => router.back()}
                  className="mt-4 text-primary text-sm font-semibold"
                >
                  ← Quay lại danh sách
                </button>
              </div>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <AlertTriangle className="w-10 h-10 mx-auto mb-2 text-red-400" />
                <p className="text-sm font-semibold text-red-600">
                  Lỗi tải dữ liệu
                </p>
                <p className="text-xs mt-1">
                  Không thể kết nối đến máy chủ hoặc lỗi mạng.
                </p>
                <button
                  onClick={() => postedQuery.refetch()}
                  className="mt-4 text-primary text-sm font-semibold"
                >
                  Thử lại
                </button>
              </div>
            )
          ) : postedQuery.data ? (
            <PostedDetailView
              data={postedQuery.data}
              bookingId={bookingId}
              onAccepted={() => router.replace(`/tasker/jobs/${bookingId}`)}
              onUnavailable={() => router.replace("/tasker/jobs")}
            />
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <AlertTriangle className="w-10 h-10 mx-auto mb-2 text-amber-400" />
              <p className="text-sm font-semibold">Đơn không còn khả dụng</p>
              <p className="text-xs mt-1">
                Có thể đã được nhận bởi tasker khác
              </p>
              <button
                onClick={() => router.back()}
                className="mt-4 text-primary text-sm font-semibold"
              >
                ← Quay lại danh sách
              </button>
            </div>
          )
        ) : assignedQuery.isError ? (
          (assignedQuery.error as { response?: { status?: number } })?.response
            ?.status === 404 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              Không tìm thấy đơn hàng
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <AlertTriangle className="w-10 h-10 mx-auto mb-2 text-red-400" />
              <p className="text-sm font-semibold text-red-600">
                Lỗi tải dữ liệu
              </p>
              <p className="text-xs mt-1">
                Không thể tải thông tin đơn hàng này.
              </p>
              <button
                onClick={() => assignedQuery.refetch()}
                className="mt-4 text-primary text-sm font-semibold"
              >
                Thử lại
              </button>
            </div>
          )
        ) : assignedQuery.data ? (
          <AssignedDetailView data={assignedQuery.data} bookingId={bookingId} />
        ) : (
          <div className="text-center py-16 text-muted-foreground text-sm">
            Đang tải...
          </div>
        )}
      </div>
    </div>
  );
};
