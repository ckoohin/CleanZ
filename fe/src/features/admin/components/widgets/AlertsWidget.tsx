"use client";

import { ShieldAlert, UserX, Headset, IdCard, Banknote, CheckCircle, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAlerts } from "../../hooks/useDashboard";
import { WidgetSkeleton } from "./WidgetSkeleton";

type AlertItem = {
  icon: React.ElementType;
  label: string;
  count: number;
  hint: string;
  level: "crit" | "warn";
  href: string;
};

export function AlertsWidget() {
  const router = useRouter();
  const { data, isLoading } = useAlerts();

  if (isLoading) return <WidgetSkeleton rows={2} />;
  if (!data) return null;

  const items: AlertItem[] = [
    {
      icon: ShieldAlert,
      label: "Sự cố tài sản",
      count: data.openIncidents.count,
      hint: data.openIncidents.overdueCount > 0 ? `${data.openIncidents.overdueCount} case quá hạn` : "Đang mở",
      level: "crit",
      href: "/admin/incidents",
    },
    {
      icon: UserX,
      label: "Đơn chưa nhận",
      count: data.unassignedBookings.count,
      hint: data.unassignedBookings.urgentCount > 0 ? `${data.unassignedBookings.urgentCount} sắp hết hạn` : "Đơn mới đăng",
      level: "crit",
      href: "/admin/bookings",
    },
    {
      icon: Headset,
      label: "Ticket hỗ trợ",
      count: data.openTickets.count,
      hint: data.openTickets.slaBreachedCount > 0 ? `${data.openTickets.slaBreachedCount} trễ SLA` : "Chờ xử lý",
      level: "warn",
      href: "/admin/support-tickets",
    },
    {
      icon: IdCard,
      label: "Giấy tờ chờ duyệt",
      count: data.pendingKyc.count,
      hint: "Tasker mới đăng ký",
      level: "warn",
      href: "/admin/taskers/verification",
    },
    {
      icon: Banknote,
      label: "Rút tiền chờ duyệt",
      count: data.pendingWithdrawals.count,
      hint: data.pendingWithdrawals.totalAmount > 0
        ? `Tổng ${(data.pendingWithdrawals.totalAmount / 1_000_000).toFixed(1)}M đ`
        : "Chờ phê duyệt",
      level: "warn",
      href: "/admin/finances",
    },
  ];

  const live = items.filter((item) => item.count > 0);
  const totalCount = live.reduce((sum, item) => sum + item.count, 0);


  return (
    <Card className="border border-border bg-card shadow-sm rounded-2xl">
      <CardContent className="p-5">
        {live.length === 0 ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[14px] font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="w-5 h-5 shrink-0" />
              <h2>Cần xử lý ngay</h2>
            </div>
            <div className="flex items-center gap-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-medium p-4 rounded-xl">
              <CheckCircle className="w-4 h-4 shrink-0" />
              Mọi việc đã xử lý xong.
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[14px] font-semibold text-red-600 dark:text-red-400">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h2>Cần xử lý ngay</h2>
              </div>
              <span className="text-xs text-muted-foreground">
                {totalCount} mục · {live.length} loại
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {live.map(({ icon: Icon, label, count, hint, level, href }) => (
                <div
                  key={label}
                  onClick={() => router.push(href)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(href);
                    }
                  }}
                  className={cn(
                    "rounded-xl p-3.5 cursor-pointer transition-all hover:-translate-y-0.5 border flex flex-col justify-between min-h-[105px]",
                    level === "crit"
                      ? "bg-red-500/5 hover:bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"
                      : "bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
                  )}
                >
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{label}</span>
                  </div>
                  <div className="mt-2">
                    <div className="text-3xl font-bold leading-none">{count}</div>
                    <div className="text-[10.5px] mt-1 opacity-90 truncate leading-none">{hint}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
