"use client";

import { AdminCard } from "@/components/admin";
import { useReviews, useDashboardRange } from "../../hooks/useDashboard";
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
  const dateRange = useDashboardRange();
  const { data, isLoading } = useReviews(dateRange);

  if (isLoading) return <WidgetSkeleton rows={4} />;

  return (
    <AdminCard className="p-5 h-full flex flex-col justify-between">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-[15px] font-bold text-[var(--c-ink)]">Đánh giá</h3>
      </div>
      {!data || data.total === 0 ? (
        <p className="text-xs text-[var(--c-muted)] py-6 text-center">
          Chưa có đánh giá trong kỳ
        </p>
      ) : (
        <>
          <div className="flex items-baseline gap-2 mb-3.5">
            <span className="text-3xl font-bold text-[var(--c-ink)] tabular-nums">
              {data.avg.toFixed(1)}
            </span>
            <span className="text-[12.5px] text-[var(--c-muted)] tabular-nums">
              ★ · {data.total.toLocaleString("vi-VN")} đánh giá
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {CRITERIA_LABELS.map((c) => {
              const value = data.criteria[c.key];
              return (
                <div key={c.key} className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs text-[var(--c-muted)] font-medium">
                    <span>{c.label}</span>
                    <span className="font-semibold text-[var(--c-ink)] tabular-nums">{value}%</span>
                  </div>
                  <div className="h-1.5 bg-[var(--c-card-2)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${value}%`, backgroundColor: "#0E9F6E" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </AdminCard>
  );
}
