"use client";

import { SectionCard, HorizontalBarChart } from "@/components/admin";
import { useFinanceBreakdown } from "../../hooks/useDashboard";
import { useDashboardStore } from "../../stores/dashboard.store";
import { WidgetSkeleton } from "./WidgetSkeleton";

const METHODS: { key: string; label: string; color: string }[] = [
  { key: "CASH", label: "Tiền mặt", color: "#8A95A8" },
  { key: "WALLET", label: "Ví CleanZ", color: "#2563EB" },
];

export function PaymentMixWidget() {
  const { dateRange } = useDashboardStore();
  const { data, isLoading } = useFinanceBreakdown(dateRange);

  if (isLoading) return <WidgetSkeleton rows={4} />;

  const backendMix = data?.paymentMix ?? [];
  const mixMap = new Map(backendMix.map((p) => [p.method.toUpperCase(), p.percent]));

  // Số liệu thật từ backend; chưa có đơn nào thì hiện 0 chứ không bịa số.
  const items = METHODS.map(({ key, label, color }) => ({
    label,
    percent: mixMap.get(key) ?? 0,
    color,
  }));

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
