"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Clock,
  MapPin,
  DollarSign,
  Package,
  ChevronRight,
  RefreshCw,
  PawPrint,
  Zap,
  Calendar,
} from "lucide-react";
import { usePostedBookingList } from "@/features/booking/hooks/useTaskerBooking";
import type { TaskerPostedBookingItem } from "@/features/booking/types/booking.types";
import { ROUTES } from "@/constants/routes";

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
      className="bg-card rounded-2xl border border-border/50 p-4 cursor-pointer hover:border-primary/30 hover:shadow-md transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">
              {item.bookingCode}
            </span>
            {item.flags.hasPet && (
              <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                <PawPrint className="w-2.5 h-2.5" /> Có thú cưng
              </span>
            )}
            {item.price.peakFee > 0 && (
              <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                <Zap className="w-2.5 h-2.5" /> Cao điểm
              </span>
            )}
          </div>
          <h3 className="font-bold text-sm text-foreground">{item.service.name}</h3>
        </div>
        <p className="text-base font-black text-primary shrink-0">
          {fmtCurrency(item.price.totalPrice)}
        </p>
      </div>

      {/* Info row */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          <span>{fmtSchedule(item)} · {item.schedule.durationHours}h</span>
        </div>
        {item.area.displayAddress && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="line-clamp-1">{item.area.displayAddress}</span>
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="flex items-center justify-end mt-3 pt-3 border-t border-border/30">
        <span className="text-xs font-semibold text-primary flex items-center gap-0.5">
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
