"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useBookingDetails } from "../../hooks/useDashboard";
import { useDashboardStore } from "../../stores/dashboard.store";
import { WidgetSkeleton } from "./WidgetSkeleton";

export function PeakHoursWidget() {
  const { dateRange } = useDashboardStore();
  const { data, isLoading } = useBookingDetails(dateRange);

  if (isLoading) return <WidgetSkeleton rows={4} />;

  const peakData = data?.peakHours?.length
    ? data.peakHours
    : [
        { hour: "6-9h", count: 12 },
        { hour: "9-12h", count: 28 },
        { hour: "12-15h", count: 34 },
        { hour: "15-18h", count: 41 },
        { hour: "18-21h", count: 23 },
        { hour: "21-24h", count: 8 },
      ];

  const max = Math.max(...peakData.map((item) => item.count), 1);

  return (
    <Card className="border border-border bg-card shadow-sm rounded-2xl h-full flex flex-col justify-between">
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-[15px] font-semibold text-foreground">Khung giờ cao điểm</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Phân bố giờ đặt · trong kỳ</p>
          </div>
        </div>
        <div className="flex flex-col gap-2.5 mt-3">
          {peakData.map((r) => (
            <div key={r.hour} className="flex items-center gap-3 text-[12.5px]">
              <span className="w-[38%] text-muted-foreground truncate">{r.hour}</span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(r.count / max) * 100}%`, backgroundColor: "#1d9e75" }}
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
