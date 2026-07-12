"use client";

import { SectionCard } from "@/components/admin";
import { useFinanceBreakdown, useDashboardRange } from "../../hooks/useDashboard";
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
  const dateRange = useDashboardRange();
  const { data, isLoading } = useFinanceBreakdown(dateRange);

  if (isLoading) return <WidgetSkeleton rows={3} />;

  const b = data?.feeBreakdown;
  const fees = [
    { label: "Phụ phí cao điểm", value: b?.peakFee ?? 0 },
    { label: "Phụ phí thú cưng", value: b?.petFee ?? 0 },
    { label: "Phụ phí chờ đợi", value: b?.waitingFee ?? 0 },
    { label: "Giảm giá voucher", value: -(b?.discountAmount ?? 0) },
  ];

  const isEmpty = fees.every((f) => f.value === 0);
  const totalAddons = fees
    .filter((f) => f.value > 0)
    .reduce((sum, f) => sum + f.value, 0);

  return (
    <SectionCard
      title="Phân tích phụ phí"
      hint={
        isEmpty ? "Trong kỳ" : `Tổng phụ phí +${fmtFee(totalAddons)} trong kỳ`
      }
      cardClassName="h-full"
      bodyClassName={isEmpty ? undefined : "grid grid-cols-2 gap-3 mt-3"}
    >
      {isEmpty ? (
        <p className="py-6 text-center text-xs text-[var(--c-muted)]">
          Chưa phát sinh phụ phí trong kỳ
        </p>
      ) : (
        fees.map((f) => (
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
        ))
      )}
    </SectionCard>
  );
}
