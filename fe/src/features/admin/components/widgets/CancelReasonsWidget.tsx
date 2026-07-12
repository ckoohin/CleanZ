"use client";

import { SectionCard, HorizontalBarChart } from "@/components/admin";
import { useBookingDetails, useDashboardRange } from "../../hooks/useDashboard";
import { WidgetSkeleton } from "./WidgetSkeleton";

const CANCEL_ROLES: Record<string, { label: string; color: string }> = {
  CUSTOMER: { label: "Khách huỷ (CUSTOMER)", color: "#D97706" },
  TASKER: { label: "Tasker huỷ (TASKER)", color: "#E11D48" },
  SYSTEM: { label: "Hết hạn (SYSTEM)", color: "#8A95A8" },
  ADMIN: { label: "Admin huỷ (ADMIN)", color: "#2563EB" },
};

export function CancelReasonsWidget() {
  const dateRange = useDashboardRange();
  const { data, isLoading } = useBookingDetails(dateRange);

  if (isLoading) return <WidgetSkeleton rows={4} />;

  const reasonsMap = new Map(
    (data?.cancelReasons ?? []).map((r) => [r.cancelledBy, r.count]),
  );

  const items = Object.entries(CANCEL_ROLES).map(([role, cfg]) => ({
    label: cfg.label,
    count: reasonsMap.get(role) ?? 0,
    color: cfg.color,
  }));

  const total = items.reduce((sum, item) => sum + item.count, 0);
  const max = Math.max(...items.map((item) => item.count), 1);

  return (
    <SectionCard
      title="Lý do huỷ đơn"
      hint={total > 0 ? `${total} đơn huỷ trong kỳ` : "Trong kỳ"}
      cardClassName="h-full"
    >
      {total === 0 ? (
        <p className="py-6 text-center text-xs text-[var(--c-muted)]">
          Không có đơn huỷ trong kỳ
        </p>
      ) : (
        <HorizontalBarChart
          className="mt-3"
          max={max}
          items={items.map((r) => ({
            label: r.label,
            value: r.count,
            color: r.color,
          }))}
        />
      )}
    </SectionCard>
  );
}
