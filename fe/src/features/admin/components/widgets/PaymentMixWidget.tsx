"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useFinanceBreakdown } from "../../hooks/useDashboard";
import { useDashboardStore } from "../../stores/dashboard.store";
import { WidgetSkeleton } from "./WidgetSkeleton";

const METHOD_COLORS: Record<string, string> = {
  CASH: "#888780",
  MOMO: "#d4537e",
  VNPAY: "#1d4ed8",
  ZALOPAY: "#1d9e75",
  VIETQR: "#b45309",
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
    <Card className="border border-border bg-card shadow-sm rounded-2xl h-full flex flex-col justify-between">
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-[15px] font-semibold text-foreground">Cơ cấu thanh toán</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Theo phương thức · trong kỳ</p>
          </div>
        </div>
        <div className="flex flex-col gap-2.5 mt-3">
          {items.map((r) => (
            <div key={r.label} className="flex items-center gap-3 text-[12.5px]">
              <span className="w-[38%] text-muted-foreground truncate">{r.label}</span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${r.percent}%`, backgroundColor: r.color }}
                />
              </div>
              <span className="w-[52px] text-right font-semibold text-foreground">{r.percent}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
