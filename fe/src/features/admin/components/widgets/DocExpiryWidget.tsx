"use client";

import { Card, CardContent } from "@/components/ui/card";
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
    <Card className="border border-border bg-card shadow-sm rounded-2xl h-full flex flex-col justify-between">
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-[15px] font-semibold text-foreground">Giấy tờ sắp hết hạn</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Cảnh báo gia hạn</p>
          </div>
        </div>
        <div className="flex flex-col gap-1 mt-3">
          {docData.map((d) => {
            const level = d.daysLeft <= 10 ? "warn" : "ok";
            const levelStyle =
              level === "warn"
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
            return (
              <div
                key={d.fullName}
                className="flex items-center justify-between py-2 border-t border-border first:border-none first:pt-0"
              >
                <div className="min-w-0">
                  <div className="text-[13.5px] font-semibold text-foreground truncate">{d.fullName}</div>
                  <div className="text-[11.5px] text-muted-foreground">{d.docType}</div>
                </div>
                <span className={cn("text-[11.5px] font-semibold px-2.5 py-0.5 rounded shrink-0", levelStyle)}>
                  còn {d.daysLeft} ngày
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
