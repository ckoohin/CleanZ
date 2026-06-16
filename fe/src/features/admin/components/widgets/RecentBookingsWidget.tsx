"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useBookingDetails } from "../../hooks/useDashboard";
import { useDashboardStore } from "../../stores/dashboard.store";
import { WidgetSkeleton } from "./WidgetSkeleton";
import { MoreHorizontal } from "lucide-react";

const STATUS_STYLE: Record<string, string> = {
  COMPLETED: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none",
  CANCELLED: "bg-red-500/10 text-red-500 dark:text-red-400 border-none",
  IN_PROGRESS: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-none",
  POSTED: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-none",
  CONFIRMED: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-none",
  TASKER_ON_THE_WAY: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-none",
  CHECKED_IN: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-none",
  EXPIRED: "bg-red-500/10 text-red-500 dark:text-red-400 border-none",
};

const STATUS_LABELS: Record<string, string> = {
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  IN_PROGRESS: "In progress",
  POSTED: "Posted",
  CONFIRMED: "Confirmed",
  TASKER_ON_THE_WAY: "On the way",
  CHECKED_IN: "Checked in",
  EXPIRED: "Expired",
};

export function RecentBookingsWidget() {
  const { dateRange } = useDashboardStore();
  const { data, isLoading } = useBookingDetails(dateRange, 5); // display 5 rows like HTML

  if (isLoading) return <WidgetSkeleton rows={4} />;
  if (!data?.recent?.length) return null;

  return (
    <Card className="border border-border bg-card shadow-sm rounded-2xl h-full flex flex-col justify-between">
      <CardContent className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="text-[15px] font-semibold text-foreground">Đơn hàng gần đây</h3>
            </div>
            <span className="text-xs text-primary font-medium cursor-pointer hover:underline">Xem tất cả</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13.5px]">
              <thead>
                <tr>
                  <th className="pb-2.5 pt-1 font-semibold uppercase tracking-wider text-muted-foreground/80 text-[11px] px-2.5">Code</th>
                  <th className="pb-2.5 pt-1 font-semibold uppercase tracking-wider text-muted-foreground/80 text-[11px] px-2.5">Khách</th>
                  <th className="pb-2.5 pt-1 font-semibold uppercase tracking-wider text-muted-foreground/80 text-[11px] px-2.5">Dịch vụ</th>
                  <th className="pb-2.5 pt-1 font-semibold uppercase tracking-wider text-muted-foreground/80 text-[11px] px-2.5">Giá</th>
                  <th className="pb-2.5 pt-1 font-semibold uppercase tracking-wider text-muted-foreground/80 text-[11px] px-2.5">Trạng thái</th>
                  <th className="pb-2.5 pt-1 px-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.recent.map((b) => (
                  <tr key={b.bookingCode} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-2.5 font-semibold text-foreground">{b.bookingCode}</td>
                    <td className="py-2.5 px-2.5 text-muted-foreground text-[12.5px] truncate max-w-[120px]">{b.customerName}</td>
                    <td className="py-2.5 px-2.5 text-foreground">{b.serviceName ?? "Dọn dẹp nhà"}</td>
                    <td className="py-2.5 px-2.5 font-medium text-foreground">
                      {b.totalPrice >= 1000
                        ? `${(b.totalPrice / 1000).toFixed(0)}k`
                        : `${b.totalPrice}đ`}
                    </td>
                    <td className="py-2.5 px-2.5">
                      <Badge className={cn("text-[11.5px] px-2 py-0.5 rounded font-semibold whitespace-nowrap shadow-none", STATUS_STYLE[b.status])}>
                        {STATUS_LABELS[b.status] ?? b.status}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-2.5 text-muted-foreground text-right">
                      <MoreHorizontal className="w-4 h-4 cursor-pointer inline-block" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
