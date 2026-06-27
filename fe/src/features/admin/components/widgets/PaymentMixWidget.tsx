"use client";

import { SectionCard, HorizontalBarChart } from "@/components/admin";
import { useFinanceBreakdown } from "../../hooks/useDashboard";
import { useDashboardStore } from "../../stores/dashboard.store";
import { WidgetSkeleton } from "./WidgetSkeleton";

const METHOD_COLORS: Record<string, string> = {
  CASH: "#8A95A8",
  MOMO: "#7C3AED",
  VNPAY: "#2563EB",
  ZALOPAY: "#0E9F6E",
  VIETQR: "#D97706",
};

export function PaymentMixWidget() {
  const { dateRange } = useDashboardStore();
  const { data, isLoading } = useFinanceBreakdown(dateRange);

  if (isLoading) return <WidgetSkeleton rows={4} />;

  const backendMix = data?.paymentMix ?? [];
  const mixMap = new Map(backendMix.map((p) => [p.method.toUpperCase(), p.percent]));

  // Standard template items with DB values overlaid, or mockup as fallback
  const items = Object.entries(METHOD_COLORS).map(([method, color]) => {
    const dbPercent = mixMap.get(method);
    return {
      label: method,
      percent: dbPercent !== undefined ? dbPercent : (method === "CASH" ? 38 : method === "MOMO" ? 24 : method === "VNPAY" ? 18 : method === "ZALOPAY" ? 13 : 7),
      color,
    };
  });

  return (
    <SectionCard
      title="Cơ cấu thanh toán"
      hint="Theo phương thức · trong kỳ"
      cardClassName="h-full"
    >
      <HorizontalBarChart
        className="mt-3"
        max={100}
        formatValue={(v) => `${v}%`}
        items={items.map((r) => ({ label: r.label, value: r.percent, color: r.color }))}
      />
    </SectionCard>
  );
}
