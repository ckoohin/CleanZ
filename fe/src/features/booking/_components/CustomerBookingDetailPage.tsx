"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  MapPin,
  Calendar,
  User,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Star,
  FileText,
  Pencil,
  Loader2,
  Navigation,
  Sparkles,
  UserX,
  ShieldAlert,
  CreditCard,
  HelpCircle,
  ShieldCheck,
  Briefcase,
  ChevronRight,
} from "lucide-react";
import {
  useBookingDetail,
  useCancelBooking,
  useConfirmTaskerBooking,
  useDeclineTaskerBooking,
  useUpdateBookingSchedule,
} from "@/features/booking/hooks/useCustomerBooking";
import { GoongMap } from "@/components/maps/GoongMap";
import { TaskerTrackingMap } from "./TaskerTrackingMap";
import { GoongAutocomplete } from "@/components/maps/GoongAutocomplete";
import { GOONG_API_KEY } from "@/lib/maps/goong-config";
import type {
  BookingStatus,
  CustomerBookingDetail,
  StatusLog,
  UpdateBookingScheduleDto,
} from "@/features/booking/types/booking.types";
import { useCustomerBookingTracking } from "@/features/booking/hooks/useBookingTracking";
import { BookingTrackingMap } from "./BookingTrackingMap";
import { useQueryClient } from "@tanstack/react-query";
import { useTrackingSocket } from "@/hooks/use-socket";
import type { BookingStatusUpdatedPayload } from "@/features/booking/types/tracking.types";
import { useMyReview, useTaskerPublicReviews } from "@/features/customer/history/hooks/useReview";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtCurrency(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}
function fmtDate(d: string) {
  return new Date(d).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_CONFIG: Record<
  BookingStatus,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  POSTED: {
    label: "Đang tìm Tasker",
    color: "text-blue-600",
    bg: "bg-blue-50",
    icon: <Clock className="w-4 h-4" />,
  },
  PENDING_CUSTOMER_CONFIRMATION: {
    label: "Chờ bạn xác nhận",
    color: "text-amber-600",
    bg: "bg-amber-50",
    icon: <AlertTriangle className="w-4 h-4" />,
  },
  CONFIRMED: {
    label: "Đã xác nhận",
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
  TASKER_ON_THE_WAY: {
    label: "Tasker đang đến",
    color: "text-amber-600",
    bg: "bg-amber-50",
    icon: <MapPin className="w-4 h-4 animate-bounce" />,
  },
  CHECKED_IN: {
    label: "Tasker đã đến",
    color: "text-orange-600",
    bg: "bg-orange-50",
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
  IN_PROGRESS: {
    label: "Đang làm việc",
    color: "text-primary",
    bg: "bg-primary/10",
    icon: <Clock className="w-4 h-4 animate-spin" />,
  },
  COMPLETED: {
    label: "Đã hoàn thành",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
  CANCELLED: {
    label: "Đã hủy",
    color: "text-slate-500",
    bg: "bg-slate-100",
    icon: <XCircle className="w-4 h-4" />,
  },
  EXPIRED: {
    label: "Hết hạn",
    color: "text-slate-500",
    bg: "bg-slate-100",
    icon: <XCircle className="w-4 h-4" />,
  },
};

const TIME_SLOTS = [
  "07:00","08:00","09:00","10:00","13:00","14:00","15:00","16:00",
];

function getNext7Days() {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push({
      date: d.toISOString().split("T")[0],
      label:
        i === 0
          ? "Hôm nay"
          : i === 1
          ? "Ngày mai"
          : d.toLocaleDateString("vi-VN", { weekday: "short" }),
      dayNum: d.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
      }),
    });
  }
  return days;
}

// ─── Panel xác nhận đơn do tasker tạo hộ ──────────────────────────────────────
function PendingConfirmationPanel({ booking }: { booking: CustomerBookingDetail }) {
  const confirm = useConfirmTaskerBooking(booking.id);
  const decline = useDeclineTaskerBooking(booking.id);
  const [remainingSec, setRemainingSec] = useState<number | null>(null);

  useEffect(() => {
    if (!booking.confirmationDeadline) return;
    const deadline = new Date(booking.confirmationDeadline).getTime();
    const tick = () =>
      setRemainingSec(Math.max(0, Math.floor((deadline - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [booking.confirmationDeadline]);

  const expired = remainingSec === 0;
  const mm = remainingSec != null ? Math.floor(remainingSec / 60) : null;
  const ss = remainingSec != null ? remainingSec % 60 : null;
  const isBusy = confirm.isPending || decline.isPending;

  return (
    <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-5 shadow-sm space-y-3 animate-in fade-in duration-300">
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-extrabold text-sm text-foreground">
            {booking.tasker?.fullName
              ? `Tasker ${booking.tasker.fullName} đã tạo đơn cho bạn`
              : "Tasker đã tạo đơn cho bạn"}
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Vui lòng xác nhận để tasker bắt đầu công việc
          </p>
        </div>
        {remainingSec != null && !expired && (
          <span className="shrink-0 rounded-xl bg-amber-100 px-2.5 py-1.5 text-sm font-black tabular-nums text-amber-700">
            {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-card/80 px-4 py-3">
        <span className="text-xs text-muted-foreground">
          {booking.schedule.durationHours}h · {booking.schedule.scheduledStartDate}{" "}
          {booking.schedule.scheduledStartTime?.slice(0, 5)}
        </span>
        <span className="text-base font-black text-primary">
          {fmtCurrency(booking.price.totalPrice)}
        </span>
      </div>

      {expired ? (
        <p className="text-center text-xs font-semibold text-red-600">
          Đã hết thời hạn xác nhận — đơn sẽ tự động hủy
        </p>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => decline.mutate()}
            disabled={isBusy}
            className="flex-1 rounded-2xl border border-border bg-card py-3 text-sm font-bold text-foreground disabled:opacity-50"
          >
            {decline.isPending ? (
              <Loader2 className="mx-auto h-4 w-4 animate-spin" />
            ) : (
              "Từ chối"
            )}
          </button>
          <button
            onClick={() => confirm.mutate()}
            disabled={isBusy}
            className="flex-[2] rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {confirm.isPending ? (
              <Loader2 className="mx-auto h-4 w-4 animate-spin" />
            ) : (
              "Xác nhận đơn ✓"
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Cancel Dialog ─────────────────────────────────────────────────────────────
function CancelDialog({
  bookingId,
  open,
  onClose,
}: {
  bookingId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const cancel = useCancelBooking(bookingId);
  const router = useRouter();

  const handleConfirm = () => {
    cancel.mutate(
      { reason: reason.trim() || undefined },
      {
        onSuccess: () => {
          onClose();
          router.push("/customer/history");
        },
      }
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl p-6"
          >
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />
            <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <h3 className="text-lg font-bold text-center mb-1">Hủy đơn hàng?</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Hành động này không thể hoàn tác
            </p>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Lý do hủy (tuỳ chọn)..."
              className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 border border-border rounded-2xl text-sm font-bold text-foreground"
              >
                Không hủy
              </button>
              <button
                onClick={handleConfirm}
                disabled={cancel.isPending}
                className="flex-1 py-3 bg-red-500 text-white rounded-2xl text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {cancel.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Xác nhận hủy"
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Edit Schedule & Address Sheet ────────────────────────────────────────────
function EditScheduleSheet({
  bookingId,
  currentDate,
  currentTime,
  open,
  onClose,
}: {
  bookingId: string;
  currentDate: string;
  currentTime: string;
  open: boolean;
  onClose: () => void;
}) {
  const [selectedDate, setSelectedDate] = useState(currentDate);
  const [selectedTime, setSelectedTime] = useState(currentTime);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [selectedLat, setSelectedLat] = useState<number | null>(null);
  const [selectedLng, setSelectedLng] = useState<number | null>(null);
  const [showMap, setShowMap] = useState(false);

  const update = useUpdateBookingSchedule(bookingId);
  const days = getNext7Days();

  const handleMapSelect = (lat: number, lng: number, address: string) => {
    setSelectedLat(lat);
    setSelectedLng(lng);
    setSelectedAddress(address);
  };

  const handleAutoSelect = (placeId: string, description: string) => {
    fetch(
      `https://rsapi.goong.io/Place/Detail?place_id=${placeId}&api_key=${GOONG_API_KEY}`
    )
      .then((r) => r.json())
      .then((data) => {
        const loc = data?.result?.geometry?.location;
        setSelectedAddress(description);
        if (loc) {
          setSelectedLat(loc.lat);
          setSelectedLng(loc.lng);
        }
      })
      .catch(() => setSelectedAddress(description));
  };

  const handleSave = () => {
    const dto: UpdateBookingScheduleDto = {
      scheduledDate: selectedDate,
      scheduledTime: selectedTime,
    };
    if (selectedLat !== null) dto.latitude = selectedLat;
    if (selectedLng !== null) dto.longitude = selectedLng;
    update.mutate(dto, { onSuccess: onClose });
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl overflow-y-auto max-h-[90vh]"
          >
            <div className="p-5 space-y-5">
              {/* Handle */}
              <div className="w-10 h-1 bg-border rounded-full mx-auto" />
              <h3 className="text-base font-bold text-foreground text-center">
                Sửa lịch & địa chỉ
              </h3>

              {/* Chọn ngày */}
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Ngày làm việc
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {days.map((d) => {
                    const selected = selectedDate === d.date;
                    return (
                      <button
                        key={d.date}
                        onClick={() => setSelectedDate(d.date)}
                        className={`flex-shrink-0 w-20 py-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all text-xs ${
                          selected
                            ? "border-primary bg-primary text-white shadow-md"
                            : "border-border/50 text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        <span className="font-bold">{d.label}</span>
                        <span className="font-semibold">{d.dayNum}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Chọn giờ */}
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Giờ bắt đầu
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {TIME_SLOTS.map((t) => {
                    const selected = selectedTime === t;
                    return (
                      <button
                        key={t}
                        onClick={() => setSelectedTime(t)}
                        className={`py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${
                          selected
                            ? "border-primary bg-primary text-white"
                            : "border-border/50 text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Địa chỉ */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> Địa chỉ (tuỳ chọn)
                  </p>
                  <button
                    onClick={() => setShowMap(!showMap)}
                    className="text-xs text-primary font-semibold"
                  >
                    {showMap ? "Ẩn bản đồ" : "Mở bản đồ GoongMap"}
                  </button>
                </div>

                <GoongAutocomplete
                  onSelect={handleAutoSelect}
                  placeholder="Tìm địa chỉ mới..."
                  className="mb-2"
                />

                {showMap && (
                  <div className="rounded-xl overflow-hidden border border-border/50 mb-2">
                    <GoongMap
                      initialLat={selectedLat ?? 21.028511}
                      initialLng={selectedLng ?? 105.804817}
                      onLocationSelect={handleMapSelect}
                    />
                  </div>
                )}

                {selectedAddress && (
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-start gap-2">
                    <Navigation className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-xs text-foreground">{selectedAddress}</p>
                  </div>
                )}

                {!selectedAddress && (
                  <p className="text-xs text-muted-foreground">
                    Để trống nếu không muốn thay đổi địa chỉ
                  </p>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pb-4">
                <button
                  onClick={onClose}
                  className="flex-1 py-3.5 border border-border rounded-2xl text-sm font-bold text-foreground"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handleSave}
                  disabled={update.isPending}
                  className="flex-1 py-3.5 bg-primary text-white rounded-2xl text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-1 shadow-md shadow-primary/30"
                >
                  {update.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Lưu thay đổi ✓"
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Status Timeline ──────────────────────────────────────────────────────────
function StatusTimeline({ logs }: { logs: StatusLog[] }) {
  if (!logs.length) return null;
  return (
    <div className="bg-card rounded-2xl border border-border/50 p-4">
      <h3 className="font-bold text-sm mb-3">Lịch sử trạng thái</h3>
      <div className="relative pl-5 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-border">
        {logs.map((log) => (
          <div key={log.id} className="relative">
            <div className="absolute -left-5 w-4 h-4 bg-primary/20 rounded-full border-2 border-primary flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-primary rounded-full" />
            </div>
            <p className="text-sm font-semibold text-foreground">{log.newStatus}</p>
            <p className="text-xs text-muted-foreground">{fmtDate(log.createdAt)}</p>
            {log.note && (
              <p className="text-xs text-muted-foreground/70 mt-0.5">{log.note}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export const CustomerBookingDetailPage: React.FC<{ bookingId: string }> = ({
  bookingId,
}) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const socket = useTrackingSocket();
  const { data: booking, isLoading, refetch } = useBookingDetail(bookingId);
  const { data: myReview, isLoading: isReviewLoading } = useMyReview(bookingId);
  const trackingEnabled = booking?.status === "TASKER_ON_THE_WAY";
  const {
    tracking,
    isConnected: isTrackingConnected,
    error: trackingError,
  } = useCustomerBookingTracking(bookingId, trackingEnabled);
  const [showCancel, setShowCancel] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showReportSheet, setShowReportSheet] = useState(false);
  const [showTaskerModal, setShowTaskerModal] = useState(false);
  const [showAvatarZoom, setShowAvatarZoom] = useState(false);
  const [taskerReviewPage, setTaskerReviewPage] = useState(1);
  const [taskerLocation, setTaskerLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const [isMapFullscreen, setIsMapFullscreen] = useState(false);

  const destLat = booking?.address?.latitude ? Number(booking.address.latitude) : null;
  const destLng = booking?.address?.longitude ? Number(booking.address.longitude) : null;

  const isDestCoordsValid =
    destLat !== null &&
    destLng !== null &&
    !isNaN(destLat) &&
    !isNaN(destLng) &&
    destLat >= -90 &&
    destLat <= 90 &&
    destLng >= -180 &&
    destLng <= 180;

  const displayTaskerLat = taskerLocation?.latitude ?? (isDestCoordsValid ? destLat + 0.003 : null);
  const displayTaskerLng = taskerLocation?.longitude ?? (isDestCoordsValid ? destLng + 0.003 : null);
  const taskerReviews = useTaskerPublicReviews(
    showTaskerModal ? booking?.tasker?.id : null,
    taskerReviewPage,
    5,
  );

  const isCompleted = booking?.status === "COMPLETED";
  const hasReviewed = !!myReview?.review;
  const taskerReviewTotalPages = Math.max(taskerReviews.data?.totalPages ?? 1, 1);
  const taskerReviewAvg =
    taskerReviews.data?.avgRating ?? booking?.tasker?.ratingAvg ?? 0;

  // Tự động bật bản đồ Full Screen khi trạng thái chuyển sang TASKER_ON_THE_WAY
  useEffect(() => {
    if (booking?.status === "TASKER_ON_THE_WAY") {
      const timer = setTimeout(() => {
        setIsMapFullscreen(true);
      }, 0);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setIsMapFullscreen(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [booking?.status]);

  // Lắng nghe socket realtime
  useEffect(() => {
    if (!bookingId || !socket) return;

    const joinBookingRoom = () => {
      socket.emit("booking:join", { bookingId });
    };

    const refreshBooking = () => {
      void queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
      void queryClient.invalidateQueries({ queryKey: ["booking", "my-active"] });
      void queryClient.invalidateQueries({ queryKey: ["booking", "my-list"] });
      void refetch();
    };

    const handleRefresh = (payload?: { bookingId?: string }) => {
      if (payload?.bookingId && payload.bookingId !== bookingId) return;
      refreshBooking();
    };

    const applyStatusToCache = (
      payload: {
        bookingId?: string;
        status?: BookingStatus;
        changedAt?: string;
        checkedInAt?: string | null;
        completedAt?: string | null;
        paymentStatus?: CustomerBookingDetail["payment"]["status"] | null;
      },
    ) => {
      if (!payload?.bookingId || payload.bookingId !== bookingId) return;

      queryClient.setQueryData<CustomerBookingDetail | undefined>(
        ["booking", bookingId],
        (current) => {
          if (!current || !payload.status) return current;

          return {
            ...current,
            status: payload.status,
            payment: payload.paymentStatus
              ? { ...current.payment, status: payload.paymentStatus }
              : current.payment,
            checkedInAt: payload.checkedInAt ?? current.checkedInAt,
            completedAt: payload.completedAt ?? current.completedAt,
            updatedAt: payload.changedAt ?? current.updatedAt,
          };
        },
      );

      refreshBooking();
    };

    interface TaskerLocationPayload {
      bookingId: string;
      latitude: number;
      longitude: number;
      updatedAt?: string;
    }

    const handleLocationUpdated = (data: TaskerLocationPayload) => {
      if (data && data.bookingId === bookingId && data.latitude && data.longitude) {
        setTaskerLocation({
          latitude: data.latitude,
          longitude: data.longitude,
        });
      }
    };

    const handleStatusChanged = (payload: { bookingId?: string; status?: BookingStatus }) => {
      applyStatusToCache(payload);
    };

    const handleStatusUpdated = (payload: BookingStatusUpdatedPayload) => {
      applyStatusToCache(payload);
    };

    socket.on("connect", joinBookingRoom);
    socket.on("booking:status_changed", handleStatusChanged);
    socket.on("booking:status_updated", handleStatusUpdated);
    socket.on("tasker:arrived", handleStatusChanged);
    socket.on("booking:in_progress", handleStatusChanged);
    socket.on("booking:completed", handleStatusChanged);
    socket.on("customer:notification", handleRefresh);
    socket.on("tasker:location:updated", handleLocationUpdated);

    if (socket.connected) {
      joinBookingRoom();
    } else {
      socket.connect();
    }

    return () => {
      socket.off("connect", joinBookingRoom);
      socket.off("booking:status_changed", handleStatusChanged);
      socket.off("booking:status_updated", handleStatusUpdated);
      socket.off("tasker:arrived", handleStatusChanged);
      socket.off("booking:in_progress", handleStatusChanged);
      socket.off("booking:completed", handleStatusChanged);
      socket.off("customer:notification", handleRefresh);
      socket.off("tasker:location:updated", handleLocationUpdated);
    };
  }, [bookingId, socket, queryClient, refetch]);

  const REPORT_OPTIONS = [
    { category: "SERVICE_QUALITY", icon: Sparkles, label: "Chất lượng dọn dẹp chưa sạch", desc: "Không đạt yêu cầu vệ sinh cam kết" },
    { category: "TASKER_BEHAVIOR", icon: UserX, label: "Thái độ Tasker không phù hợp", desc: "Tasker giao tiếp thiếu lịch sự hoặc trễ giờ" },
    { category: "PROPERTY_DAMAGE", icon: ShieldAlert, label: "Hư hỏng hoặc thất lạc tài sản", desc: "Có đồ vật bị bể vỡ hoặc mất mát trong quá trình dọn" },
    { category: "PAYMENT_BILLING", icon: CreditCard, label: "Vấn đề về thanh toán / Phụ phí", desc: "Sai lệch số tiền hoặc lỗi trừ ví" },
    { category: "OTHER", icon: HelpCircle, label: "Các vấn đề khác", desc: "Gặp sự cố khác cần nhân viên hỗ trợ giải quyết" },
  ];

  const handleReportOption = (opt: typeof REPORT_OPTIONS[0]) => {
    if (!booking) return;
    const subject = `Khiếu nại đơn hàng ${booking.bookingCode}`;
    const description = `Tôi muốn phản hồi về sự cố liên quan đến đơn hàng ${booking.bookingCode}. Vấn đề: ${opt.label}.\nYêu cầu phản hồi từ CleanZ: ...`;
    router.push(
      `/customer/support-tickets?bookingId=${booking.id}&category=${opt.category}&subject=${encodeURIComponent(
        subject
      )}&description=${encodeURIComponent(description)}`
    );
  };

  // Chỉ POSTED mới được sửa lịch + hủy. CONFIRMED chỉ được hủy.
  const canEdit = booking?.status === "POSTED";
  const canCancel =
    booking?.status === "POSTED" || booking?.status === "CONFIRMED";
  const statusCfg = booking ? STATUS_CONFIG[booking.status] : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-48">
        <div className="bg-card px-4 pt-12 pb-4 shadow-sm">
          <div className="h-6 w-40 bg-muted rounded animate-pulse" />
        </div>
        <div className="px-4 py-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-20 bg-card rounded-2xl border border-border/50 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <p className="text-muted-foreground text-sm">Không tìm thấy đơn hàng</p>
        <button
          onClick={() => router.back()}
          className="mt-3 text-primary text-sm font-semibold"
        >
          ← Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-48">
      {/* Header */}
      <div className="bg-card px-4 pt-12 pb-4 shadow-sm sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/customer/history")}
            className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-primary">
              {booking.bookingCode}
            </p>
            <h1 className="font-bold text-sm text-foreground">
              {booking.service.name}
            </h1>
          </div>
          {statusCfg && (
            <span
              className={`text-xs font-bold flex items-center gap-1 px-2 py-1 rounded-lg ${statusCfg.color} ${statusCfg.bg}`}
            >
              {statusCfg.icon} {statusCfg.label}
            </span>
          )}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Panel xác nhận đơn do tasker tạo hộ */}
        {booking.status === "PENDING_CUSTOMER_CONFIRMATION" && (
          <PendingConfirmationPanel booking={booking} />
        )}
        {/* Banner Đặt lịch thành công */}
        {booking.status === "POSTED" && (
          <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-3xl p-5 shadow-sm space-y-2 animate-in fade-in duration-300">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-600 font-extrabold text-sm shrink-0">🎉</span>
              <h3 className="font-extrabold text-sm text-foreground">Đặt lịch thành công!</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Yêu cầu đặt lịch của bạn đã được ghi nhận. Hệ thống đang tìm kiếm chuyên gia dọn dẹp phù hợp nhất cho bạn. Bạn có thể theo dõi tiến trình đơn hàng trực tiếp tại trang này.
            </p>
          </div>
        )}
        {/* Realtime Tracking Map — ưu tiên full map trên mobile giống Grab */}
        {booking.status === "TASKER_ON_THE_WAY" && (
          <BookingTrackingMap
            tracking={tracking}
            isConnected={isTrackingConnected}
            error={trackingError}
            fallbackDestination={{
              latitude: booking.address.latitude,
              longitude: booking.address.longitude,
              address: booking.address.fullAddress,
            }}
          />
        )}

        {/* Tasker card */}
        {booking.tasker ? (
          <div className="space-y-2">
            <div
              onClick={() => {
                setTaskerReviewPage(1);
                setShowTaskerModal(true);
              }}
              className="bg-card rounded-2xl border border-border/50 p-4 flex items-center justify-between gap-3 shadow-sm cursor-pointer hover:bg-muted/10 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                  {booking.tasker.avatarUrl ? (
                    <img
                      src={booking.tasker.avatarUrl}
                      alt={booking.tasker.fullName ?? ""}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-6 h-6 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-foreground truncate flex items-center gap-1 group-hover:text-primary transition-colors">
                    {booking.tasker.fullName ?? "Tasker"}
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5 text-xs font-semibold">
                    <span className="text-amber-500 flex items-center gap-0.5 shrink-0">
                      <Star className="w-3 h-3 fill-amber-400" />{" "}
                      {booking.tasker.ratingAvg && booking.tasker.ratingAvg > 0
                        ? booking.tasker.ratingAvg.toFixed(1)
                        : "5.0"}
                    </span>
                    <span className="text-muted-foreground/40 shrink-0">•</span>
                    <span className="text-muted-foreground flex items-center gap-1 truncate">
                      <Briefcase className="w-3 h-3 text-primary/75 shrink-0" />
                      {booking.tasker.totalCompletedJobs ?? 0} đơn hoàn thành
                    </span>
                  </div>
                </div>
              </div>
              <span className="shrink-0 rounded-xl bg-primary/10 px-3 py-2 text-[11px] font-extrabold text-primary">
                Xem hồ sơ
              </span>
            </div>

            {/* Đánh giá sau khi hoàn thành */}
            {isCompleted && (
              <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                    <Star className="h-5 w-5 fill-amber-400 text-amber-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-extrabold text-foreground">
                      {hasReviewed ? "Bạn đã đánh giá đơn này" : "Đánh giá trải nghiệm dịch vụ"}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {hasReviewed
                        ? "Cảm ơn bạn đã gửi phản hồi. Bạn có thể xem lại nội dung đánh giá của mình."
                        : "Chia sẻ cảm nhận của bạn để CleanZ cải thiện chất lượng và hỗ trợ Tasker tốt hơn."}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    void queryClient.invalidateQueries({
                      queryKey: ["booking", booking.id],
                    });
                    void queryClient.invalidateQueries({
                      queryKey: ["reviews", "booking", booking.id],
                    });
                    router.push(`/customer/history/review/${booking.id}`);
                  }}
                  disabled={isReviewLoading}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-xs font-black text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 active:scale-[0.99] disabled:opacity-60"
                >
                  {isReviewLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang kiểm tra đánh giá...
                    </>
                  ) : (
                    <>
                      <Star className="h-4 w-4 fill-current" />
                      {hasReviewed ? "Xem đánh giá" : "Đánh giá ngay"}
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Nút báo cáo sự cố khi đơn đã kết thúc */}
            {(booking.status === "COMPLETED" || booking.status === "CANCELLED") && (
              <button
                onClick={() => setShowReportSheet(true)}
                className="w-full py-3 bg-red-500/5 hover:bg-red-500/10 text-red-600 font-bold text-xs rounded-2xl border border-red-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                Báo cáo sự cố hoặc khiếu nại đơn này
              </button>
            )}
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-3">
            <Clock className="w-5 h-5 text-blue-500 animate-pulse" />
            <div>
              <p className="text-sm font-bold text-blue-700">Đang tìm Tasker</p>
              <p className="text-xs text-blue-600/70">
                Hệ thống sẽ thông báo khi có Tasker nhận đơn
              </p>
            </div>
          </div>
        )}

        {/* Schedule — nút Sửa khi POSTED */}
        <div className="bg-card rounded-2xl border border-border/50 p-4 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-sm">Lịch làm việc</h3>
            {canEdit && (
              <button
                onClick={() => setShowEdit(true)}
                className="flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1.5 rounded-lg hover:bg-primary/20 transition-colors"
              >
                <Pencil className="w-3 h-3" /> Sửa lịch & địa chỉ
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>
              {booking.schedule.scheduledStartDate} ·{" "}
              {booking.schedule.scheduledStartTime}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>Thời lượng: {booking.schedule.durationHours} giờ</span>
          </div>
        </div>

        {/* Address */}
        <div className="bg-card rounded-2xl border border-border/50 p-4 space-y-1">
          <h3 className="font-bold text-sm mb-1 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-primary" /> Địa chỉ
          </h3>
          <p className="text-sm text-foreground">{booking.address.fullAddress}</p>
          {booking.address.hasPet && (
            <p className="text-xs text-amber-600 mt-1">🐾 Nhà có thú cưng</p>
          )}
        </div>

        {/* Price */}
        <div className="bg-card rounded-2xl border border-border/50 p-4 space-y-2">
          <h3 className="font-bold text-sm mb-1">Chi tiết giá</h3>
          {[
            { label: "Giá cơ bản", value: booking.price.basePrice },
            { label: "Phụ phí", value: booking.price.addonPrice ?? 0 },
            { label: "Phí cao điểm", value: booking.price.peakFee },
            { label: "Phí thú cưng", value: booking.price.petFee },
            { label: "Giảm giá", value: -booking.price.discountAmount },
          ]
            .filter((r) => r.value !== 0)
            .map((r) => (
              <div key={r.label} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{r.label}</span>
                <span className={r.value < 0 ? "text-emerald-600" : ""}>
                  {r.value < 0 ? "-" : ""}
                  {fmtCurrency(Math.abs(r.value))}
                </span>
              </div>
            ))}
          <div className="flex justify-between pt-2 border-t border-border/40">
            <span className="font-bold text-sm">Tổng thanh toán</span>
            <span className="font-black text-primary text-base">
              {fmtCurrency(booking.price.totalPrice)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Thanh toán:{" "}
            {booking.payment.method === "CASH" ? "Tiền mặt" : booking.payment.method}
            {" · "}
            {booking.payment.status === "PENDING"
              ? "Chưa thanh toán"
              : "Đã thanh toán"}
          </p>
        </div>

        {/* Note */}
        {booking.note && (
          <div className="bg-card rounded-2xl border border-border/50 p-4">
            <h3 className="font-bold text-sm mb-1 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-muted-foreground" /> Ghi chú
            </h3>
            <p className="text-sm text-muted-foreground">{booking.note}</p>
          </div>
        )}

        {/* Điều hướng nhanh cho người dùng thao tác các flow khác */}
        <div className="bg-card rounded-2xl border border-border/50 p-4 space-y-3 shadow-sm">
          <h3 className="font-bold text-xs text-foreground flex items-center gap-1.5 uppercase tracking-wider text-primary">
            🎯 Thao tác khác
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => router.push("/customer")}
              className="py-3 bg-muted hover:bg-muted/80 text-foreground font-bold text-xs rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-1.5"
            >
              <span>Về Trang chủ</span>
            </button>
            <button
              onClick={() => router.push("/customer/history")}
              className="py-3 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-1.5"
            >
              <span>Danh sách đơn hàng</span>
            </button>
          </div>
        </div>

        {/* Status timeline */}
        <StatusTimeline logs={booking.statusLogs} />
      </div>

      {/* Footer action — POSTED: Sửa lịch + Hủy | CONFIRMED: chỉ Hủy */}
      {canCancel && (
        <div className="fixed bottom-20 md:bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border/40 p-4 pb-4 md:pb-8 z-30 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
          <div className="flex gap-3 max-w-md mx-auto">
              {canEdit && (
              <button
                onClick={() => setShowEdit(true)}
                className="flex-1 py-3.5 border border-primary text-primary font-bold text-sm rounded-2xl hover:bg-primary/5 transition-colors flex items-center justify-center gap-1.5"
              >
                <Pencil className="w-4 h-4" /> Sửa lịch
              </button>
            )}
            <button
              onClick={() => setShowCancel(true)}
              className={`${
                canEdit ? "flex-1" : "w-full"
              } py-3.5 border border-red-300 text-red-600 font-bold text-sm rounded-2xl hover:bg-red-50 transition-colors`}
            >
              Hủy đơn
            </button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <CancelDialog
        bookingId={bookingId}
        open={showCancel}
        onClose={() => setShowCancel(false)}
      />

      {booking.status === "POSTED" && (
        <EditScheduleSheet
          bookingId={bookingId}
          currentDate={booking.schedule.scheduledStartDate ?? ""}
          currentTime={booking.schedule.scheduledStartTime ?? ""}
          open={showEdit}
          onClose={() => setShowEdit(false)}
        />
      )}

      {/* Report Incident Sheet */}
      <AnimatePresence>
        {showReportSheet && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-45"
              onClick={() => setShowReportSheet(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl overflow-y-auto max-h-[85vh] p-5 space-y-4"
            >
              <div className="w-10 h-1 bg-border rounded-full mx-auto" />
              <div className="text-center space-y-1">
                <h3 className="text-xl font-bold text-foreground md:text-2xl">Báo cáo sự cố đơn hàng</h3>
                <p className="text-sm text-muted-foreground">Chọn nhóm sự cố để nhân viên CSKH hỗ trợ bạn tốt nhất.</p>
              </div>

              <div className="space-y-3 pt-2">
                {REPORT_OPTIONS.map((opt) => {
                  const IconComponent = opt.icon;
                  return (
                    <button
                      key={opt.category}
                      onClick={() => handleReportOption(opt)}
                      className="w-full p-5 bg-background hover:bg-primary/5 border border-border hover:border-primary rounded-2xl text-left active:scale-[0.99] transition-all flex items-start gap-4 shadow-sm"
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col gap-1 flex-1 min-w-0">
                        <span className="text-sm font-bold text-foreground leading-snug md:text-base">{opt.label}</span>
                        <span className="text-xs text-muted-foreground/90 leading-relaxed font-medium md:text-sm">{opt.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 pb-4">
                <button
                  onClick={() => setShowReportSheet(false)}
                  className="w-full py-4 border border-border rounded-2xl text-base font-bold text-foreground hover:bg-muted/30 transition-colors"
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Tasker Detail Modal */}
      <AnimatePresence>
        {showTaskerModal && booking?.tasker && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-45"
              onClick={() => setShowTaskerModal(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl overflow-y-auto max-h-[85vh] p-6 space-y-6 shadow-2xl border-t border-border/40 pb-10"
            >
              <div className="w-10 h-1 bg-border rounded-full mx-auto" />

              <div className="flex flex-col items-center text-center space-y-3">
                <div
                  onClick={() => booking.tasker?.avatarUrl && setShowAvatarZoom(true)}
                  className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-primary/20 shadow-sm shrink-0 cursor-zoom-in hover:scale-105 transition-transform"
                >
                  {booking.tasker.avatarUrl ? (
                    <img
                      src={booking.tasker.avatarUrl}
                      alt={booking.tasker.fullName ?? ""}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-10 h-10 text-primary" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-foreground">{booking.tasker.fullName ?? "Chuyên gia dọn dẹp"}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Hồ sơ đối tác chuyên nghiệp</p>
                </div>
              </div>

              {/* Stats info */}
              <div className="grid grid-cols-2 gap-4 bg-muted/40 p-4 rounded-2xl border border-border/20">
                <div className="flex flex-col items-center justify-center text-center p-2 border-r border-border/50">
                  <div className="flex items-center gap-1 text-amber-500 font-extrabold text-base">
                    <Star className="w-4 h-4 fill-amber-400" />
                    <span>{booking.tasker.ratingAvg && booking.tasker.ratingAvg > 0 ? booking.tasker.ratingAvg.toFixed(1) : "5.0"}</span>
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1">Đánh giá</span>
                </div>

                <div className="flex flex-col items-center justify-center text-center p-2">
                  <div className="flex items-center gap-1 text-primary font-extrabold text-base">
                    <Briefcase className="w-4 h-4" />
                    <span>{booking.tasker.totalCompletedJobs ?? 0}</span>
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1">Số đơn hoàn thành</span>
                </div>
              </div>

              <div className="bg-muted/30 border border-border/50 rounded-2xl p-4 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                  CleanZ chỉ hiển thị hồ sơ và lịch sử đánh giá của Tasker. Số điện thoại được ẩn để bảo vệ thông tin cá nhân.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-extrabold text-foreground">
                      Lịch sử đánh giá
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {taskerReviews.data?.totalReviews ?? 0} đánh giá · trung bình{" "}
                      {taskerReviewAvg > 0 ? taskerReviewAvg.toFixed(1) : "5.0"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-amber-500 font-extrabold text-sm shrink-0">
                    <Star className="w-4 h-4 fill-amber-400" />
                    <span>{taskerReviewAvg > 0 ? taskerReviewAvg.toFixed(1) : "5.0"}</span>
                  </div>
                </div>

                {taskerReviews.isLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="rounded-2xl border border-border/60 p-4 animate-pulse">
                        <div className="h-4 w-32 bg-muted rounded mb-3" />
                        <div className="h-3 w-full bg-muted rounded mb-2" />
                        <div className="h-3 w-2/3 bg-muted rounded" />
                      </div>
                    ))}
                  </div>
                ) : taskerReviews.data?.items.length ? (
                  <div className="space-y-3">
                    {taskerReviews.data.items.map((review) => (
                      <div
                        key={review.id}
                        className="rounded-2xl border border-border/60 bg-background p-4 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center shrink-0">
                              {review.avatar ? (
                                <img
                                  src={review.avatar}
                                  alt={review.customerName ?? "Khách hàng"}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <User className="w-5 h-5 text-primary" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-foreground truncate">
                                {review.customerName ?? "Khách hàng ẩn danh"}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {fmtDate(review.createdAt)}
                                {review.bookingCode ? ` · ${review.bookingCode}` : ""}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-amber-500 font-black text-sm shrink-0">
                            <Star className="w-4 h-4 fill-amber-400" />
                            <span>{review.overallRating.toFixed(1)}</span>
                          </div>
                        </div>

                        {review.comment ? (
                          <p className="text-sm text-foreground/80 leading-relaxed">
                            {review.comment}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">
                            Khách hàng không để lại nhận xét.
                          </p>
                        )}

                        {review.taskerReply && (
                          <div className="rounded-xl bg-primary/5 border border-primary/15 p-3">
                            <p className="text-[11px] font-bold text-primary uppercase tracking-wider mb-1">
                              Phản hồi từ Tasker
                            </p>
                            <p className="text-sm text-foreground/80">{review.taskerReply}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-5 text-center">
                    <Star className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-sm font-bold text-foreground">Chưa có đánh giá</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Tasker này chưa có lịch sử đánh giá công khai.
                    </p>
                  </div>
                )}

                {taskerReviewTotalPages > 1 && (
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <button
                      type="button"
                      disabled={taskerReviewPage <= 1}
                      onClick={() => setTaskerReviewPage((p) => Math.max(1, p - 1))}
                      className="px-4 py-2 rounded-xl border border-border text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted/40 transition-colors"
                    >
                      Trước
                    </button>
                    <span className="text-xs font-bold text-muted-foreground">
                      Trang {taskerReviewPage}/{taskerReviewTotalPages}
                    </span>
                    <button
                      type="button"
                      disabled={taskerReviewPage >= taskerReviewTotalPages}
                      onClick={() =>
                        setTaskerReviewPage((p) => Math.min(taskerReviewTotalPages, p + 1))
                      }
                      className="px-4 py-2 rounded-xl border border-border text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted/40 transition-colors"
                    >
                      Sau
                    </button>
                  </div>
                )}
              </div>

              {/* Bottom close button */}
              <div className="pt-2">
                <button
                  onClick={() => setShowTaskerModal(false)}
                  className="w-full py-3.5 border border-border rounded-2xl text-sm font-bold text-foreground hover:bg-muted/30 transition-colors"
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modal Bản đồ Full Screen với Bottom Sheet trượt từ dưới lên (Grab/Uber Style) */}
      <AnimatePresence>
        {isMapFullscreen && booking.status === "TASKER_ON_THE_WAY" && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background z-50 overflow-hidden"
            >
              {/* Nút đóng (Back) tròn góc trên bên trái */}
              <button
                onClick={() => setIsMapFullscreen(false)}
                className="absolute top-12 left-4 z-[60] w-11 h-11 rounded-full bg-card/95 backdrop-blur-md border border-border/60 shadow-lg flex items-center justify-center text-foreground hover:bg-muted active:scale-95 transition-all"
              >
                <ArrowLeft className="w-5 h-5 text-foreground" />
              </button>

              {/* Bản đồ fullscreen chiếm 100% viewport */}
              <div className="w-full h-full">
                <TaskerTrackingMap
                  destLat={destLat as number}
                  destLng={destLng as number}
                  taskerLat={displayTaskerLat as number}
                  taskerLng={displayTaskerLng as number}
                  taskerAvatar={booking.tasker?.avatarUrl}
                  taskerName={booking.tasker?.fullName}
                  isFullscreen={true}
                />
              </div>

              {/* Bottom Sheet trượt từ dưới lên */}
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 180 }}
                className="absolute bottom-0 left-0 right-0 bg-card rounded-t-[32px] border-t border-border shadow-[0_-12px_40px_rgba(0,0,0,0.12)] pb-10 z-[60]"
              >
                {/* Handle kéo kéo trang trí */}
                <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full mx-auto my-3.5" />

                <div className="px-5 space-y-4">
                  {/* Trạng thái di chuyển */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </div>
                      <span className="text-xs font-black uppercase text-emerald-600 tracking-wider">Chuyên gia đang đến</span>
                    </div>
                    <span className="text-[9px] font-black bg-primary/10 text-primary px-2.5 py-1 rounded-full uppercase tracking-wider">Realtime GPS</span>
                  </div>

                  {/* Card thông tin rút gọn của Chuyên gia */}
                  {booking.tasker && (
                    <div className="bg-muted/40 border border-border/40 rounded-2xl p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-full border border-border/50 overflow-hidden bg-primary/10 shrink-0">
                          {booking.tasker.avatarUrl ? (
                            <img
                              src={booking.tasker.avatarUrl}
                              alt={booking.tasker.fullName ?? ""}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="w-6 h-6 text-primary m-3" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-sm text-foreground truncate">
                            {booking.tasker.fullName ?? "Chuyên gia dọn dẹp"}
                          </h4>
                          <p className="text-[11px] font-bold text-muted-foreground flex items-center gap-1 mt-1">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                            {booking.tasker.ratingAvg && booking.tasker.ratingAvg > 0
                              ? booking.tasker.ratingAvg.toFixed(1)
                              : "5.0"}
                            <span className="text-muted-foreground/40">•</span>
                            <span>{booking.tasker.totalCompletedJobs ?? 0} đơn hoàn thành</span>
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setTaskerReviewPage(1);
                          setShowTaskerModal(true);
                        }}
                        className="shrink-0 rounded-full bg-primary/10 px-3 py-2 text-[11px] font-extrabold text-primary"
                      >
                        Hồ sơ
                      </button>
                    </div>
                  )}

                  {/* Bảng tiến trình stepper check đơn giản */}
                  <div className="bg-muted/20 border border-border/30 rounded-2xl p-4 space-y-4">
                    <p className="text-[10px] font-black uppercase text-muted-foreground/80 tracking-wider">Tiến trình di chuyển</p>

                    <div className="relative pl-6 space-y-4 before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-0.5 before:bg-border/60">
                      {/* Step 1: Xác nhận đơn */}
                      <div className="relative flex items-start gap-3">
                        <div className="absolute -left-6 w-5 h-5 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center">
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-foreground/85">Xác nhận chuyến đi</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Chuyên gia đã nhận đơn và chuẩn bị di chuyển</p>
                        </div>
                      </div>

                      {/* Step 2: Đang di chuyển */}
                      <div className="relative flex items-start gap-3">
                        <div className="absolute -left-6 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white shadow flex items-center justify-center animate-pulse">
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-emerald-600">Đang trên đường đến</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Bạn có thể theo dõi vị trí trực tiếp trên bản đồ</p>
                        </div>
                      </div>

                      {/* Step 3: Check-in điểm đến */}
                      <div className="relative flex items-start gap-3 opacity-45">
                        <div className="absolute -left-6 w-5 h-5 rounded-full bg-muted border border-border flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-muted-foreground">Chờ check-in địa chỉ</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Chuyên gia sẽ bấm check-in khi tới điểm đến</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Lightbox Zoom Avatar */}
      <AnimatePresence>
        {showAvatarZoom && booking?.tasker?.avatarUrl && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 z-[80] backdrop-blur-sm flex items-center justify-center cursor-zoom-out"
              onClick={() => setShowAvatarZoom(false)}
            >
              <div className="relative max-w-[90vw] max-h-[80vh] flex flex-col items-center">
                <motion.img
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  src={booking.tasker.avatarUrl}
                  alt={booking.tasker.fullName ?? ""}
                  className="max-w-full max-h-[70vh] rounded-2xl object-contain shadow-2xl border border-white/10"
                />
                <div className="mt-4 text-center">
                  <p className="text-white font-bold text-base">{booking.tasker.fullName ?? "Chuyên gia dọn dẹp"}</p>
                  <p className="text-white/60 text-xs mt-1">Chạm vào vùng trống bất kỳ hoặc ảnh để đóng</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
