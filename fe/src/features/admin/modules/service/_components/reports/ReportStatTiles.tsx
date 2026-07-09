"use client";

import { DollarSign, ShoppingCart, CheckCircle2, XCircle, Package, Wallet } from "lucide-react";
import { StatCard } from "@/components/admin";
import { useReportOverview } from "../../hooks/useServicePackageReports";
import type { ServicePackageReportFilter } from "../../services/service-package-reports.service";

const vnd = (v: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(v);

export function ReportStatTiles({ filter }: { filter: ServicePackageReportFilter }) {
  const { data, isLoading } = useReportOverview(filter);

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-[76px] rounded-2xl bg-(--c-card-2) animate-pulse" />
        ))}
      </div>
    );
  }

  const { totalBookings, totalRevenue, completedBookings, cancelledBookings, activePackagesCount } = data;
  const avgOrderValue = completedBookings > 0 ? Math.round(totalRevenue / completedBookings) : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6 gap-4">
      <StatCard icon={DollarSign} label="Tổng doanh thu" value={vnd(totalRevenue)} tint="#0E9F6E" />
      <StatCard icon={ShoppingCart} label="Tổng booking" value={totalBookings.toLocaleString("vi-VN")} tint="#2563EB" />
      <StatCard icon={CheckCircle2} label="Hoàn thành" value={completedBookings.toLocaleString("vi-VN")} tint="#0E9F6E" />
      <StatCard icon={XCircle} label="Đã huỷ" value={cancelledBookings.toLocaleString("vi-VN")} tint="#E11D48" />
      <StatCard icon={Wallet} label="Giá trị đơn TB" value={vnd(avgOrderValue)} tint="#F59E0B" />
      <StatCard icon={Package} label="Gói đang hoạt động" value={activePackagesCount.toLocaleString("vi-VN")} tint="#7C3AED" />
    </div>
  );
}
