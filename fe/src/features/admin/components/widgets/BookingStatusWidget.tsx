"use client";

import { AdminCard } from "@/components/admin";
import { useBookingStatusSnapshot } from "../../hooks/useDashboard";
import { WidgetSkeleton } from "./WidgetSkeleton";

const STATUS_CONFIGS: Record<string, { label: string; color: string }> = {
  POSTED: { label: "Posted", color: "#8A95A8" },
  CONFIRMED: { label: "Confirmed", color: "#2563EB" },
  TASKER_ON_THE_WAY: { label: "On the way", color: "#2563EB" },
  CHECKED_IN: { label: "Checked in", color: "#D97706" },
  IN_PROGRESS: { label: "In progress", color: "#D97706" },
  COMPLETED: { label: "Completed", color: "#0E9F6E" },
  CANCELLED: { label: "Cancelled", color: "#E11D48" },
  EXPIRED: { label: "Expired", color: "#E11D48" },
};

export function BookingStatusWidget() {
  const { data, isLoading } = useBookingStatusSnapshot();

  if (isLoading) return <WidgetSkeleton rows={2} />;
  if (!data) return null;

  const formattedStatuses = [
    { label: "Posted", count: data.POSTED ?? 0, color: "#8A95A8" },
    { label: "Confirmed", count: data.CONFIRMED ?? 0, color: "#2563EB" },
    { label: "On the way", count: data.TASKER_ON_THE_WAY ?? 0, color: "#2563EB" },
    { label: "Checked in", count: data.CHECKED_IN ?? 0, color: "#D97706" },
    { label: "In progress", count: data.IN_PROGRESS ?? 0, color: "#D97706" },
    { label: "Completed", count: data.COMPLETED ?? 0, color: "#0E9F6E" },
    { label: "Cancelled / Expired", count: (data.CANCELLED ?? 0) + (data.EXPIRED ?? 0), color: "#E11D48" },
  ];

  const totalActive = formattedStatuses
    .filter(s => s.label !== "Completed" && s.label !== "Cancelled / Expired")
    .reduce((sum, s) => sum + s.count, 0);

  const nowString = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

  return (
    <AdminCard>
      <div className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-[15px] font-bold text-[var(--c-ink)]">Đơn theo trạng thái · hiện tại</h3>
            <p className="text-[12.5px] text-[var(--c-muted)] mt-0.5">
              {nowString} · {totalActive} đơn đang hoạt động
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5 mt-3">
          {formattedStatuses.map((s) => (
            <div
              key={s.label}
              className="bg-[var(--c-card-2)] rounded-xl p-3.5 border-l-[3px]"
              style={{ borderLeftColor: s.color }}
            >
              <div className="text-2xl font-bold leading-none tabular-nums" style={{ color: s.color }}>
                {s.count}
              </div>
              <div className="text-xs text-[var(--c-muted)] mt-1.5 truncate leading-none">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminCard>
  );
}
