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
import { Card, CardContent } from "@/components/ui/card";
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
    <Card className="border border-border bg-card shadow-sm rounded-2xl h-full flex flex-col justify-between">
      <CardContent className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="text-[15px] font-semibold text-foreground">GMV &amp; số đơn · 7 ngày</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Cột: GMV (tr đ) · Đường: số đơn
              </p>
            </div>
            <div className="flex gap-4 text-xs text-muted-foreground font-medium mt-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#1d9e75]" />
                GMV
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#534ab7]" />
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
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  dy={8}
                />
                <YAxis
                  yAxisId="gmv"
                  orientation="left"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickFormatter={fmtGmv}
                />
                <YAxis
                  yAxisId="orders"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                />
                <Tooltip
                  formatter={(value, name) => [
                    name === "gmv" ? `${(Number(value) / 1_000_000).toFixed(1)} trđ` : `${value} đơn`,
                    name === "gmv" ? "GMV" : "Đơn hàng",
                  ]}
                  contentStyle={{
                    borderRadius: "0.75rem",
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--background)",
                    fontSize: 12,
                    color: "var(--foreground)",
                  }}
                />
                <Bar
                  yAxisId="gmv"
                  dataKey="gmv"
                  fill="#1d9e75"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={30}
                />
                <Line
                  yAxisId="orders"
                  dataKey="orders"
                  type="monotone"
                  stroke="#534ab7"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#534ab7", strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
