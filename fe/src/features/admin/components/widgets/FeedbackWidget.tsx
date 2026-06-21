"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useReviews } from "../../hooks/useDashboard";
import { useDashboardStore } from "../../stores/dashboard.store";
import { WidgetSkeleton } from "./WidgetSkeleton";

export function FeedbackWidget() {
  const { dateRange } = useDashboardStore();
  const { data, isLoading } = useReviews(dateRange);

  if (isLoading) return <WidgetSkeleton rows={3} />;

  const feedbacks = data?.recent ?? [];

  return (
    <Card className="border border-border bg-card shadow-sm rounded-2xl h-full flex flex-col justify-between">
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-[15px] font-semibold text-foreground">Feedback mới nhất</h3>
          <span className="text-xs text-primary font-medium cursor-pointer hover:underline">
            Xem tất cả
          </span>
        </div>
        {feedbacks.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">
            Chưa có feedback trong kỳ
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {feedbacks.map((f, i) => (
              <div
                key={i}
                className="pb-3 border-b border-border last:border-none last:pb-0"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold text-foreground">{f.name}</span>
                  <span className="text-xs text-amber-500 font-bold">
                    {f.rating.toFixed(1)} ★
                  </span>
                </div>
                <p className="text-[12.5px] text-muted-foreground italic">"{f.comment}"</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
