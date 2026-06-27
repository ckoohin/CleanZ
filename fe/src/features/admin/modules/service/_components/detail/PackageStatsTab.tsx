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
        <Loader2 className="w-8 h-8 text-[var(--c-primary-strong)] animate-spin" aria-hidden="true" />
      </div>
    );
  }

  if (isError || !analytics) {
    return (
      <div className="flex flex-col items-center justify-center h-60 gap-3">
        <AlertTriangle className="w-10 h-10 text-[#D97706]" aria-hidden="true" />
        <p className="text-sm text-[var(--c-muted)]">Không thể tải dữ liệu thống kê lúc này.</p>
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
      color: "text-[var(--c-primary-strong)] bg-[var(--c-primary-soft)] border-[var(--c-primary)]/20",
      trend: null,
    },
    {
      label: "Tổng số đơn",
      value: totalBookings.toLocaleString(),
      icon: ShoppingCart,
      color: "text-[#2563EB] bg-[rgba(37,99,235,0.12)] border-[#2563EB] dark:bg-[rgba(37,99,235,0.12)] dark:border-[#2563EB]/40",
      trend: null,
    },
    {
      label: "Đơn hoàn thành",
      value: completedBookings.toLocaleString(),
      icon: CheckCircle2,
      color: "text-[#0E9F6E] bg-[rgba(14,159,110,0.12)] border-[#0E9F6E] dark:bg-[rgba(14,159,110,0.12)] dark:border-[#0E9F6E]/40",
      sub: `Tỉ lệ ${completionRate}%`,
    },
    {
      label: "Đơn đã hủy",
      value: cancelledBookings.toLocaleString(),
      icon: XCircle,
      color: "text-[#E11D48] bg-[rgba(225,29,72,0.12)] border-[#E11D48] dark:bg-[rgba(225,29,72,0.12)] dark:border-[#E11D48]/40",
      sub: `Tỉ lệ ${cancellationRate}%`,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h3 className="text-xl font-bold text-[var(--c-ink)] flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-[var(--c-primary-strong)]" aria-hidden="true" />
          Thống kê gói dịch vụ
        </h3>
        <p className="text-sm text-[var(--c-muted)] mt-0.5">
          Số liệu tổng hợp cho gói <span className="font-semibold text-[var(--c-ink)]">{packageName}</span>
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
      <div className="bg-[var(--c-card)] border border-[var(--c-line)]/50 rounded-2xl p-6">
        <h4 className="text-base font-bold text-[var(--c-ink)] mb-5 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[var(--c-primary-strong)]" aria-hidden="true" />
          Sức khỏe gói dịch vụ
        </h4>

        <div className="space-y-4">
          {/* Completion rate bar */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium text-[var(--c-ink)]">Tỉ lệ hoàn thành</span>
              <span className="font-bold text-[#0E9F6E]">{completionRate}%</span>
            </div>
            <div className="h-2.5 bg-[var(--c-card-2)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#0E9F6E] rounded-full transition-all duration-700"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>

          {/* Cancellation rate bar */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium text-[var(--c-ink)]">Tỉ lệ hủy đơn</span>
              <span className={`font-bold ${cancellationRate > 20 ? "text-[#E11D48]" : cancellationRate > 10 ? "text-[#D97706]" : "text-[#0E9F6E]"}`}>
                {cancellationRate}%
              </span>
            </div>
            <div className="h-2.5 bg-[var(--c-card-2)] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${cancellationRate > 20 ? "bg-[#E11D48]" : cancellationRate > 10 ? "bg-[#D97706]" : "bg-[#0E9F6E]"}`}
                style={{ width: `${Math.min(cancellationRate, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Health verdict */}
        <div className={`mt-5 flex items-start gap-3 p-4 rounded-xl ${
          completionRate >= 80 && cancellationRate <= 10
            ? "bg-[rgba(14,159,110,0.12)] border border-[#0E9F6E] dark:bg-[rgba(14,159,110,0.12)] dark:border-[#0E9F6E]/40"
            : cancellationRate > 20
            ? "bg-[rgba(225,29,72,0.12)] border border-[#E11D48] dark:bg-[rgba(225,29,72,0.12)] dark:border-[#E11D48]/40"
            : "bg-[rgba(217,119,6,0.14)] border border-[#D97706] dark:bg-[rgba(217,119,6,0.14)] dark:border-[#D97706]/40"
        }`}>
          {completionRate >= 80 && cancellationRate <= 10 ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-[#0E9F6E] shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-sm font-bold text-[#0E9F6E] dark:text-[#0E9F6E]">Gói dịch vụ đang hoạt động tốt ✓</p>
                <p className="text-xs text-[#0E9F6E] dark:text-[#0E9F6E] mt-0.5">Tỉ lệ hoàn thành cao, tỉ lệ hủy thấp — tiếp tục duy trì!</p>
              </div>
            </>
          ) : cancellationRate > 20 ? (
            <>
              <AlertTriangle className="w-5 h-5 text-[#E11D48] shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-sm font-bold text-[#E11D48] dark:text-[#E11D48]">Tỉ lệ hủy đơn cao — cần chú ý!</p>
                <p className="text-xs text-[#E11D48] dark:text-[#E11D48] mt-0.5">Xem xét lại bảng giá hoặc chất lượng dịch vụ để giảm tỉ lệ hủy.</p>
              </div>
            </>
          ) : (
            <>
              <TrendingUp className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-sm font-bold text-[#D97706] dark:text-[#D97706]">Gói dịch vụ đang phát triển</p>
                <p className="text-xs text-[#D97706] dark:text-[#D97706] mt-0.5">Còn room cải thiện — theo dõi thêm để tối ưu.</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Top Taskers */}
      {topTaskers && topTaskers.length > 0 && (
        <div className="bg-[var(--c-card)] border border-[var(--c-line)]/50 rounded-2xl p-6">
          <h4 className="text-base font-bold text-[var(--c-ink)] mb-5 flex items-center gap-2">
            <Award className="w-5 h-5 text-[#D97706]" aria-hidden="true" />
            Top Tasker phục vụ gói này
          </h4>
          <div className="space-y-3">
            {topTaskers.map((tasker, idx) => (
              <div key={tasker.taskerId} className="flex items-center gap-4 p-3 rounded-xl bg-[var(--c-card-2)] border border-[var(--c-line)]/40 hover:bg-[var(--c-card-2)] transition-colors">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  idx === 0 ? "bg-[rgba(217,119,6,0.14)] text-[#D97706]" :
                  idx === 1 ? "bg-[var(--c-card-2)] text-[var(--c-muted)]" :
                  idx === 2 ? "bg-[rgba(217,119,6,0.14)] text-[#D97706]" :
                  "bg-[var(--c-card-2)] text-[var(--c-muted)]"
                }`}>
                  {idx < 3 ? ["🥇", "🥈", "🥉"][idx] : `#${idx + 1}`}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-[var(--c-ink)]">{tasker.fullName}</p>
                  <p className="text-xs text-[var(--c-muted)]">{tasker.phoneNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-[var(--c-primary-strong)]">{tasker.completedJobs} đơn</p>
                  <p className="text-xs text-[var(--c-muted)]">hoàn thành</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty data notice */}
      {totalBookings === 0 && (
        <div className="text-center py-10 border border-dashed border-[var(--c-line)] rounded-2xl bg-[var(--c-card-2)]">
          <BarChart3 className="w-12 h-12 text-[var(--c-muted)] mx-auto mb-3" aria-hidden="true" />
          <p className="text-sm font-semibold text-[var(--c-muted)]">Chưa có dữ liệu thống kê</p>
          <p className="text-xs text-[var(--c-muted)] mt-1">Số liệu sẽ xuất hiện sau khi gói này có đơn hàng đầu tiên.</p>
        </div>
      )}
    </div>
  );
}
