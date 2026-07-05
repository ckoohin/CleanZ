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
  XCircle,
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
  isSilentTaskerBookingError,
} from "@/features/booking/hooks/useTaskerBooking";
import { useTrackingSocket } from "@/hooks/use-socket";
import type {
  BookingSchedule,
  BookingStatus,
  TaskerAssignedBookingDetail,
  TaskerPostedBookingDetail,
} from "@/features/booking/types/booking.types";
import { useTaskerLocationTracking } from "@/features/booking/hooks/useBookingTracking";
import { BookingTrackingMap } from "./BookingTrackingMap";
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
  PENDING_CUSTOMER_CONFIRMATION: { label: "Chờ khách xác nhận", color: "text-amber-600", bg: "bg-amber-50" },
  CONFIRMED: { label: "Đã xác nhận", color: "text-indigo-600", bg: "bg-indigo-50" },
  TASKER_ON_THE_WAY: { label: "Đang di chuyển", color: "text-amber-600", bg: "bg-amber-50" },
  CHECKED_IN: { label: "Đã đến nơi", color: "text-orange-600", bg: "bg-orange-50" },
  IN_PROGRESS: { label: "Đang làm việc", color: "text-primary", bg: "bg-primary/10" },
  COMPLETED: { label: "Hoàn thành", color: "text-emerald-600", bg: "bg-emerald-50" },
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
const CHECKIN_OPEN_BEFORE = 3000;  // T-30
const CHECKIN_AUTO_CANCEL = 45; // T+45

function parseScheduledStart(schedule: BookingSchedule): Date | null {
  if (!schedule.scheduledStartDate || !schedule.scheduledStartTime) return null;
  const d = new Date(`${schedule.scheduledStartDate}T${schedule.scheduledStartTime}`);
  return isNaN(d.getTime()) ? null : d;
}

function fmtTime(date: Date) {
  return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function fmtCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return m > 0 ? `${m} phút ${s} giây` : `${s} giây`;
}

function CheckinWindowBanner({ schedule }: { schedule: BookingSchedule }) {
  const [now, setNow] = useState(() => Date.now());

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
          Hãy di chuyển để đến nơi đúng giờ. Check-in sớm nhất từ 30 phút trước lịch hẹn.
        </p>
      </div>
    );
  }

  if (diffMin <= 0) {
    const secsUntilCancel = Math.ceil((CHECKIN_AUTO_CANCEL - diffMin) * 60);
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <p className="text-xs font-black text-emerald-700 uppercase tracking-wide">
            Cửa sổ check-in đang mở
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
  const accept = useAcceptBooking();
  const platformCommissionRate = data.price.platformCommissionRate ?? 20;
  const platformFee =
    data.price.platformFee ?? Math.round((data.price.totalPrice * platformCommissionRate) / 100);
  const taskerIncome = data.price.taskerIncome ?? Math.max(data.price.totalPrice - platformFee, 0);

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
          <p className="text-xl font-black text-primary">{data.distance.kilometers.toFixed(1)} km</p>
        </div>
      </div>

      {/* Service info */}
      <div className="bg-card rounded-2xl border border-border/50 p-4 space-y-3">
        <h3 className="font-bold text-foreground text-sm">Dịch vụ</h3>
        <p className="text-base font-semibold">{data.service.name}</p>
        {data.service.description && (
          <p className="text-sm text-muted-foreground">{data.service.description}</p>
        )}
      </div>

      {/* Schedule */}
      <div className="bg-card rounded-2xl border border-border/50 p-4 space-y-2">
        <h3 className="font-bold text-foreground text-sm mb-2">Lịch làm việc</h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>
            {data.schedule.scheduledStartDate} · {data.schedule.scheduledStartTime}
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
              <span className={r.value < 0 ? "text-emerald-600 font-medium" : ""}>
                {r.value < 0 ? "-" : ""}
                {fmtCurrency(Math.abs(r.value))}
              </span>
            </div>
          ))}
        <div className="space-y-2 pt-2 border-t border-border/40">
          <div className="flex justify-between text-sm">
            <span className="font-bold">Tổng tiền của đơn</span>
            <span className="font-black text-foreground">{fmtCurrency(data.price.totalPrice)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Phí nền tảng</span>
            <span className="font-semibold text-red-500">-{fmtCurrency(platformFee)}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-border/40">
            <span className="font-bold text-sm">Thu nhập của bạn</span>
            <span className="font-black text-primary">{fmtCurrency(taskerIncome)}</span>
          </div>
        </div>
      </div>

      {/* Accept button */}
      <SwipeToAccept
        label="Vuốt để nhận đơn"
        successLabel="Đã nhận đơn!"
        onConfirm={handleAccept}
        isLoading={accept.isPending}
      />
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
                Đơn sẽ được trả về trạng thái chờ Tasker mới. Hành động này không thể hoàn tác.
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
            value={PRESET_CANCEL_REASONS.includes(cancelReason) ? "" : cancelReason}
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
  const markCheckedIn = useMarkCheckedIn(bookingId, data.schedule);
  const markStart = useMarkStart(bookingId);
  const markComplete = useMarkComplete(bookingId);
  const cancelByTasker = useCancelByTasker(bookingId);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const {
    tracking,
    isConnected: isTrackingConnected,
    error: trackingError,
    locationAccuracy,
  } = useTaskerLocationTracking(
    bookingId,
    data.status === "TASKER_ON_THE_WAY",
  );

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

  if (data.status === "TASKER_ON_THE_WAY") {
    const customerName =
      data.address?.contactName || data.customer?.fullName || "Khách hàng";
    const customerPhone = data.address?.contactPhone || data.customer?.phone;
    const destinationAddress = data.address?.fullAddress || "Địa chỉ khách hàng";
    const isGpsOnline =
      isTrackingConnected &&
      !trackingError &&
      locationAccuracy !== null &&
      locationAccuracy <= 100;
    const routeSummary = tracking
      ? `${tracking.route.distance.kilometers.toFixed(1)} km · ${tracking.route.duration.minutes} phút`
      : "Đang tính tuyến đường";

    return (
      <div className="-mx-4 -mt-4 md:mx-0 md:mt-0">
        <div className="relative min-h-[calc(100svh-88px)] overflow-hidden bg-background md:rounded-3xl md:border md:border-border/50 md:shadow-md">
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
              <CheckinWindowBanner schedule={data.schedule} />
            </div>

            <ActionButton
              label="Check-in — Tôi đã đến nơi"
              icon={MapPin}
              onClick={() => markCheckedIn.mutate()}
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
      <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl ${statusCfg.bg}`}>
        <div className={`w-2 h-2 rounded-full ${statusCfg.color.replace("text-", "bg-")} ${data.status === "IN_PROGRESS" ? "animate-pulse" : ""}`} />
        <span className={`text-sm font-bold ${statusCfg.color}`}>{statusCfg.label}</span>
      </div>

      {/* Customer info (chỉ hiện khi canContactCustomer) */}
      {canContact && data.customer && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
          <h3 className="font-bold text-sm text-emerald-800 mb-3">Thông tin khách hàng</h3>
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
                  <Phone className="w-3 h-3" /> {data.address?.contactPhone || data.customer.phone}
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
              <p className="text-sm text-foreground font-medium">{data.address.fullAddress}</p>
              {data.address.wardDetail && (
                <p className="text-xs text-muted-foreground">{data.address.wardDetail}</p>
              )}
              {(data.address.buildingFloor || data.address.gate) && (
                <div className="flex items-center gap-2 mt-1">
                  {data.address.buildingFloor && (
                    <span className="text-xs bg-muted px-2 py-1 rounded-md text-foreground">
                      <span className="font-semibold">Tòa/Tầng:</span> {data.address.buildingFloor}
                    </span>
                  )}
                  {data.address.gate && (
                    <span className="text-xs bg-muted px-2 py-1 rounded-md text-foreground">
                      <span className="font-semibold">Cổng:</span> {data.address.gate}
                    </span>
                  )}
                </div>
              )}
              {data.address.driverNote && (
                <div className="text-xs bg-orange-50 text-orange-700 px-3 py-2 rounded-lg mt-2 border border-orange-100">
                  <span className="font-bold block mb-0.5">Lưu ý cho tài xế:</span>
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
          <p className="text-sm text-muted-foreground font-medium">Địa chỉ đầy đủ sẽ hiển thị</p>
          <p className="text-xs text-muted-foreground mt-0.5">khi bạn bắt đầu di chuyển tới</p>
        </div>
      ) : null}

      {/* Service + Schedule */}
      <div className="bg-card rounded-2xl border border-border/50 p-4 space-y-2">
        <p className="font-bold text-sm text-foreground">{data.service.name}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="w-3.5 h-3.5" />
          <span>{data.schedule.scheduledStartDate} · {data.schedule.scheduledStartTime}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          <span>{data.schedule.durationHours} giờ</span>
        </div>
        {data.note && (
          <div className="mt-2 bg-muted/50 rounded-xl p-3">
            <p className="text-xs text-muted-foreground">💬 Ghi chú: {data.note}</p>
          </div>
        )}
      </div>

      {/* Price */}
      <div className="bg-card rounded-2xl border border-border/50 p-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-bold">Tổng giá trị đơn</span>
          <span className="text-lg font-black text-primary">{fmtCurrency(data.price.totalPrice)}</span>
        </div>
        {data.payment && (
          <p className="text-xs text-muted-foreground mt-1">
            Thanh toán: {data.payment.method === "CASH" ? "Tiền mặt" : "Ví"} · {data.payment.status}
          </p>
        )}
      </div>

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
          onClose={() => { setShowCancelDialog(false); setCancelReason(""); }}
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
        <ActionButton
          label="Hoàn thành công việc ✅"
          icon={Flag}
          onClick={() => setShowConfirmComplete(true)}
          isPending={markComplete.isPending}
          color="emerald"
        />
      )}
      {data.status === "COMPLETED" && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
          <p className="text-sm font-bold text-foreground">Đã hoàn thành</p>
          <p className="text-xs text-muted-foreground mt-0.5">Thu nhập đã được ghi vào ví</p>
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
                <h3 className="font-bold text-base text-foreground">Hoàn thành công việc?</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Xác nhận rằng bạn đã hoàn tất toàn bộ các đầu việc dọn dẹp theo yêu cầu của khách hàng. Thu nhập ước tính sẽ được cộng trực tiếp vào tài khoản của bạn.
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
  const MAX_LOCATION_ACCURACY_METERS = 500;
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPostedMode = searchParams.get("mode") === "posted";
  const trackingSocket = useTrackingSocket();

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
        // if (position.coords.accuracy > MAX_LOCATION_ACCURACY_METERS) {
        //   setLocationError(
        //     `Vị trí hiện tại có sai số khoảng ${Math.round(position.coords.accuracy)} m. Hãy bật vị trí chính xác rồi thử lại.`,
        //   );
        //   setLocationErrorKind("inaccurate");
        //   setLocationResolved(true);
        //   setIsRequestingLocation(false);
        //   return;
        // }

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

  const postedQuery = usePostedBookingDetail(
    bookingId,
    location,
    isPostedMode,
  );
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

  useEffect(() => {
    if (isPostedMode || !trackingSocket) return;

    const currentStatus = assignedQuery.data?.status;
    if (currentStatus !== "TASKER_ON_THE_WAY") return;

    // Join tracking room
    trackingSocket.emit("tasker:tracking:start", { bookingId });

    const handleLocationRequest = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            trackingSocket.emit("tasker:location:update", {
              bookingId,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          },
          (err) => {
            if (err.code !== err.PERMISSION_DENIED) {
              setLocationError(
                "Không lấy được vị trí thật để tracking. Hãy bật GPS/vị trí chính xác rồi thử lại.",
              );
            }
          },
          { enableHighAccuracy: true }
        );
      }
    };

    trackingSocket.on("tasker:location:request", handleLocationRequest);

    return () => {
      trackingSocket.emit("tasker:tracking:stop");
      trackingSocket.off("tasker:location:request", handleLocationRequest);
    };
  }, [assignedQuery.data?.status, bookingId, trackingSocket, isPostedMode]);

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
            <p className="text-sm font-semibold">
              Cần quyền truy cập vị trí
            </p>
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
              <div key={i} className="h-20 bg-card rounded-2xl border border-border/50 animate-pulse" />
            ))}
          </div>
        ) : isPostedMode ? (
          postedQuery.isError ? (
            // Check if error is 404 (Not Found / Picked)
            (postedQuery.error as { response?: { status?: number } })?.response?.status === 404 ? (
              <div className="text-center py-16 text-muted-foreground">
                <AlertTriangle className="w-10 h-10 mx-auto mb-2 text-amber-400" />
                <p className="text-sm font-semibold">Đơn không còn khả dụng</p>
                <p className="text-xs mt-1">Có thể đã được nhận bởi tasker khác</p>
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
                <p className="text-sm font-semibold text-red-600">Lỗi tải dữ liệu</p>
                <p className="text-xs mt-1">Không thể kết nối đến máy chủ hoặc lỗi mạng.</p>
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
              <p className="text-xs mt-1">Có thể đã được nhận bởi tasker khác</p>
              <button
                onClick={() => router.back()}
                className="mt-4 text-primary text-sm font-semibold"
              >
                ← Quay lại danh sách
              </button>
            </div>
          )
        ) : assignedQuery.isError ? (
          (assignedQuery.error as { response?: { status?: number } })?.response?.status === 404 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              Không tìm thấy đơn hàng
            </div>
          ) : (
             <div className="text-center py-16 text-muted-foreground">
              <AlertTriangle className="w-10 h-10 mx-auto mb-2 text-red-400" />
              <p className="text-sm font-semibold text-red-600">Lỗi tải dữ liệu</p>
              <p className="text-xs mt-1">Không thể tải thông tin đơn hàng này.</p>
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
