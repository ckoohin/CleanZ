"use client";

import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Users, ListFilter } from "lucide-react";
import { AdminCard, AdminDialog } from "@/components/admin";
import { WidgetSkeleton } from "@/features/admin/components/widgets/WidgetSkeleton";
import { useReportTopTaskers } from "../../hooks/useServicePackageReports";
import { servicePackageReportsApi, type TopTaskersFilter } from "../../services/service-package-reports.service";
import { ReportDateRangeControl } from "./ReportDateRangeControl";
import { MetricToggle } from "./MetricToggle";
import { ExportExcelButton } from "./ExportExcelButton";

const RANK_COLORS = ["#F59E0B", "#94A3B8", "#CD7F32", "var(--c-primary-strong)", "var(--c-primary-strong)"];
const RANK_EMOJIS = ["🥇", "🥈", "🥉"];
const INLINE_COUNT = 6;
const DETAIL_LIMIT = 50;

const compactVnd = (v: number) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(".0", "")}tr`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return String(v);
};

const vnd = (v: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(v);

function fmtGmv(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(".0", "")}tr`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return String(v);
}

type Metric = "completedJobs" | "revenue";

function TaskerRow({ t, idx, maxJobs }: { t: { taskerId: string; fullName: string; completedJobs: number; revenue: number }; idx: number; maxJobs: number }) {
  const pct = maxJobs > 0 ? (t.completedJobs / maxJobs) * 100 : 0;
  const color = RANK_COLORS[idx] ?? RANK_COLORS[4];
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-base"
        style={idx < 3 ? { background: color + "18" } : { background: "var(--c-card-2)" }}
      >
        {idx < 3 ? RANK_EMOJIS[idx] : <span className="text-xs font-bold text-(--c-muted)">#{idx + 1}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between mb-1 gap-2">
          <p className="text-sm font-bold text-(--c-ink) truncate">{t.fullName}</p>
          <span className="text-xs font-semibold text-(--c-ink) shrink-0">{compactVnd(t.revenue)} đ</span>
        </div>
        <div className="h-2 bg-(--c-card-2) rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${pct}%`, background: `linear-gradient(90deg,${color}88,${color})` }}
          />
        </div>
      </div>
      <span className="text-sm font-black shrink-0 w-10 text-right" style={{ color }}>
        {t.completedJobs}
      </span>
    </div>
  );
}

function TopTaskersDetailDialogBody({ baseFilter }: { baseFilter: TopTaskersFilter }) {
  const [from, setFrom] = useState<string | undefined>(undefined);
  const [to, setTo] = useState<string | undefined>(undefined);
  const [metric, setMetric] = useState<Metric>("completedJobs");
  const hasLocalRange = !!from || !!to;
  const effectiveFilter = { ...baseFilter, from: hasLocalRange ? from : baseFilter.from, to: hasLocalRange ? to : baseFilter.to, limit: DETAIL_LIMIT };

  const { data, isLoading } = useReportTopTaskers(effectiveFilter);
  const rows = [...(data ?? [])].sort((a, b) => b[metric] - a[metric]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <ReportDateRangeControl from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} className="h-8 text-xs" />
        <MetricToggle
          value={metric}
          onChange={setMetric}
          options={[
            { key: "completedJobs", label: "Việc hoàn thành" },
            { key: "revenue", label: "Doanh thu" },
          ]}
        />
      </div>

      {isLoading ? (
        <div className="h-[300px] flex items-center justify-center text-sm text-(--c-muted)">Đang tải...</div>
      ) : !rows.length ? (
        <div className="h-[200px] flex items-center justify-center text-sm text-(--c-muted)">Chưa có dữ liệu</div>
      ) : (
        <>
          <div style={{ height: Math.max(240, Math.min(rows.length, 20) * 32) }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={rows.slice(0, 20)} margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.12} />
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#8A95A8" }}
                  allowDecimals={false}
                  tickFormatter={metric === "revenue" ? fmtGmv : undefined}
                />
                <YAxis type="category" dataKey="fullName" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#8A95A8" }} width={130} />
                <Tooltip
                  formatter={(value) => [metric === "revenue" ? vnd(Number(value)) : `${value} việc`, metric === "revenue" ? "Doanh thu" : "Việc hoàn thành"]}
                  contentStyle={{
                    borderRadius: "0.75rem",
                    border: "1px solid var(--c-line)",
                    backgroundColor: "var(--c-card)",
                    fontSize: 12,
                    color: "var(--c-ink)",
                  }}
                />
                <Bar dataKey={metric} fill="#F59E0B" radius={[0, 6, 6, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {rows.length > 20 && (
            <p className="text-[11px] text-(--c-muted)">Biểu đồ hiển thị top 20 theo chỉ số đang chọn — bảng bên dưới đủ {rows.length} tasker.</p>
          )}

          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-(--c-muted) uppercase tracking-wide border-b border-(--c-line)/40">
                <th className="py-2 pr-3 font-semibold">#</th>
                <th className="py-2 pr-3 font-semibold">Tasker</th>
                <th className="py-2 pr-3 font-semibold">SĐT</th>
                <th className="py-2 pr-3 font-semibold text-right">Việc hoàn thành</th>
                <th className="py-2 pl-3 font-semibold text-right">Doanh thu tạo ra</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t, idx) => (
                <tr key={t.taskerId} className="border-b border-(--c-line)/20 last:border-0">
                  <td className="py-2.5 pr-3 text-(--c-muted)">{idx < 3 ? RANK_EMOJIS[idx] : idx + 1}</td>
                  <td className="py-2.5 pr-3 text-(--c-ink) font-semibold">{t.fullName}</td>
                  <td className="py-2.5 pr-3 text-(--c-muted)">{t.phoneNumber}</td>
                  <td className="py-2.5 pr-3 text-right font-semibold text-(--c-ink)">{t.completedJobs.toLocaleString("vi-VN")}</td>
                  <td className="py-2.5 pl-3 text-right font-semibold text-(--c-ink)">{vnd(t.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

export function TopTaskersPanel({ filter }: { filter: TopTaskersFilter }) {
  const { data, isLoading } = useReportTopTaskers({ ...filter, limit: DETAIL_LIMIT });
  const [detailOpen, setDetailOpen] = useState(false);

  if (isLoading) return <WidgetSkeleton rows={5} />;

  const taskers = data ?? [];
  const inlineTaskers = taskers.slice(0, INLINE_COUNT);
  const maxJobs = taskers[0]?.completedJobs ?? 1;

  return (
    <AdminCard className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-500" />
            <h3 className="text-[15px] font-bold text-(--c-ink)">Bảng xếp hạng Tasker</h3>
          </div>
          <p className="text-[12.5px] text-(--c-muted) mt-0.5 pl-6">
            Top {inlineTaskers.length} theo số việc hoàn thành, kèm doanh thu tasker tạo ra.
          </p>
        </div>
        {taskers.length > 0 && (
          <div className="flex items-center gap-3 shrink-0">
            <ExportExcelButton
              filenamePrefix="bang-xep-hang-tasker"
              onExport={() => servicePackageReportsApi.exportTopTaskers({ ...filter, limit: DETAIL_LIMIT })}
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

      {!taskers.length ? (
        <div className="h-[180px] flex items-center justify-center text-sm text-(--c-muted)">Chưa có dữ liệu</div>
      ) : (
        <div className="space-y-3">
          {inlineTaskers.map((t, idx) => (
            <TaskerRow key={t.taskerId} t={t} idx={idx} maxJobs={maxJobs} />
          ))}
        </div>
      )}

      <AdminDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        title="Chi tiết bảng xếp hạng Tasker"
        description="Biểu đồ và bảng đầy đủ, có bộ lọc ngày và chỉ số riêng cho mục này."
        size="xl"
      >
        {detailOpen && <TopTaskersDetailDialogBody baseFilter={filter} />}
      </AdminDialog>
    </AdminCard>
  );
}
