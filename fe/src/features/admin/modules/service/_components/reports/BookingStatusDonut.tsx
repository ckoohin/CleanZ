"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { PieChart as PieChartIcon } from "lucide-react";
import { AdminCard } from "@/components/admin";
import { WidgetSkeleton } from "@/features/admin/components/widgets/WidgetSkeleton";
import { useReportBookingStatus } from "../../hooks/useServicePackageReports";
import { servicePackageReportsApi, type ServicePackageReportFilter } from "../../services/service-package-reports.service";
import { ExportExcelButton } from "./ExportExcelButton";

const STATUS_LABELS: Record<string, string> = {
  POSTED: "Vừa đăng",
  PENDING_CUSTOMER_CONFIRMATION: "Chờ khách xác nhận",
  CONFIRMED: "Đã xác nhận",
  TASKER_ON_THE_WAY: "Tasker đang đến",
  CHECKED_IN: "Đã check-in",
  IN_PROGRESS: "Đang thực hiện",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã huỷ",
  EXPIRED: "Hết hạn",
};

const STATUS_COLORS: Record<string, string> = {
  POSTED: "#94A3B8",
  PENDING_CUSTOMER_CONFIRMATION: "#F59E0B",
  CONFIRMED: "#2563EB",
  TASKER_ON_THE_WAY: "#0891B2",
  CHECKED_IN: "#0891B2",
  IN_PROGRESS: "#7C3AED",
  COMPLETED: "#0E9F6E",
  CANCELLED: "#E11D48",
  EXPIRED: "#64748B",
};

const PieTip = ({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-(--c-card) border border-(--c-line) rounded-xl px-3.5 py-2.5 shadow-xl">
      <p className="text-sm font-bold text-(--c-ink)">{payload[0].name}</p>
      <p className="text-xs text-(--c-muted) mt-0.5">{payload[0].value.toLocaleString("vi-VN")} đơn</p>
    </div>
  );
};

export function BookingStatusDonut({ filter }: { filter: ServicePackageReportFilter }) {
  const { data, isLoading } = useReportBookingStatus(filter);

  if (isLoading) return <WidgetSkeleton rows={5} />;

  const entries = Object.entries(data ?? {}).filter(([, count]) => count > 0);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  const donutData = entries.map(([status, value]) => ({
    name: STATUS_LABELS[status] ?? status,
    value,
    color: STATUS_COLORS[status] ?? "#94A3B8",
  }));

  return (
    <AdminCard className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-(--c-primary-strong)" />
            <h3 className="text-[15px] font-bold text-(--c-ink)">Phân bổ trạng thái booking</h3>
          </div>
          <p className="text-[12.5px] text-(--c-muted) mt-0.5 pl-6">
            Tỉ lệ % và số lượng booking theo từng trạng thái, trên tổng {total || 0} đơn.
          </p>
        </div>
        {total > 0 && (
          <ExportExcelButton
            filenamePrefix="trang-thai-booking"
            onExport={() => servicePackageReportsApi.exportBookingStatus(filter)}
            className="shrink-0"
          />
        )}
      </div>
      <div className="h-4" />

      {!total ? (
        <div className="h-[220px] flex items-center justify-center text-sm text-(--c-muted)">Không có dữ liệu</div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative shrink-0">
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie data={donutData} cx="50%" cy="50%" innerRadius={52} outerRadius={82} paddingAngle={4} dataKey="value" strokeWidth={0}>
                  {donutData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip content={<PieTip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-2xl font-black text-(--c-ink)">{total}</p>
              <p className="text-[11px] text-(--c-muted)">tổng đơn</p>
            </div>
          </div>

          <div className="flex-1 w-full space-y-2.5">
            {donutData.map((s) => {
              const pct = Math.round((s.value / total) * 100);
              return (
                <div key={s.name}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-semibold text-(--c-ink) flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ background: s.color }} />
                      {s.name}
                    </span>
                    <span className="text-sm font-black" style={{ color: s.color }}>
                      {pct}% <span className="text-(--c-muted) font-medium">({s.value})</span>
                    </span>
                  </div>
                  <div className="h-2 bg-(--c-card-2) rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: s.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </AdminCard>
  );
}
