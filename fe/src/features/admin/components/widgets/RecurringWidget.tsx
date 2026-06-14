"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useBookingDetails } from "../../hooks/useDashboard";
import { useDashboardStore } from "../../stores/dashboard.store";
import { WidgetSkeleton } from "./WidgetSkeleton";

export function RecurringWidget() {
  const { dateRange } = useDashboardStore();
  const { data, isLoading } = useBookingDetails(dateRange);

  if (isLoading) return <WidgetSkeleton rows={3} />;

  // Mapped mockup/fallback values if backend has empty recurring array
  const recurringData = data?.recurring?.length
    ? data.recurring
    : [
        { rule: "Hàng tuần", count: 24 },
        { rule: "2 tuần/lần", count: 9 },
        { rule: "Hàng tháng", count: 4 },
      ];

  const total = recurringData.reduce((sum, item) => sum + item.count, 0);
  const max = Math.max(...recurringData.map((item) => item.count), 1);

  return (
    <Card className="border border-border bg-card shadow-sm rounded-2xl h-full flex flex-col justify-between">
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-[15px] font-semibold text-foreground">Đơn định kỳ</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{total} lịch đang chạy</p>
          </div>
        </div>
        <div className="flex flex-col gap-2.5 mt-3">
          {recurringData.map((r) => (
            <div key={r.rule} className="flex items-center gap-3 text-[12.5px]">
              <span className="w-[38%] text-muted-foreground truncate">{r.rule}</span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(r.count / max) * 100}%`, backgroundColor: "#534ab7" }}
                />
              </div>
              <span className="w-[52px] text-right font-semibold text-foreground">{r.count}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
