"use client";

import { SectionCard, HorizontalBarChart } from "@/components/admin";
import { useBookingDetails, useDashboardRange } from "../../hooks/useDashboard";
import { WidgetSkeleton } from "./WidgetSkeleton";

export function RecurringWidget() {
  const dateRange = useDashboardRange();
  const { data, isLoading } = useBookingDetails(dateRange);

  if (isLoading) return <WidgetSkeleton rows={3} />;

  const recurringData = data?.recurring ?? [];
  const total = recurringData.reduce((sum, item) => sum + item.count, 0);
  const max = Math.max(...recurringData.map((item) => item.count), 1);

  return (
    <SectionCard
      title="Đơn định kỳ"
      hint={total > 0 ? `${total} lịch đang chạy` : "Trong kỳ"}
      cardClassName="h-full"
    >
      {recurringData.length === 0 ? (
        <p className="py-6 text-center text-xs text-[var(--c-muted)]">
          Chưa có đơn định kỳ trong kỳ
        </p>
      ) : (
        <HorizontalBarChart
          className="mt-3"
          max={max}
          items={recurringData.map((r) => ({
            label: r.rule,
            value: r.count,
            color: "#7C3AED",
          }))}
        />
      )}
    </SectionCard>
  );
}
