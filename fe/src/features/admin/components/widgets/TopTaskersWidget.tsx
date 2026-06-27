"use client";

import { AdminCard } from "@/components/admin";
import { useTaskerStats } from "../../hooks/useDashboard";
import { WidgetSkeleton } from "./WidgetSkeleton";

export function TopTaskersWidget() {
  const { data, isLoading } = useTaskerStats(4); // limit 4 to match HTML

  if (isLoading) return <WidgetSkeleton rows={4} />;

  const taskerData = data?.topTaskers?.length
    ? data.topTaskers
    : [
        { fullName: "Nguyễn Thị Hà", ratingAvg: 5.0, totalCompletedJobs: 142 },
        { fullName: "Trần Văn Đức", ratingAvg: 4.98, totalCompletedJobs: 128 },
        { fullName: "Lê Thị Mai", ratingAvg: 4.96, totalCompletedJobs: 119 },
        { fullName: "Phạm Văn Tú", ratingAvg: 4.95, totalCompletedJobs: 110 },
      ];

  return (
    <AdminCard className="p-5 h-full flex flex-col justify-between">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-[15px] font-bold text-[var(--c-ink)]">Top Tasker tháng</h3>
        </div>
        <span className="text-xs text-[var(--c-primary)] font-medium cursor-pointer hover:underline">Xem tất cả</span>
      </div>
      <div className="flex flex-col gap-1 mt-3">
        {taskerData.map((t, idx) => (
          <div
            key={t.fullName}
            className="flex items-center gap-3 py-2 border-t border-[var(--c-line)] first:border-none first:pt-0"
          >
            <span
              className="w-5.5 h-5.5 rounded-full text-xs font-bold flex items-center justify-center shrink-0 tabular-nums"
              style={{ backgroundColor: "rgba(124,58,237,0.12)", color: "#7C3AED" }}
            >
              {idx + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[13.5px] font-semibold text-[var(--c-ink)] truncate">{t.fullName}</div>
              <div className="text-[11.5px] text-[var(--c-muted)] tabular-nums">
                {t.ratingAvg.toFixed(2)} ★ · {t.totalCompletedJobs} ca
              </div>
            </div>
          </div>
        ))}
      </div>
    </AdminCard>
  );
}
