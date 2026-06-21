"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useAreaPerformance } from "../../hooks/useDashboard";
import { useDashboardStore } from "../../stores/dashboard.store";
import { WidgetSkeleton } from "./WidgetSkeleton";

const COLORS = ["#1d9e75", "#1d4ed8", "#534ab7", "#b45309", "#d85a30", "#0e7490"];

export function AreaPerfWidget() {
  const { dateRange } = useDashboardStore();
  const { data, isLoading } = useAreaPerformance(dateRange);

  if (isLoading) return <WidgetSkeleton rows={5} />;

  const areas = data ?? [];
  const max = Math.max(...areas.map((a) => a.count), 1);

  return (
    <Card className="border border-border bg-card shadow-sm rounded-2xl h-full flex flex-col justify-between">
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-[15px] font-semibold text-foreground">Đơn theo khu vực</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Top khu vực trong kỳ</p>
          </div>
        </div>
        {areas.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">
            Chưa có dữ liệu khu vực
          </p>
        ) : (
          <div className="flex flex-col gap-2.5 mt-3">
            {areas.map((a, i) => (
              <div key={a.name} className="flex items-center gap-3 text-[12.5px]">
                <span className="w-[38%] text-muted-foreground truncate">{a.name}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(a.count / max) * 100}%`,
                      backgroundColor: COLORS[i % COLORS.length],
                    }}
                  />
                </div>
                <span className="w-[52px] text-right font-semibold text-foreground">
                  {a.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
