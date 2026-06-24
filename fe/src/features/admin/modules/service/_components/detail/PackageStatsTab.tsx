import React from "react";
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign,
  ShoppingCart, CheckCircle2, XCircle, Users,
  Award, AlertTriangle,
} from "lucide-react";
import { useAdminPackageAnalytics } from "@/features/admin/modules/service/hooks/useAdminServices";
import { Loader2 } from "lucide-react";

interface PackageStatsTabProps {
  packageId: string;
  packageName: string;
}

const vnd = (val: number | null | undefined) => {
  if (!val && val !== 0) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(val);
};

const StatusBadge = ({ label, className }: { label: string; className: string }) => (
  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${className}`}>
    {label}
  </span>
);

export function PackageStatsTab({ packageId, packageName }: PackageStatsTabProps) {
  const { data: analytics, isLoading, isError } = useAdminPackageAnalytics(packageId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-60">
        <Loader2 className="w-8 h-8 text-primary animate-spin" aria-hidden="true" />
      </div>
    );
  }

  if (isError || !analytics) {
    return (
      <div className="flex flex-col items-center justify-center h-60 gap-3">
        <AlertTriangle className="w-10 h-10 text-amber-500" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Không thể tải dữ liệu thống kê lúc này.</p>
      </div>
    );
  }

  const {
    totalBookings,
    totalRevenue,
    completedBookings,
    cancelledBookings,
    topTaskers,
  } = analytics;

  const completionRate = totalBookings > 0 ? Math.round((completedBookings / totalBookings) * 100) : 0;
  const cancellationRate = totalBookings > 0 ? Math.round((cancelledBookings / totalBookings) * 100) : 0;

  const kpis = [
    {
      label: "Tổng doanh thu",
      value: vnd(totalRevenue),
      icon: DollarSign,
      color: "text-primary bg-primary/10 border-primary/20",
      trend: null,
    },
    {
      label: "Tổng số đơn",
      value: totalBookings.toLocaleString(),
      icon: ShoppingCart,
      color: "text-blue-600 bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-900/40",
      trend: null,
    },
    {
      label: "Đơn hoàn thành",
      value: completedBookings.toLocaleString(),
      icon: CheckCircle2,
      color: "text-emerald-600 bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-900/40",
      sub: `Tỉ lệ ${completionRate}%`,
    },
    {
      label: "Đơn đã hủy",
      value: cancelledBookings.toLocaleString(),
      icon: XCircle,
      color: "text-rose-500 bg-rose-50 border-rose-100 dark:bg-rose-900/20 dark:border-rose-900/40",
      sub: `Tỉ lệ ${cancellationRate}%`,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary" aria-hidden="true" />
          Thống kê gói dịch vụ
        </h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Số liệu tổng hợp cho gói <span className="font-semibold text-foreground">{packageName}</span>
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className={`rounded-2xl border p-5 ${kpi.color}`}>
            <div className="flex items-start justify-between mb-3">
              <kpi.icon className="w-6 h-6" aria-hidden="true" />
            </div>
            <p className="text-2xl font-bold">{kpi.value}</p>
            <p className="text-xs font-medium mt-1 opacity-80">{kpi.label}</p>
            {kpi.sub && <p className="text-[10px] mt-0.5 opacity-70 font-semibold">{kpi.sub}</p>}
          </div>
        ))}
      </div>

      {/* Health indicator */}
      <div className="bg-card border border-border/50 rounded-2xl p-6">
        <h4 className="text-base font-bold text-foreground mb-5 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" aria-hidden="true" />
          Sức khỏe gói dịch vụ
        </h4>

        <div className="space-y-4">
          {/* Completion rate bar */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium text-foreground">Tỉ lệ hoàn thành</span>
              <span className="font-bold text-emerald-600">{completionRate}%</span>
            </div>
            <div className="h-2.5 bg-muted/40 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>

          {/* Cancellation rate bar */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium text-foreground">Tỉ lệ hủy đơn</span>
              <span className={`font-bold ${cancellationRate > 20 ? "text-rose-500" : cancellationRate > 10 ? "text-amber-500" : "text-emerald-600"}`}>
                {cancellationRate}%
              </span>
            </div>
            <div className="h-2.5 bg-muted/40 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${cancellationRate > 20 ? "bg-rose-500" : cancellationRate > 10 ? "bg-amber-500" : "bg-emerald-500"}`}
                style={{ width: `${Math.min(cancellationRate, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Health verdict */}
        <div className={`mt-5 flex items-start gap-3 p-4 rounded-xl ${
          completionRate >= 80 && cancellationRate <= 10
            ? "bg-emerald-50 border border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-900/40"
            : cancellationRate > 20
            ? "bg-rose-50 border border-rose-100 dark:bg-rose-900/20 dark:border-rose-900/40"
            : "bg-amber-50 border border-amber-100 dark:bg-amber-900/20 dark:border-amber-900/40"
        }`}>
          {completionRate >= 80 && cancellationRate <= 10 ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Gói dịch vụ đang hoạt động tốt ✓</p>
                <p className="text-xs text-emerald-600/80 dark:text-emerald-400/70 mt-0.5">Tỉ lệ hoàn thành cao, tỉ lệ hủy thấp — tiếp tục duy trì!</p>
              </div>
            </>
          ) : cancellationRate > 20 ? (
            <>
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-sm font-bold text-rose-600 dark:text-rose-400">Tỉ lệ hủy đơn cao — cần chú ý!</p>
                <p className="text-xs text-rose-500/80 dark:text-rose-400/70 mt-0.5">Xem xét lại bảng giá hoặc chất lượng dịch vụ để giảm tỉ lệ hủy.</p>
              </div>
            </>
          ) : (
            <>
              <TrendingUp className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-sm font-bold text-amber-700 dark:text-amber-400">Gói dịch vụ đang phát triển</p>
                <p className="text-xs text-amber-600/80 dark:text-amber-400/70 mt-0.5">Còn room cải thiện — theo dõi thêm để tối ưu.</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Top Taskers */}
      {topTaskers && topTaskers.length > 0 && (
        <div className="bg-card border border-border/50 rounded-2xl p-6">
          <h4 className="text-base font-bold text-foreground mb-5 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" aria-hidden="true" />
            Top Tasker phục vụ gói này
          </h4>
          <div className="space-y-3">
            {topTaskers.map((tasker, idx) => (
              <div key={tasker.taskerId} className="flex items-center gap-4 p-3 rounded-xl bg-muted/20 border border-border/40 hover:bg-muted/40 transition-colors">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  idx === 0 ? "bg-amber-100 text-amber-700" :
                  idx === 1 ? "bg-slate-100 text-slate-700" :
                  idx === 2 ? "bg-orange-100 text-orange-700" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {idx < 3 ? ["🥇", "🥈", "🥉"][idx] : `#${idx + 1}`}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground">{tasker.fullName}</p>
                  <p className="text-xs text-muted-foreground">{tasker.phoneNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-primary">{tasker.completedJobs} đơn</p>
                  <p className="text-xs text-muted-foreground">hoàn thành</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty data notice */}
      {totalBookings === 0 && (
        <div className="text-center py-10 border border-dashed border-border rounded-2xl bg-muted/10">
          <BarChart3 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" aria-hidden="true" />
          <p className="text-sm font-semibold text-muted-foreground">Chưa có dữ liệu thống kê</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Số liệu sẽ xuất hiện sau khi gói này có đơn hàng đầu tiên.</p>
        </div>
      )}
    </div>
  );
}
