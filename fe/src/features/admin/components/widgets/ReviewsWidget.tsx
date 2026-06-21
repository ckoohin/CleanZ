"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useReviews } from "../../hooks/useDashboard";
import { useDashboardStore } from "../../stores/dashboard.store";
import { WidgetSkeleton } from "./WidgetSkeleton";

const CRITERIA_LABELS: { key: keyof Criteria; label: string }[] = [
  { key: "punctuality", label: "Đúng giờ" },
  { key: "cleanliness", label: "Sạch sẽ" },
  { key: "friendliness", label: "Thân thiện" },
  { key: "satisfaction", label: "Hài lòng" },
];

type Criteria = {
  punctuality: number;
  cleanliness: number;
  friendliness: number;
  satisfaction: number;
};

export function ReviewsWidget() {
  const { dateRange } = useDashboardStore();
  const { data, isLoading } = useReviews(dateRange);

  if (isLoading) return <WidgetSkeleton rows={4} />;

  return (
    <Card className="border border-border bg-card shadow-sm rounded-2xl h-full flex flex-col justify-between">
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-[15px] font-semibold text-foreground">Đánh giá</h3>
        </div>
        {!data || data.total === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">
            Chưa có đánh giá trong kỳ
          </p>
        ) : (
          <>
            <div className="flex items-baseline gap-2 mb-3.5">
              <span className="text-3xl font-bold text-foreground">
                {data.avg.toFixed(1)}
              </span>
              <span className="text-[12.5px] text-muted-foreground">
                ★ · {data.total.toLocaleString("vi-VN")} đánh giá
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {CRITERIA_LABELS.map((c) => {
                const value = data.criteria[c.key];
                return (
                  <div key={c.key} className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs text-muted-foreground font-medium">
                      <span>{c.label}</span>
                      <span className="font-semibold text-foreground">{value}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 rounded-full"
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
