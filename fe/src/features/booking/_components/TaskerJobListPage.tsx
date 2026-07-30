"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import {
  MapPin,
  Package,
  ChevronRight,
  RefreshCw,
  Crown,
  PawPrint,
  Zap,
  Calendar,
  Plus,
  Clock3,
} from "lucide-react";
import { usePostedBookingList } from "@/features/booking/hooks/useTaskerBooking";
import { TaskerCreateBookingModal } from "@/features/booking/_components/TaskerCreateBookingModal";
import type { TaskerPostedBookingItem } from "@/features/booking/types/booking.types";

function fmtCurrency(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

function fmtSchedule(item: TaskerPostedBookingItem) {
  const rawDate = item.schedule.scheduledStartDate;
  const date = rawDate
    ? new Date(`${rawDate}T00:00:00`).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "—";
  const time = item.schedule.scheduledStartTime ?? "—";
  return `${date} · ${time}`;
}

function ExclusiveInvitationNotice({ publicAt }: { publicAt?: string | null }) {
  const [remainingMinutes, setRemainingMinutes] = useState<number | null>(null);

  React.useEffect(() => {
    if (!publicAt) {
      setRemainingMinutes(null);
      return;
    }

    const update = () => {
      const remainingMs = new Date(publicAt).getTime() - Date.now();
      setRemainingMinutes(
        remainingMs > 0 ? Math.max(1, Math.ceil(remainingMs / 60_000)) : 0,
      );
    };
    update();
    const timer = window.setInterval(update, 15_000);
    return () => window.clearInterval(timer);
  }, [publicAt]);

  if (remainingMinutes === null || remainingMinutes <= 0) return null;

  return (
    <div className="mt-3 flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
      <Clock3 className="size-3.5 shrink-0" />
      <span>
        Đơn mời riêng · còn khoảng {remainingMinutes} phút ưu tiên nhận
      </span>
    </div>
  );
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
  // Thợ đủ điều kiện Cao cấp mới thấy badge. Thợ chưa duyệt xem đơn Premium y
  // Đơn Cao cấp hiển thị cho mọi thợ (kèm badge), nhưng chỉ thợ đã đăng ký mới
  // nhận được. Thợ chưa đủ điều kiện bấm vào chỉ hiện toast thông báo, không mở
  // chi tiết đơn.
  const premiumLocked =
    item.serviceTier === "PREMIUM" && item.premiumAccess?.canAccept === false;
  const isExclusiveInvitation =
    item.invitation?.isInvited === true &&
    item.invitation?.isExclusive === true;

  const handleCardClick = () => {
    if (premiumLocked) {
      toast.info(
        item.premiumAccess?.message ??
          "Đơn Cao cấp — bạn cần đăng ký thợ Cao cấp để nhận đơn này.",
      );
      return;
    }
    onClick();
  };

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleCardClick}
      className={`w-full rounded-2xl border bg-card p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        isExclusiveInvitation
          ? "cursor-pointer border-primary/40 shadow-sm shadow-primary/10 hover:border-primary/60 hover:shadow-md"
          : "cursor-pointer border-border/50 hover:border-primary/30 hover:shadow-md"
      }`}
      aria-label={`Xem đơn ${item.bookingCode} - ${item.service.name}`}
    >
      {/* Header */}
      <div className="mb-3 space-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="max-w-full truncate rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
            {item.bookingCode}
          </span>
          {item.serviceTier === "PREMIUM" && (
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-black leading-none text-amber-700 dark:text-amber-500">
              <Crown className="w-2.5 h-2.5" /> Cao cấp
            </span>
          )}
          {isExclusiveInvitation && (
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-black leading-none text-primary">
              Dành riêng cho bạn
            </span>
          )}
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
          <div className="shrink-0 text-right">
            <p className="text-[10px] font-medium text-muted-foreground">
              Giá trị đơn
            </p>
            <p className="whitespace-nowrap text-base font-black leading-tight text-primary">
              {fmtCurrency(item.price.totalPrice)}
            </p>
          </div>
        </div>
      </div>

      {/* Info row */}
      <div className="space-y-1.5">
        <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          <span className="min-w-0 truncate">
            {fmtSchedule(item)} · {item.schedule.durationHours} giờ
          </span>
        </div>
        {item.area.displayAddress && (
          <div className="flex min-w-0 items-start gap-2 text-xs text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="min-w-0 leading-relaxed line-clamp-2">
              {item.area.displayAddress}
            </span>
          </div>
        )}
      </div>

      {isExclusiveInvitation && (
        <ExclusiveInvitationNotice publicAt={item.invitation?.publicAt} />
      )}

      {/* Footer CTA */}
      <div className="mt-3 flex items-center justify-end border-t border-border/30 pt-3">
        {premiumLocked ? (
          <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-amber-600 dark:text-amber-500">
            <Crown className="size-3.5" /> Chỉ dành cho thợ Cao cấp
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-primary">
            Xem & Nhận đơn <ChevronRight className="size-3.5" />
          </span>
        )}
      </div>
    </motion.button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
interface TaskerJobListPageProps {
  embedded?: boolean;
}

export const TaskerJobListPage: React.FC<TaskerJobListPageProps> = ({
  embedded = false,
}) => {
  const router = useRouter();
  const { data, isLoading, refetch, isFetching } = usePostedBookingList();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div
      className={embedded ? "space-y-4" : "min-h-screen bg-background pb-24"}
    >
      {/* Header */}
      <div
        className={
          embedded
            ? "rounded-2xl border border-border/50 bg-card p-4 shadow-sm"
            : "sticky top-0 z-20 bg-card px-4 pb-4 pt-12 shadow-sm"
        }
      >
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-bold leading-tight text-foreground sm:text-xl">
              Đơn có thể nhận
            </h2>
            <p className="mt-1 text-xs leading-snug text-muted-foreground">
              {data?.total ?? 0} công việc đang chờ
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => setCreateOpen(true)}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-2xl bg-primary px-3 text-xs font-bold leading-none text-primary-foreground shadow-sm shadow-primary/20"
            >
              <Plus className="h-4 w-4 shrink-0" /> Tạo đơn cho khách
            </button>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
              aria-label="Làm mới danh sách đơn"
            >
              <RefreshCw
                className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>
      </div>

      <TaskerCreateBookingModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />

      {/* Content */}
      <div
        className={
          embedded
            ? "grid grid-cols-1 gap-3 xl:grid-cols-2"
            : "grid grid-cols-1 gap-3 px-4 py-4 lg:grid-cols-2"
        }
      >
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-32 bg-card rounded-2xl border border-border/50 animate-pulse"
            />
          ))
        ) : !data?.items.length ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 py-16 text-center"
          >
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <h3 className="font-bold text-foreground mb-1">Chưa có đơn nào</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Không có đơn hàng nào đang chờ trong khu vực. Tự động cập nhật sau
              15 giây.
            </p>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            {data.items.map((item, index) => (
              <JobCard
                key={item.id}
                item={item}
                index={index}
                onClick={() =>
                  router.push(`/tasker/jobs/${item.id}?mode=posted`)
                }
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};
