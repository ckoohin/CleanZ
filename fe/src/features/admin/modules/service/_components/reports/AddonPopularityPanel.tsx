"use client";

import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Sparkles, ListFilter } from "lucide-react";
import { AdminCard, AdminDialog, HorizontalBarChart } from "@/components/admin";
import { WidgetSkeleton } from "@/features/admin/components/widgets/WidgetSkeleton";
import { useReportAddonPopularity } from "../../hooks/useServicePackageReports";
import { servicePackageReportsApi, type ServicePackageReportFilter } from "../../services/service-package-reports.service";
import { ReportDateRangeControl } from "./ReportDateRangeControl";
import { MetricToggle } from "./MetricToggle";
import { ExportExcelButton } from "./ExportExcelButton";

const vnd = (v: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(v);

function fmtGmv(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(".0", "")}tr`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return String(v);
}

type Metric = "timesUsed" | "revenue";

function AddonDetailDialogBody({ baseFilter }: { baseFilter: ServicePackageReportFilter }) {
  const [from, setFrom] = useState<string | undefined>(undefined);
  const [to, setTo] = useState<string | undefined>(undefined);
  const [metric, setMetric] = useState<Metric>("timesUsed");
  const hasLocalRange = !!from || !!to;
  const effectiveFilter = hasLocalRange ? { ...baseFilter, from, to } : baseFilter;

  const { data, isLoading } = useReportAddonPopularity(effectiveFilter);
  const rows = [...(data ?? [])].sort((a, b) => b[metric] - a[metric]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <ReportDateRangeControl from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} className="h-8 text-xs" />
        <MetricToggle
          value={metric}
          onChange={setMetric}
          options={[
            { key: "timesUsed", label: "Lượt dùng" },
            { key: "revenue", label: "Doanh thu" },
          ]}
        />
      </div>

      {isLoading ? (
        <div className="h-[300px] flex items-center justify-center text-sm text-(--c-muted)">Đang tải...</div>
      ) : !rows.length ? (
        <div className="h-[200px] flex items-center justify-center text-sm text-(--c-muted)">Chưa có dữ liệu addon</div>
      ) : (
        <>
          <div style={{ height: Math.max(240, rows.length * 40) }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={rows} margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.12} />
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#8A95A8" }}
                  allowDecimals={false}
                  tickFormatter={metric === "revenue" ? fmtGmv : undefined}
                />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#8A95A8" }} width={140} />
                <Tooltip
                  formatter={(value) => [metric === "revenue" ? vnd(Number(value)) : `${value} lượt`, metric === "revenue" ? "Doanh thu" : "Lượt dùng"]}
                  contentStyle={{
                    borderRadius: "0.75rem",
                    border: "1px solid var(--c-line)",
                    backgroundColor: "var(--c-card)",
                    fontSize: 12,
                    color: "var(--c-ink)",
                  }}
                />
                <Bar dataKey={metric} fill="#7C3AED" radius={[0, 6, 6, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-(--c-muted) uppercase tracking-wide border-b border-(--c-line)/40">
                <th className="py-2 pr-3 font-semibold">Tên addon</th>
                <th className="py-2 pr-3 font-semibold text-right">Số lần dùng</th>
                <th className="py-2 pr-3 font-semibold text-right">Doanh thu</th>
                <th className="py-2 pl-3 font-semibold text-right">Đơn giá TB</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.addonId ?? a.name} className="border-b border-(--c-line)/20 last:border-0">
                  <td className="py-2.5 pr-3 text-(--c-ink)">{a.name}</td>
                  <td className="py-2.5 pr-3 text-right font-semibold text-(--c-ink)">{a.timesUsed.toLocaleString("vi-VN")}</td>
                  <td className="py-2.5 pr-3 text-right font-semibold text-(--c-ink)">{vnd(a.revenue)}</td>
                  <td className="py-2.5 pl-3 text-right text-(--c-muted)">
                    {vnd(a.timesUsed > 0 ? Math.round(a.revenue / a.timesUsed) : 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

export function AddonPopularityPanel({ filter }: { filter: ServicePackageReportFilter }) {
  const { data, isLoading } = useReportAddonPopularity(filter);
  const [detailOpen, setDetailOpen] = useState(false);

  if (isLoading) return <WidgetSkeleton rows={5} />;

  const rows = data ?? [];
  const items = rows.map((a) => ({ label: a.name, value: a.timesUsed }));
  const totalRevenue = rows.reduce((sum, a) => sum + a.revenue, 0);
  const totalTimesUsed = rows.reduce((sum, a) => sum + a.timesUsed, 0);

  return (
    <AdminCard className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-(--c-primary-strong)" />
            <h3 className="text-[15px] font-bold text-(--c-ink)">Dịch vụ thêm phổ biến</h3>
          </div>
          <p className="text-[12.5px] text-(--c-muted) mt-0.5 pl-6">
            {rows.length > 0
              ? `${rows.length} addon · ${totalTimesUsed.toLocaleString("vi-VN")} lượt dùng · ${totalRevenue.toLocaleString("vi-VN")} đ tổng doanh thu addon.`
              : "Số lần sử dụng từng dịch vụ thêm (addon) trong khoảng thời gian đã chọn."}
          </p>
        </div>
        {rows.length > 0 && (
          <div className="flex items-center gap-3 shrink-0">
            <ExportExcelButton
              filenamePrefix="dich-vu-them-pho-bien"
              onExport={() => servicePackageReportsApi.exportAddonPopularity(filter)}
            />
            <button
              onClick={() => setDetailOpen(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-(--c-primary-strong) hover:opacity-80 transition-opacity"
            >
              <ListFilter className="w-3.5 h-3.5" />
              Xem chi tiết
            </button>
          </div>
        )}
      </div>

      <div className="h-4" />

      {!items.length ? (
        <div className="h-[180px] flex items-center justify-center text-sm text-(--c-muted)">Chưa có dữ liệu addon</div>
      ) : (
        <div className="text-(--c-primary-strong)">
          <HorizontalBarChart items={items} formatValue={(v) => `${v} lượt`} />
        </div>
      )}

      <AdminDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        title="Chi tiết dịch vụ thêm (addon)"
        description="Biểu đồ và bảng đầy đủ, có bộ lọc ngày và chỉ số riêng cho mục này."
        size="xl"
      >
        {detailOpen && <AddonDetailDialogBody baseFilter={filter} />}
      </AdminDialog>
    </AdminCard>
  );
}
