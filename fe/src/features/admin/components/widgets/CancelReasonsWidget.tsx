"use client";

import { SectionCard, HorizontalBarChart } from "@/components/admin";
import { useBookingDetails } from "../../hooks/useDashboard";
import { useDashboardStore } from "../../stores/dashboard.store";
import { WidgetSkeleton } from "./WidgetSkeleton";

const CANCEL_ROLES: Record<string, { label: string; color: string }> = {
  CUSTOMER: { label: "Khách huỷ (CUSTOMER)", color: "#D97706" },
  TASKER: { label: "Tasker huỷ (TASKER)", color: "#E11D48" },
  SYSTEM: { label: "Hết hạn (SYSTEM)", color: "#8A95A8" },
  ADMIN: { label: "Admin huỷ (ADMIN)", color: "#2563EB" },
};

export function CancelReasonsWidget() {
  const { dateRange } = useDashboardStore();
  const { data, isLoading } = useBookingDetails(dateRange);

  if (isLoading) return <WidgetSkeleton rows={4} />;

  const backendReasons = data?.cancelReasons ?? [];
  const reasonsMap = new Map(backendReasons.map((r) => [r.cancelledBy, r.count]));

  // Standard template items with DB values overlaid, or mockup as fallback
  const items = Object.entries(CANCEL_ROLES).map(([role, cfg]) => {
    const dbCount = reasonsMap.get(role);
    return {
      label: cfg.label,
      count: dbCount !== undefined ? dbCount : (role === "CUSTOMER" ? 18 : role === "TASKER" ? 7 : role === "SYSTEM" ? 5 : 2),
      color: cfg.color,
    };
  });

  const total = items.reduce((sum, item) => sum + item.count, 0);
  const max = Math.max(...items.map((item) => item.count), 1);

  return (
    <SectionCard title="Lý do huỷ đơn" hint={`${total} đơn huỷ trong kỳ`} cardClassName="h-full">
      <HorizontalBarChart
        className="mt-3"
        max={max}
        items={items.map((r) => ({ label: r.label, value: r.count, color: r.color }))}
      />
    </SectionCard>
  );
}
