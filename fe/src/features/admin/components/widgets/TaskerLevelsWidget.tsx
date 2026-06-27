"use client";

import { SectionCard, HorizontalBarChart } from "@/components/admin";
import { useTaskerLevels } from "../../hooks/useDashboard";
import { WidgetSkeleton } from "./WidgetSkeleton";

const FALLBACK_COLORS = ["#7C3AED", "#2563EB", "#0E9F6E", "#D97706", "#E11D48"];

export function TaskerLevelsWidget() {
  const { data, isLoading } = useTaskerLevels();

  if (isLoading) return <WidgetSkeleton rows={4} />;

  const rows = data ?? [];
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  const max = Math.max(...rows.map((r) => r.count), 1);

  return (
    <SectionCard
      title="Phân bố level Tasker"
      hint={`${total} tasker đang hoạt động`}
      cardClassName="h-full"
    >
      {rows.length === 0 ? (
        <p className="py-6 text-center text-xs text-[var(--c-muted)]">
          Chưa cấu hình level tasker
        </p>
      ) : (
        <HorizontalBarChart
          className="mt-3"
          max={max}
          items={rows.map((r, i) => ({
            label: r.label,
            value: r.count,
            color: r.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
          }))}
        />
      )}
    </SectionCard>
  );
}
