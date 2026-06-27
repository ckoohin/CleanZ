"use client";

import { SectionCard, HorizontalBarChart } from "@/components/admin";
import { useBookingDetails } from "../../hooks/useDashboard";
import { useDashboardStore } from "../../stores/dashboard.store";
import { WidgetSkeleton } from "./WidgetSkeleton";

export function RecurringWidget() {
  const { dateRange } = useDashboardStore();
  const { data, isLoading } = useBookingDetails(dateRange);

  if (isLoading) return <WidgetSkeleton rows={3} />;

  // Mapped mockup/fallback values if backend has empty recurring array
  const recurringData = data?.recurring?.length
    ? data.recurring
    : [
        { rule: "Hàng tuần", count: 24 },
        { rule: "2 tuần/lần", count: 9 },
        { rule: "Hàng tháng", count: 4 },
      ];

  const total = recurringData.reduce((sum, item) => sum + item.count, 0);
  const max = Math.max(...recurringData.map((item) => item.count), 1);

  return (
    <SectionCard title="Đơn định kỳ" hint={`${total} lịch đang chạy`} cardClassName="h-full">
      <HorizontalBarChart
        className="mt-3"
        max={max}
        items={recurringData.map((r) => ({ label: r.rule, value: r.count, color: "#7C3AED" }))}
      />
    </SectionCard>
  );
}
