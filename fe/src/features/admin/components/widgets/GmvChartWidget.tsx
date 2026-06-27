"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { AdminCard } from "@/components/admin";
import { useGmvChart } from "../../hooks/useDashboard";
import { useDashboardStore } from "../../stores/dashboard.store";
import { WidgetSkeleton } from "./WidgetSkeleton";

function fmtGmv(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(".0", "")}tr`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return String(v);
}

export function GmvChartWidget() {
  const { dateRange } = useDashboardStore();
  const { data, isLoading } = useGmvChart(dateRange);

  if (isLoading) return <WidgetSkeleton rows={5} />;
  if (!data?.length) return null;

  return (
    <AdminCard className="h-full flex flex-col justify-between">
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="text-[15px] font-bold text-[var(--c-ink)]">GMV &amp; số đơn · 7 ngày</h3>
              <p className="text-[12.5px] text-[var(--c-muted)] mt-0.5">
                Cột: GMV (tr đ) · Đường: số đơn
              </p>
            </div>
            <div className="flex gap-4 text-xs text-[var(--c-muted)] font-medium mt-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#FFA000]" />
                GMV
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#2563EB]" />
                Đơn
              </span>
            </div>
          </div>
          <div className="h-[250px] w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 10, right: -10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#8A95A8" }}
                  dy={8}
                />
                <YAxis
                  yAxisId="gmv"
                  orientation="left"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#8A95A8" }}
                  tickFormatter={fmtGmv}
                />
                <YAxis
                  yAxisId="orders"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#8A95A8" }}
                />
                <Tooltip
                  formatter={(value, name) => [
                    name === "gmv" ? `${(Number(value) / 1_000_000).toFixed(1)} trđ` : `${value} đơn`,
                    name === "gmv" ? "GMV" : "Đơn hàng",
                  ]}
                  contentStyle={{
                    borderRadius: "0.75rem",
                    border: "1px solid var(--c-line)",
                    backgroundColor: "var(--c-card)",
                    fontSize: 12,
                    color: "var(--c-ink)",
                  }}
                />
                <Bar
                  yAxisId="gmv"
                  dataKey="gmv"
                  fill="#FFA000"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={30}
                />
                <Line
                  yAxisId="orders"
                  dataKey="orders"
                  type="monotone"
                  stroke="#2563EB"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#2563EB", strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </AdminCard>
  );
}
