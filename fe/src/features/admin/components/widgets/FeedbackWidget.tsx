"use client";

import { AdminCard } from "@/components/admin";
import { useReviews } from "../../hooks/useDashboard";
import { useDashboardStore } from "../../stores/dashboard.store";
import { WidgetSkeleton } from "./WidgetSkeleton";

export function FeedbackWidget() {
  const { dateRange } = useDashboardStore();
  const { data, isLoading } = useReviews(dateRange);

  if (isLoading) return <WidgetSkeleton rows={3} />;

  const feedbacks = data?.recent ?? [];

  return (
    <AdminCard className="p-5 h-full flex flex-col justify-between">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-[15px] font-bold text-[var(--c-ink)]">Feedback mới nhất</h3>
        <span className="text-xs text-[var(--c-primary)] font-medium cursor-pointer hover:underline">
          Xem tất cả
        </span>
      </div>
      {feedbacks.length === 0 ? (
        <p className="text-xs text-[var(--c-muted)] py-6 text-center">
          Chưa có feedback trong kỳ
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {feedbacks.map((f, i) => (
            <div
              key={i}
              className="pb-3 border-b border-[var(--c-line)] last:border-none last:pb-0"
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-[var(--c-ink)]">{f.name}</span>
                <span className="text-xs font-bold tabular-nums" style={{ color: "#D97706" }}>
                  {f.rating.toFixed(1)} ★
                </span>
              </div>
              <p className="text-[12.5px] text-[var(--c-muted)] italic">"{f.comment}"</p>
            </div>
          ))}
        </div>
      )}
    </AdminCard>
  );
}
