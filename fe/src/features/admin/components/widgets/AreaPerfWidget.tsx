"use client";

import { SectionCard, HorizontalBarChart } from "@/components/admin";
import { useAreaPerformance, useDashboardRange } from "../../hooks/useDashboard";
import { WidgetSkeleton } from "./WidgetSkeleton";

const COLORS = ["#0E9F6E", "#2563EB", "#7C3AED", "#D97706", "#E11D48", "#FFA000"];

export function AreaPerfWidget() {
  const dateRange = useDashboardRange();
  const { data, isLoading } = useAreaPerformance(dateRange);

  if (isLoading) return <WidgetSkeleton rows={5} />;

  const areas = data ?? [];
  const max = Math.max(...areas.map((a) => a.count), 1);

  return (
    <SectionCard title="Đơn theo khu vực" hint="Top khu vực trong kỳ" cardClassName="h-full">
      {areas.length === 0 ? (
        <p className="py-6 text-center text-xs text-[var(--c-muted)]">
          Chưa có dữ liệu khu vực
        </p>
      ) : (
        <HorizontalBarChart
          className="mt-3"
          max={max}
          items={areas.map((a, i) => ({
            label: a.name,
            value: a.count,
            color: COLORS[i % COLORS.length],
          }))}
        />
      )}
    </SectionCard>
  );
}
