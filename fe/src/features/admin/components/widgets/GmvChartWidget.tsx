"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Table2, BarChart3 } from "lucide-react";
import { AdminCard } from "@/components/admin";
import { cn } from "@/lib/utils";
import { useGmvChart, useDashboardRange } from "../../hooks/useDashboard";
import { rangeLabel } from "../../lib/date-ranges";
import { WidgetSkeleton } from "./WidgetSkeleton";
import type { GmvChartItem } from "../../types/dashboard.types";

/**
 * Bảng màu đã chạy qua scripts/validate_palette.js của skill dataviz, trên đúng
 * hai nền thật của admin (#FFFFFF sáng / #111722 tối): cả bốn hex đều đạt cả 6
 * check ở CẢ hai chế độ, khoảng cách mù màu tệ nhất ΔE 72.8 (ngưỡng là 12).
 * Vì vậy KHÔNG cần đổi màu theo theme — chỉ phần khung (lưới, trục) dùng token.
 * (Xám trung tính bị loại: rớt sàn chroma, máy đọc ra "màu xám".)
 */
const C_GMV = "#D97706"; // GMV thực — đơn hoàn tất
const C_PENDING = "#7C3AED"; // Đang xử lý — chưa chốt
const C_LOST = "#E11D48"; // Thất thoát — huỷ / hết hạn
const C_ORDERS = "#2563EB"; // Số đơn (biểu đồ riêng bên dưới)

const fmtCompact = (v: number) => {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1).replace(".0", "")} tỷ`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(".0", "")}tr`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return String(v);
};
const fmtVnd = (v: number) => `${v.toLocaleString("vi-VN")}đ`;

/**
 * Đầu cột bo 4px và luôn neo vào đường đáy. Trong cột chồng, chỉ đoạn TRÊN CÙNG
 * mới được bo — mà đoạn nào là trên cùng thì tuỳ dữ liệu (kỳ không có đơn huỷ thì
 * chính GMV là đỉnh cột), nên phải tự vẽ thay vì đặt `radius` cứng.
 */
function StackedBar(props: {
  x?: number; y?: number; width?: number; height?: number;
  fill?: string; payload?: GmvChartItem; dataKey?: string;
}) {
  const { x = 0, y = 0, width = 0, height = 0, fill, payload, dataKey } = props;
  if (height <= 0 || width <= 0) return null;

  // Đoạn trên cùng = đoạn cuối cùng còn giá trị, tính từ trên xuống.
  const topKey =
    (payload?.lost ?? 0) > 0 ? "lost" : (payload?.pending ?? 0) > 0 ? "pending" : "gmv";
  const isTop = dataKey === topKey;
  const r = Math.min(4, width / 2, height);
  const path = isTop
    ? `M${x},${y + height} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + width - r},${y} Q${x + width},${y} ${x + width},${y + r} L${x + width},${y + height} Z`
    : `M${x},${y} L${x + width},${y} L${x + width},${y + height} L${x},${y + height} Z`;

  // stroke = màu nền → tạo KHE 2px giữa hai đoạn chồng, thay vì viền bao quanh.
  return <path d={path} fill={fill} stroke="var(--c-card)" strokeWidth={2} />;
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: GmvChartItem }[];
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const rows: [string, string, string][] = [
    ["GMV · hoàn tất", fmtVnd(p.gmv), C_GMV],
    ["Đang xử lý · chưa chốt", fmtVnd(p.pending), C_PENDING],
    ["Thất thoát · huỷ/hết hạn", fmtVnd(p.lost), C_LOST],
    ["Số đơn", `${p.orders}`, C_ORDERS],
  ];
  return (
    <div className="rounded-xl border border-[var(--c-line)] bg-[var(--c-card)] px-3 py-2 shadow-lg">
      <div className="mb-1.5 text-[12px] font-bold text-[var(--c-ink)]">{p.label}</div>
      {rows.map(([label, value, color]) => (
        <div key={label} className="flex items-center gap-2 py-0.5 text-[12px]">
          <span className="size-2 shrink-0 rounded-sm" style={{ background: color }} />
          <span className="text-[var(--c-muted)]">{label}</span>
          <span className="ml-auto pl-3 font-semibold tabular-nums text-[var(--c-ink)]">{value}</span>
        </div>
      ))}
    </div>
  );
}

const AXIS = { fontSize: 11, fill: "var(--c-muted)" } as const;

export function GmvChartWidget() {
  const dateRange = useDashboardRange();
  const { data, isLoading } = useGmvChart(dateRange);
  const [asTable, setAsTable] = React.useState(false);

  if (isLoading) return <WidgetSkeleton rows={5} />;

  const points = data ?? [];
  const totalGmv = points.reduce((s, p) => s + p.gmv, 0);
  const totalPending = points.reduce((s, p) => s + p.pending, 0);
  const totalLost = points.reduce((s, p) => s + p.lost, 0);

  const legend: [string, number, string][] = [
    ["GMV · hoàn tất", totalGmv, C_GMV],
    ["Đang xử lý", totalPending, C_PENDING],
    ["Thất thoát", totalLost, C_LOST],
  ];

  return (
    <AdminCard className="flex h-full flex-col">
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-1 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[15px] font-bold text-[var(--c-ink)]">
              GMV &amp; số đơn · {rangeLabel(dateRange)}
            </h3>
            <p className="mt-0.5 text-[12.5px] text-[var(--c-muted)]">
              GMV chỉ tính đơn hoàn tất · theo ngày hẹn làm
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAsTable((v) => !v)}
            title={asTable ? "Xem thêm" : "Xem dạng bảng"}
            className="shrink-0 rounded-lg border border-[var(--c-line)] p-1.5 text-[var(--c-muted)] transition-colors hover:bg-[var(--c-card-2)] hover:text-[var(--c-ink)]"
          >
            {asTable ? <BarChart3 className="size-4" /> : <Table2 className="size-4" />}
          </button>
        </div>

        {points.length === 0 ? (
          <p className="py-16 text-center text-xs text-[var(--c-muted)]">
            Chưa có dữ liệu trong kỳ
          </p>
        ) : asTable ? (
          /* Bảng số — mọi giá trị đều đọc được không cần rê chuột, và là bản
             tương đương cho người dùng trình đọc màn hình. */
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-right text-[12.5px] tabular-nums">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-[var(--c-muted)]">
                  <th className="pb-2 text-left font-semibold">Mốc</th>
                  <th className="pb-2 font-semibold">GMV</th>
                  <th className="pb-2 font-semibold">Đang xử lý</th>
                  <th className="pb-2 font-semibold">Thất thoát</th>
                  <th className="pb-2 font-semibold">Số đơn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--c-line)]">
                {points.map((p) => (
                  <tr key={p.label}>
                    <td className="py-1.5 text-left text-[var(--c-muted)]">{p.label}</td>
                    <td className="py-1.5 font-semibold text-[var(--c-ink)]">{fmtVnd(p.gmv)}</td>
                    <td className="py-1.5" style={{ color: p.pending > 0 ? C_PENDING : "var(--c-muted)" }}>
                      {p.pending > 0 ? fmtVnd(p.pending) : "—"}
                    </td>
                    <td className="py-1.5" style={{ color: p.lost > 0 ? C_LOST : "var(--c-muted)" }}>
                      {p.lost > 0 ? fmtVnd(p.lost) : "—"}
                    </td>
                    <td className="py-1.5 text-[var(--c-ink)]">{p.orders}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[var(--c-line-strong)] font-bold text-[var(--c-ink)]">
                  <td className="pt-2 text-left">Tổng</td>
                  <td className="pt-2">{fmtVnd(totalGmv)}</td>
                  <td className="pt-2">{totalPending > 0 ? fmtVnd(totalPending) : "—"}</td>
                  <td className="pt-2">{totalLost > 0 ? fmtVnd(totalLost) : "—"}</td>
                  <td className="pt-2">{points.reduce((s, p) => s + p.orders, 0)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <>
            {/* Legend: 3 series ở biểu đồ tiền → luôn phải có, danh tính không được
                chỉ dựa vào màu. Biểu đồ số đơn chỉ 1 series nên tiêu đề trục là đủ. */}
            <div className="mb-1 mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] font-medium text-[var(--c-muted)]">
              {legend.map(([label, value, color]) => (
                <span key={label} className="flex items-center gap-1.5">
                  <span className="size-2.5 shrink-0 rounded-sm" style={{ background: color }} />
                  {label}
                  <span
                    className={cn(
                      "font-bold tabular-nums",
                      value > 0 ? "text-[var(--c-ink)]" : "text-[var(--c-muted)]",
                    )}
                  >
                    {value > 0 ? fmtCompact(value) : "0"}
                  </span>
                </span>
              ))}
            </div>

            {/* HAI biểu đồ chung một trục thời gian, KHÔNG phải hai trục Y chồng
                lên nhau: tiền và số đếm là hai thang đo khác nhau, ép chung một
                khung sẽ bịa ra tương quan không có thật. */}
            <div className="h-[190px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={points} margin={{ top: 6, right: 4, bottom: 0, left: -14 }} barCategoryGap="28%">
                  <CartesianGrid stroke="var(--c-line)" vertical={false} />
                  <XAxis dataKey="label" hide />
                  <YAxis axisLine={false} tickLine={false} tick={AXIS} tickFormatter={fmtCompact} width={54} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--c-card-2)" }} />
                  {/* Xếp từ đáy lên: tiền đã thu → tiền đang treo → tiền đã mất. */}
                  <Bar dataKey="gmv" stackId="money" fill={C_GMV} shape={<StackedBar />} maxBarSize={34} />
                  <Bar dataKey="pending" stackId="money" fill={C_PENDING} shape={<StackedBar />} maxBarSize={34} />
                  <Bar dataKey="lost" stackId="money" fill={C_LOST} shape={<StackedBar />} maxBarSize={34} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-1 text-[10.5px] font-semibold uppercase tracking-wider text-[var(--c-muted)]">
              Số đơn
            </div>
            <div className="h-[76px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={points} margin={{ top: 4, right: 4, bottom: 0, left: -14 }} barCategoryGap="28%">
                  <CartesianGrid stroke="var(--c-line)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={AXIS}
                    dy={6}
                    interval="preserveStartEnd"
                    minTickGap={12}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={AXIS} width={54} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--c-card-2)" }} />
                  <Bar dataKey="orders" fill={C_ORDERS} radius={[4, 4, 0, 0]} maxBarSize={38} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </AdminCard>
  );
}
