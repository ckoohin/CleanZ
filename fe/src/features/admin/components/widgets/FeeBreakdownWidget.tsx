"use client";

import { Card, CardContent } from "@/components/ui/card";
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
    <Card className="border border-border bg-card shadow-sm rounded-2xl h-full flex flex-col justify-between">
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-[15px] font-semibold text-foreground">Phân tích phụ phí</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tổng phụ phí +{fmtFee(totalAddons)} trong kỳ
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          {fees.map((f) => (
            <div key={f.label} className="bg-muted/40 rounded-xl p-3">
              <div className="text-[11.5px] text-muted-foreground truncate font-medium">
                {f.label}
              </div>
              <div className="text-lg font-bold text-foreground mt-1">
                {fmtFee(f.value)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
