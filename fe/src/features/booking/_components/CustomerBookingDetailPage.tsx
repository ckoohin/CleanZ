"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  MapPin,
  Calendar,
  User,
  Phone,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Star,
  FileText,
  Pencil,
  Loader2,
  Navigation,
} from "lucide-react";
import {
  useBookingDetail,
  useCancelBooking,
  useUpdateBookingSchedule,
} from "@/features/booking/hooks/useCustomerBooking";
import { GoongMap } from "@/components/maps/GoongMap";
import { GoongAutocomplete } from "@/components/maps/GoongAutocomplete";
import type {
  BookingStatus,
  StatusLog,
  UpdateBookingScheduleDto,
} from "@/features/booking/types/booking.types";

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
    const apiKey = process.env.NEXT_PUBLIC_GOONG_API_KEY ?? "";
    fetch(
      `https://rsapi.goong.io/Place/Detail?place_id=${placeId}&api_key=${apiKey}`
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
  const { data: booking, isLoading } = useBookingDetail(bookingId);
  const [showCancel, setShowCancel] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  // Chỉ POSTED mới được sửa lịch + hủy. CONFIRMED chỉ được hủy.
  const canEdit = booking?.status === "POSTED";
  const canCancel =
    booking?.status === "POSTED" || booking?.status === "CONFIRMED";
  const statusCfg = booking ? STATUS_CONFIG[booking.status] : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-24">
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
        {/* Tasker card */}
        {booking.tasker ? (
          <div className="bg-card rounded-2xl border border-border/50 p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
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
              <p className="font-bold text-sm text-foreground">
                {booking.tasker.fullName ?? "Tasker"}
              </p>
              {booking.tasker.ratingAvg && booking.tasker.ratingAvg > 0 && (
                <p className="text-xs text-amber-500 flex items-center gap-0.5">
                  <Star className="w-3 h-3 fill-amber-400" />{" "}
                  {booking.tasker.ratingAvg.toFixed(1)}
                </p>
              )}
            </div>
            {booking.tasker.phone && (
              <a
                href={`tel:${booking.tasker.phone}`}
                className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center"
              >
                <Phone className="w-4 h-4 text-primary" />
              </a>
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

        {/* Status timeline */}
        <StatusTimeline logs={booking.statusLogs} />
      </div>

      {/* Footer action — POSTED: 2 nút | CONFIRMED: chỉ hủy */}
      {canCancel && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border/40 p-4 pb-8 z-30">
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
              Hủy đơn hàng
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
    </div>
  );
};
