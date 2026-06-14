"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useBookingStatusSnapshot } from "../../hooks/useDashboard";
import { WidgetSkeleton } from "./WidgetSkeleton";

const STATUS_CONFIGS: Record<string, { label: string; color: string }> = {
  POSTED: { label: "Posted", color: "#888780" },
  CONFIRMED: { label: "Confirmed", color: "#1d4ed8" },
  TASKER_ON_THE_WAY: { label: "On the way", color: "#1d4ed8" },
  CHECKED_IN: { label: "Checked in", color: "#b45309" },
  IN_PROGRESS: { label: "In progress", color: "#b45309" },
  COMPLETED: { label: "Completed", color: "#15803d" },
  CANCELLED: { label: "Cancelled", color: "#b91c1c" },
  EXPIRED: { label: "Expired", color: "#b91c1c" },
};

export function BookingStatusWidget() {
  const { data, isLoading } = useBookingStatusSnapshot();

  if (isLoading) return <WidgetSkeleton rows={2} />;
  if (!data) return null;

  const formattedStatuses = [
    { label: "Posted", count: data.POSTED ?? 0, color: "#888780" },
    { label: "Confirmed", count: data.CONFIRMED ?? 0, color: "#1d4ed8" },
    { label: "On the way", count: data.TASKER_ON_THE_WAY ?? 0, color: "#1d4ed8" },
    { label: "Checked in", count: data.CHECKED_IN ?? 0, color: "#b45309" },
    { label: "In progress", count: data.IN_PROGRESS ?? 0, color: "#b45309" },
    { label: "Completed", count: data.COMPLETED ?? 0, color: "#15803d" },
    { label: "Cancelled / Expired", count: (data.CANCELLED ?? 0) + (data.EXPIRED ?? 0), color: "#b91c1c" },
  ];

  const totalActive = formattedStatuses
    .filter(s => s.label !== "Completed" && s.label !== "Cancelled / Expired")
    .reduce((sum, s) => sum + s.count, 0);

  const nowString = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

  return (
    <Card className="border border-border bg-card shadow-sm rounded-2xl">
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-[15px] font-semibold text-foreground">Đơn theo trạng thái · hiện tại</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {nowString} · {totalActive} đơn đang hoạt động
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5 mt-3">
          {formattedStatuses.map((s) => (
            <div
              key={s.label}
              className="bg-muted/40 rounded-xl p-3.5 border-l-[3px]"
              style={{ borderLeftColor: s.color }}
            >
              <div className="text-2xl font-bold leading-none" style={{ color: s.color }}>
                {s.count}
              </div>
              <div className="text-xs text-muted-foreground mt-1.5 truncate leading-none">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
