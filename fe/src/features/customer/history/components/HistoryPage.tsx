"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  MapPin,
  ChevronRight,
  Package,
  Calendar,
  User,
  Loader2,
  Sparkles,
  Star,
} from "lucide-react";
import { useMyActiveBooking, useMyBookingHistory } from "@/features/booking/hooks/useCustomerBooking";
import type { BookingStatus, CustomerBookingDetail } from "@/features/booking/types/booking.types";
import { ROUTES } from "@/constants/routes";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtCurrency(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

function fmtDate(dateStr: string | null) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

const STATUS_MAP: Record<BookingStatus, { label: string; color: string; dotColor: string }> = {
  POSTED:            { label: "Đang tìm Tasker",  color: "text-blue-600",    dotColor: "bg-blue-500 animate-pulse" },
  CONFIRMED:         { label: "Đã xác nhận",       color: "text-indigo-600",  dotColor: "bg-indigo-500" },
  TASKER_ON_THE_WAY: { label: "Tasker đang đến",   color: "text-amber-600",   dotColor: "bg-amber-500 animate-pulse" },
  CHECKED_IN:        { label: "Tasker đã đến",     color: "text-orange-600",  dotColor: "bg-orange-500" },
  IN_PROGRESS:       { label: "Đang làm việc",     color: "text-primary",     dotColor: "bg-primary animate-pulse" },
  COMPLETED:         { label: "Đã hoàn thành",     color: "text-emerald-600", dotColor: "bg-emerald-500" },
  CANCELLED:         { label: "Đã hủy",            color: "text-slate-500",   dotColor: "bg-slate-400" },
  EXPIRED:           { label: "Hết hạn",           color: "text-slate-500",   dotColor: "bg-slate-400" },
};

// ─── Active Booking Card ───────────────────────────────────────────────────────
function ActiveBookingCard({ booking, onClick }: { booking: CustomerBookingDetail; onClick: () => void }) {
  const status = STATUS_MAP[booking.status] ?? STATUS_MAP.POSTED;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-card rounded-2xl border border-border/50 p-4 cursor-pointer hover:border-primary/30 hover:shadow-md transition-all"
    >
      {/* Status row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${status.dotColor}`} />
          <span className={`text-xs font-bold ${status.color}`}>{status.label}</span>
        </div>
        <span className="text-xs text-muted-foreground font-mono">{booking.bookingCode}</span>
      </div>

      {/* Service + Tasker */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-foreground text-base">{booking.service.name}</h3>
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs mt-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>{booking.schedule.scheduledStartDate} · {booking.schedule.scheduledStartTime}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs mt-1">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="line-clamp-1">{booking.address.fullAddress}</span>
          </div>
        </div>
        {booking.tasker ? (
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
            {booking.tasker.avatarUrl ? (
              <img src={booking.tasker.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-5 h-5 text-primary" />
            )}
          </div>
        ) : (
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
          </div>
        )}
      </div>

      {/* Price + CTA */}
      <div className="flex items-center justify-between pt-3 border-t border-border/30">
        <span className="font-black text-primary text-base">{fmtCurrency(booking.price.totalPrice)}</span>
        <span className="text-xs font-semibold text-primary flex items-center gap-0.5">
          Xem chi tiết <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </motion.div>
  );
}

// ─── History Card ───────────────────────────────────────────────────────────
function HistoryCard({ booking, onClick, onReview, index }: { booking: CustomerBookingDetail; onClick: () => void; onReview: () => void; index: number }) {
  const status = STATUS_MAP[booking.status] ?? STATUS_MAP.COMPLETED;
  const isDone = booking.status === "COMPLETED";
  const isCancelled = booking.status === "CANCELLED" || booking.status === "EXPIRED";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-card rounded-2xl border border-border/50 p-4 cursor-pointer hover:border-primary/20 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {isDone ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-slate-400 shrink-0" />
            )}
            <span className={`text-xs font-bold ${status.color}`}>{status.label}</span>
            <span className="text-xs text-muted-foreground font-mono ml-auto">{booking.bookingCode}</span>
          </div>
          <h3 className="font-bold text-sm text-foreground">{booking.service.name}</h3>
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs mt-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              {booking.schedule.scheduledStartDate
                ? fmtDate(booking.schedule.scheduledStartDate)
                : fmtDate(booking.createdAt)}
              {booking.schedule.scheduledStartTime ? ` · ${booking.schedule.scheduledStartTime}` : ""}
            </span>
          </div>
          {booking.tasker && (
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs mt-1">
              <User className="w-3.5 h-3.5" />
              <span>{booking.tasker.fullName ?? "Tasker"}</span>
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className={`font-black text-sm ${isCancelled ? "text-muted-foreground line-through" : "text-foreground"}`}>
            {fmtCurrency(booking.price.totalPrice)}
          </p>
          <ChevronRight className="w-4 h-4 text-muted-foreground/50 mt-2 ml-auto" />
        </div>
      </div>
      {isDone && (
        <div className="mt-3 pt-3 border-t border-border/30 flex justify-end">
          <button
            onClick={(e) => { e.stopPropagation(); onReview(); }}
            className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors"
          >
            <Star className="w-3.5 h-3.5 fill-primary" />
            Viết đánh giá
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function HistorySkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-28 bg-card rounded-2xl border border-border/50 animate-pulse" />
      ))}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ tab, onBook }: { tab: "ACTIVE" | "HISTORY"; onBook?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
        <Package className="w-8 h-8 text-muted-foreground/40" />
      </div>
      <h3 className="font-bold text-foreground mb-1">
        {tab === "ACTIVE" ? "Không có đơn đang hoạt động" : "Chưa có lịch sử đơn hàng"}
      </h3>
      <p className="text-sm text-muted-foreground max-w-xs mb-5">
        {tab === "ACTIVE"
          ? "Bạn chưa có đơn đang thực hiện. Đặt ngay để được phục vụ!"
          : "Lịch sử các đơn đã hoàn thành hoặc đã hủy sẽ hiển thị ở đây."}
      </p>
      {tab === "ACTIVE" && onBook && (
        <button
          onClick={onBook}
          className="px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl flex items-center gap-2 hover:bg-primary/90 transition-colors"
        >
          <Sparkles className="w-4 h-4" /> Đặt dịch vụ ngay
        </button>
      )}
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export const HistoryPage = () => {
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "HISTORY">("ACTIVE");
  const router = useRouter();

  const { data: activeData, isLoading: isActiveLoading } = useMyActiveBooking();
  const { data: historyData, isLoading: isHistoryLoading } = useMyBookingHistory();

  const activeBooking = activeData?.booking ?? null;

  // Lọc lịch sử: chỉ các booking đã kết thúc
  const historyBookings: CustomerBookingDetail[] = useMemo(() => {
    const items = historyData?.items ?? [];
    return items
      .filter((b) => b.status === "COMPLETED" || b.status === "CANCELLED" || b.status === "EXPIRED")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [historyData]);

  const goToDetail = (id: string) => router.push(`/customer/booking/${id}`);
  const goToReview = (id: string) => router.push(`/customer/history/review/${id}`);
  const goToCatalog = () => router.push(ROUTES.CUSTOMER.CATALOG);

  const isLoading = activeTab === "ACTIVE" ? isActiveLoading : isHistoryLoading;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header sticky */}
      <div className="bg-card px-4 pt-12 pb-4 shadow-sm sticky top-0 z-20">
        <h1 className="text-2xl font-bold text-foreground mb-4">Hoạt động</h1>

        {/* Tabs */}
        <div className="flex bg-muted p-1 rounded-xl">
          {(["ACTIVE", "HISTORY"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                activeTab === tab ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              {tab === "ACTIVE" ? "Đang tới" : "Lịch sử"}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        {isLoading ? (
          <HistorySkeleton />
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === "ACTIVE" && (
              <motion.div key="active-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                {activeBooking ? (
                  <ActiveBookingCard booking={activeBooking} onClick={() => goToDetail(activeBooking.id)} />
                ) : (
                  <EmptyState tab="ACTIVE" onBook={goToCatalog} />
                )}
              </motion.div>
            )}

            {activeTab === "HISTORY" && (
              <motion.div key="history-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                {historyBookings.length > 0 ? (
                  <>
                    <p className="text-xs text-muted-foreground px-1 mb-2">
                      {historyBookings.length} đơn đã hoàn tất
                    </p>
                    {historyBookings.map((b, i) => (
                      <HistoryCard key={b.id} booking={b} onClick={() => goToDetail(b.id)} onReview={() => goToReview(b.id)} index={i} />
                    ))}
                  </>
                ) : (
                  <EmptyState tab="HISTORY" onBook={goToCatalog} />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};
