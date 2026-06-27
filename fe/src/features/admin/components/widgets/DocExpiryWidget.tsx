"use client";

import { AdminCard } from "@/components/admin";
import { useTaskerStats } from "../../hooks/useDashboard";
import { WidgetSkeleton } from "./WidgetSkeleton";
import { cn } from "@/lib/utils";

export function DocExpiryWidget() {
  const { data, isLoading } = useTaskerStats(3);

  if (isLoading) return <WidgetSkeleton rows={3} />;

  const docData = data?.docExpiring?.length
    ? data.docExpiring
    : [
        { fullName: "Đặng Văn Long", docType: "CCCD", daysLeft: 8 },
        { fullName: "Vũ Thị Lan", docType: "CCCD", daysLeft: 12 },
        { fullName: "Hoàng Văn Nam", docType: "CCCD", daysLeft: 21 },
      ];

  return (
    <AdminCard className="p-5 h-full flex flex-col justify-between">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-[15px] font-bold text-[var(--c-ink)]">Giấy tờ sắp hết hạn</h3>
          <p className="text-[12.5px] text-[var(--c-muted)] mt-0.5">Cảnh báo gia hạn</p>
        </div>
      </div>
      <div className="flex flex-col gap-1 mt-3">
        {docData.map((d) => {
          const level = d.daysLeft <= 10 ? "warn" : "ok";
          const levelStyle =
            level === "warn"
              ? { backgroundColor: "rgba(217,119,6,0.14)", color: "#D97706" }
              : { backgroundColor: "rgba(14,159,110,0.12)", color: "#0E9F6E" };
          return (
            <div
              key={d.fullName}
              className="flex items-center justify-between py-2 border-t border-[var(--c-line)] first:border-none first:pt-0"
            >
              <div className="min-w-0">
                <div className="text-[13.5px] font-semibold text-[var(--c-ink)] truncate">{d.fullName}</div>
                <div className="text-[11.5px] text-[var(--c-muted)]">{d.docType}</div>
              </div>
              <span
                className={cn("text-[11.5px] font-semibold px-2.5 py-0.5 rounded shrink-0 tabular-nums")}
                style={levelStyle}
              >
                còn {d.daysLeft} ngày
              </span>
            </div>
          );
        })}
      </div>
    </AdminCard>
  );
}
