"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import type {
  BookingStatus,
  TaskerAssignedBookingDetail,
  TaskerPostedBookingDetail,
} from "@/features/booking/types/booking.types";
import { useTaskerLocationTracking } from "@/features/booking/hooks/useBookingTracking";
import { BookingTrackingMap } from "./BookingTrackingMap";

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

  const handleAccept = () => {
    accept.mutate(bookingId, {
      onSuccess: () => onAccepted(),
    });
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
      <ActionButton
        label="Nhận đơn ngay 🎯"
        icon={CheckCircle2}
        onClick={handleAccept}
        isPending={accept.isPending}
        color="primary"
      />
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
  const markOnWay = useMarkOnTheWay(bookingId);
  const markCheckedIn = useMarkCheckedIn(bookingId);
  const markStart = useMarkStart(bookingId);
  const markComplete = useMarkComplete(bookingId);
  const {
    tracking,
    isConnected: isTrackingConnected,
    error: trackingError,
    lastUpdatedAt,
    locationAccuracy,
  } = useTaskerLocationTracking(
    bookingId,
    data.status === "TASKER_ON_THE_WAY",
  );

  const statusCfg = STATUS_CONFIG[data.status] ?? STATUS_CONFIG.CONFIRMED;
  const canContact = data.canContactCustomer;

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
              <p className="font-semibold text-sm text-foreground">{data.customer.fullName ?? "—"}</p>
              {data.customer.phone && (
                <a
                  href={`tel:${data.customer.phone}`}
                  className="flex items-center gap-1 text-xs text-emerald-600 font-medium mt-0.5"
                >
                  <Phone className="w-3 h-3" /> {data.customer.phone}
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Address (full khi canContactCustomer) */}
      {canContact && data.address ? (
        <div className="bg-card rounded-2xl border border-border/50 p-4 space-y-1">
          <h3 className="font-bold text-sm mb-2 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-primary" /> Địa chỉ làm việc
          </h3>
          <p className="text-sm text-foreground font-medium">{data.address.fullAddress}</p>
          {data.address.wardDetail && (
            <p className="text-xs text-muted-foreground">{data.address.wardDetail}</p>
          )}
          {data.address.hasPet && (
            <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full inline-flex items-center gap-0.5 mt-1">
              <PawPrint className="w-2.5 h-2.5" /> Nhà có thú cưng
            </span>
          )}
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
      {data.status === "TASKER_ON_THE_WAY" && (
        <>
          <BookingTrackingMap
            viewer="tasker"
            tracking={tracking}
            isConnected={
              isTrackingConnected &&
              !trackingError &&
              locationAccuracy !== null &&
              locationAccuracy <= 100
            }
            error={trackingError}
            fallbackDestination={{
              latitude: data.address?.latitude,
              longitude: data.address?.longitude,
              address: data.address?.fullAddress,
            }}
          />
          <div
            className={`rounded-2xl border p-4 ${
              trackingError
                ? "border-red-200 bg-red-50"
                : "border-blue-200 bg-blue-50"
            }`}
          >
            <div className="flex items-center gap-2">
              <Navigation
                className={`h-4 w-4 ${
                  trackingError ? "text-red-500" : "text-blue-600"
                }`}
              />
              <p
                className={`text-sm font-bold ${
                  trackingError ? "text-red-700" : "text-blue-700"
                }`}
              >
                {trackingError
                  ? "Chưa thể chia sẻ vị trí"
                  : isTrackingConnected
                    ? "Đang chia sẻ vị trí với khách hàng"
                    : "Đang kết nối định vị..."}
              </p>
            </div>
            <p
              className={`mt-1 text-xs ${
                trackingError ? "text-red-600" : "text-blue-600"
              }`}
            >
              {trackingError ??
                (lastUpdatedAt
                  ? `Cập nhật gần nhất lúc ${new Date(lastUpdatedAt).toLocaleTimeString("vi-VN")}${
                      locationAccuracy !== null
                        ? ` · Sai số ±${locationAccuracy} m`
                        : ""
                    }`
                  : "Giữ GPS và kết nối mạng trong lúc di chuyển.")}
            </p>
          </div>
          <ActionButton
            label="Check-in — Tôi đã đến nơi"
            icon={MapPin}
            onClick={() => markCheckedIn.mutate()}
            isPending={markCheckedIn.isPending}
            color="amber"
          />
        </>
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
          onClick={() => markComplete.mutate()}
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
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export const TaskerJobDetailPage: React.FC<{ bookingId: string; mode?: string }> = ({
  bookingId,
  mode,
}) => {
  const MAX_LOCATION_ACCURACY_METERS = 500;
  const router = useRouter();
  const isPostedMode = mode === "posted";

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
            className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0"
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
          postedQuery.data ? (
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
        ) : assignedQuery.data ? (
          <AssignedDetailView data={assignedQuery.data} bookingId={bookingId} />
        ) : (
          <div className="text-center py-16 text-muted-foreground text-sm">
            Không tìm thấy đơn hàng
          </div>
        )}
      </div>
    </div>
  );
};
