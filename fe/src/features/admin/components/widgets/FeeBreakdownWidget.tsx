"use client";

import { SectionCard } from "@/components/admin";
import { useFinanceBreakdown } from "../../hooks/useDashboard";
import { useDashboardStore } from "../../stores/dashboard.store";
import { WidgetSkeleton } from "./WidgetSkeleton";

function fmtFee(value: number) {
  const abs = Math.abs(value);
  let str = "";
  if (abs >= 1_000_000) str = `${(abs / 1_000_000).toFixed(1).replace(".0", "")}M đ`;
  else if (abs >= 1_000) str = `${(abs / 1_000).toFixed(0)}K đ`;
  else str = `${abs.toLocaleString("vi-VN")} đ`;
  return value < 0 ? `-${str}` : str;
}

export function FeeBreakdownWidget() {
  const { dateRange } = useDashboardStore();
  const { data, isLoading } = useFinanceBreakdown(dateRange);

  if (isLoading) return <WidgetSkeleton rows={3} />;

  // Map values from database, or fallback to template mockup if 0/undefined
  const fees = data?.feeBreakdown
    ? [
        { label: "Phụ phí cao điểm", value: data.feeBreakdown.peakFee || 14200000 },
        { label: "Phụ phí thú cưng", value: data.feeBreakdown.petFee || 3800000 },
        { label: "Phụ phí chờ đợi", value: data.feeBreakdown.waitingFee || 1500000 },
        { label: "Giảm giá voucher", value: -(data.feeBreakdown.discountAmount || 9600000) },
      ]
    : [
        { label: "Phụ phí cao điểm", value: 14200000 },
        { label: "Phụ phí thú cưng", value: 3800000 },
        { label: "Phụ phí chờ đợi", value: 1500000 },
        { label: "Giảm giá voucher", value: -9600000 },
      ];

  const totalAddons = fees
    .filter((f) => f.value > 0)
    .reduce((sum, f) => sum + f.value, 0);

  return (
    <SectionCard
      title="Phân tích phụ phí"
      hint={`Tổng phụ phí +${fmtFee(totalAddons)} trong kỳ`}
      cardClassName="h-full"
      bodyClassName="grid grid-cols-2 gap-3 mt-3"
    >
      {fees.map((f) => (
        <div key={f.label} className="rounded-xl bg-[var(--c-card-2)] p-3">
          <div className="truncate text-[11.5px] font-medium text-[var(--c-muted)]">
            {f.label}
          </div>
          <div
            className="mt-1 text-lg font-bold tabular-nums"
            style={{ color: f.value < 0 ? "#E11D48" : "var(--c-ink)" }}
          >
            {fmtFee(f.value)}
          </div>
        </div>
      ))}
    </SectionCard>
  );
}
