"use client";

import React, { useEffect, useState } from "react";
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
} from "lucide-react";
import {
  usePostedBookingDetail,
  useAssignedBookingDetail,
  useAcceptBooking,
  useMarkOnTheWay,
  useMarkCheckedIn,
  useMarkStart,
  useMarkComplete,
} from "@/features/booking/hooks/useTaskerBooking";
import { useTrackingSocket } from "@/hooks/use-socket";
import type {
  BookingStatus,
  TaskerAssignedBookingDetail,
  TaskerPostedBookingDetail,
} from "@/features/booking/types/booking.types";
import { useTaskerLocationTracking } from "@/features/booking/hooks/useBookingTracking";
import { BookingTrackingMap } from "./BookingTrackingMap";
import { BookingStatusStepper } from "@/features/tasker/_components/BookingStatusStepper";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtCurrency(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

const STATUS_CONFIG: Record<
  BookingStatus,
  { label: string; color: string; bg: string }
> = {
  POSTED: { label: "Chờ nhận", color: "text-blue-600", bg: "bg-blue-50" },
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

// ─── Posted Detail View ───────────────────────────────────────────────────────
function PostedDetailView({
  data,
  bookingId,
  onAccepted,
}: {
  data: TaskerPostedBookingDetail;
  bookingId: string;
  onAccepted: () => void;
}) {
  const accept = useAcceptBooking();

  const handleAccept = async () => {
    try {
      await accept.mutateAsync(bookingId);
      onAccepted();
    } catch (err) {
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
        <div className="flex justify-between pt-2 border-t border-border/40">
          <span className="font-bold text-sm">Bạn nhận được (ước tính)</span>
          <span className="font-black text-primary">{fmtCurrency(data.price.totalPrice)}</span>
        </div>
        <p className="text-[10px] text-muted-foreground">* Sau khi trừ phí nền tảng</p>
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

// ─── Assigned Detail View ─────────────────────────────────────────────────────
function AssignedDetailView({
  data,
  bookingId,
  trackingSocket,
}: {
  data: TaskerAssignedBookingDetail;
  bookingId: string;
  trackingSocket: ReturnType<typeof useTrackingSocket>;
}) {
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationStep, setSimulationStep] = useState(0);

  const destLat = data.address?.latitude ? Number(data.address.latitude) : null;
  const destLng = data.address?.longitude ? Number(data.address.longitude) : null;

  const isDestValid =
    destLat !== null &&
    destLng !== null &&
    !isNaN(destLat) &&
    !isNaN(destLng) &&
    destLat >= -90 &&
    destLat <= 90 &&
    destLng >= -180 &&
    destLng <= 180;

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    if (isSimulating && isDestValid && destLat !== null && destLng !== null) {
      // Điểm xuất phát của Tasker cách điểm đến 0.005 độ (khoảng 500m)
      const startLat = destLat + 0.005;
      const startLng = destLng + 0.005;

      intervalId = setInterval(() => {
        setSimulationStep((prevStep) => {
          const nextStep = prevStep + 1;
          if (nextStep > 10) {
            setIsSimulating(false);
            if (intervalId) clearInterval(intervalId);
            return 0;
          }

          const currentLat = startLat - (startLat - destLat) * (nextStep / 10);
          const currentLng = startLng - (startLng - destLng) * (nextStep / 10);

          if (trackingSocket) {
            trackingSocket.emit("tasker:location:update", {
              bookingId,
              latitude: currentLat,
              longitude: currentLng,
            });
          }

          return nextStep;
        });
      }, 2000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isSimulating, isDestValid, destLat, destLng, trackingSocket, bookingId]);

  const handleToggleSimulation = () => {
    setIsSimulating((prev) => {
      const next = !prev;
      if (!next) {
        setSimulationStep(0);
      }
      return next;
    });
  };
  const router = useRouter();
  const markOnWay = useMarkOnTheWay(bookingId);
  const markCheckedIn = useMarkCheckedIn(bookingId);
  const markStart = useMarkStart(bookingId);
  const markComplete = useMarkComplete(bookingId);
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

            <ActionButton
              label="Check-in — Tôi đã đến nơi"
              icon={MapPin}
              onClick={() => markCheckedIn.mutate()}
              isPending={markCheckedIn.isPending}
              color="amber"
            />

            {process.env.NODE_ENV === "development" && (
              <div className="mt-3 flex items-center justify-between gap-4 rounded-2xl border border-dashed border-primary/40 bg-card p-4 shadow-sm">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black uppercase tracking-wider text-primary">
                    Bộ giả lập GPS di chuyển
                  </p>
                  <p className="mt-1 text-[10px] font-semibold text-muted-foreground">
                    {isSimulating
                      ? `Đang gửi tọa độ: Chặng ${simulationStep}/10`
                      : "Giả lập GPS chạy xe tới nhà khách hàng"}
                  </p>
                </div>
                <button
                  onClick={handleToggleSimulation}
                  className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider shadow-sm transition-all select-none ${
                    isSimulating
                      ? "bg-red-500 text-white shadow-red-200 hover:bg-red-600"
                      : "bg-primary text-white shadow-primary/20 hover:bg-primary/95"
                  }`}
                >
                  {isSimulating ? "Dừng" : "Giả lập"}
                </button>
              </div>
            )}
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
        <ActionButton
          label="Bắt đầu di chuyển tới"
          icon={Navigation}
          onClick={() => markOnWay.mutate()}
          isPending={markOnWay.isPending}
          color="amber"
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
      {(data.status === "COMPLETED" || data.status === "CANCELLED") && (
        <div className="bg-muted/50 rounded-2xl p-4 text-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
          <p className="text-sm font-bold text-foreground">
            {data.status === "COMPLETED" ? "Đã hoàn thành" : "Đã bị hủy"}
          </p>
          {data.status === "COMPLETED" && (
            <p className="text-xs text-muted-foreground mt-0.5">Thu nhập đã được ghi vào ví</p>
          )}
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
        if (position.coords.accuracy > MAX_LOCATION_ACCURACY_METERS) {
          setLocationError(
            `Vị trí hiện tại có sai số khoảng ${Math.round(position.coords.accuracy)} m. Hãy bật vị trí chính xác rồi thử lại.`,
          );
          setLocationErrorKind("inaccurate");
          setLocationResolved(true);
          setIsRequestingLocation(false);
          return;
        }

        setLocation({
          currentLatitude: position.coords.latitude,
          currentLongitude: position.coords.longitude,
        });
        setLocationResolved(true);
        setIsRequestingLocation(false);
      },
      (error) => {
        let message =
          "Không thể xác định vị trí. Hãy bật GPS rồi thử lại.";
        let errorKind: LocationErrorKind = "location-disabled";

        if (error.code === error.PERMISSION_DENIED) {
          message =
            "Quyền vị trí đang bị chặn. Hãy mở cài đặt trang của trình duyệt, chọn Vị trí → Cho phép rồi thử lại.";
          errorKind = "permission-denied";
        } else if (error.code === error.TIMEOUT) {
          message =
            "Chưa nhận được tín hiệu GPS. Hãy bật Vị trí chính xác, ra nơi thoáng và thử lại.";
          errorKind = "timeout";
        }

        setLocationError(message);
        setLocationErrorKind(errorKind);
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
            console.error("Lỗi lấy vị trí Tasker định kỳ:", err);
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
        ) : isLoading ? (
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
          <AssignedDetailView data={assignedQuery.data} bookingId={bookingId} trackingSocket={trackingSocket} />
        ) : (
          <div className="text-center py-16 text-muted-foreground text-sm">
            Đang tải...
          </div>
        )}
      </div>
    </div>
  );
};
