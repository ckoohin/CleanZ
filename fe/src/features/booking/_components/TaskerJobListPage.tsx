"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Package,
  ChevronRight,
  RefreshCw,
  PawPrint,
  Zap,
  Calendar,
} from "lucide-react";
import { usePostedBookingList } from "@/features/booking/hooks/useTaskerBooking";
import type { TaskerPostedBookingItem } from "@/features/booking/types/booking.types";

function fmtCurrency(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

function fmtSchedule(item: TaskerPostedBookingItem) {
  const date = item.schedule.scheduledStartDate ?? "—";
  const time = item.schedule.scheduledStartTime ?? "—";
  return `${date} · ${time}`;
}

// ─── Job Card ─────────────────────────────────────────────────────────────────
function JobCard({
  item,
  onClick,
  index,
}: {
  item: TaskerPostedBookingItem;
  onClick: () => void;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="cursor-pointer rounded-2xl border border-border/50 bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
    >
      {/* Header */}
      <div className="mb-3 space-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="max-w-full truncate rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
              {item.bookingCode}
            </span>
            {item.flags.hasPet && (
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-amber-700">
                <PawPrint className="w-2.5 h-2.5" /> Có thú cưng
              </span>
            )}
            {item.price.peakFee > 0 && (
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-red-700">
                <Zap className="w-2.5 h-2.5" /> Cao điểm
              </span>
            )}
        </div>
        <div className="flex min-w-0 items-start justify-between gap-3">
          <h3 className="min-w-0 flex-1 break-words text-sm font-bold leading-snug text-foreground line-clamp-2">
            {item.service.name}
          </h3>
          <p className="shrink-0 whitespace-nowrap text-base font-black leading-tight text-primary">
            {fmtCurrency(item.price.totalPrice)}
          </p>
        </div>
      </div>

      {/* Info row */}
      <div className="space-y-1.5">
        <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          <span className="min-w-0 truncate">
            {fmtSchedule(item)} · {item.schedule.durationHours}h
          </span>
        </div>
        {item.area.displayAddress && (
          <div className="flex min-w-0 items-start gap-2 text-xs text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="min-w-0 leading-relaxed line-clamp-2">{item.area.displayAddress}</span>
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="mt-3 flex items-center justify-end border-t border-border/30 pt-3">
        <span className="inline-flex items-center gap-0.5 whitespace-nowrap text-xs font-semibold text-primary">
          Xem & Nhận đơn <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export const TaskerJobListPage: React.FC = () => {
  const router = useRouter();
  const { data, isLoading, refetch, isFetching } = usePostedBookingList();

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-card px-4 pt-12 pb-4 shadow-sm sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Đơn chờ nhận</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {data?.total ?? 0} đơn đang chờ trong khu vực
            </p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="w-9 h-9 bg-muted rounded-xl flex items-center justify-center"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 bg-card rounded-2xl border border-border/50 animate-pulse" />
          ))
        ) : !data?.items.length ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <h3 className="font-bold text-foreground mb-1">Chưa có đơn nào</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Không có đơn hàng nào đang chờ trong khu vực. Tự động cập nhật sau 15 giây.
            </p>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            {data.items.map((item, index) => (
              <JobCard
                key={item.id}
                item={item}
                index={index}
                onClick={() => router.push(`/tasker/jobs/${item.id}?mode=posted`)}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};
