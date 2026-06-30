"use client";

import React, { useState, useMemo } from "react";
import {
  BarChart3, TrendingUp, DollarSign, ShoppingCart,
  CheckCircle2, XCircle, Award, AlertTriangle,
  Calendar, Filter, RefreshCw, User, X, Phone,
  ChevronRight, Users,
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { useAdminPackageAnalytics } from "@/features/admin/modules/service/hooks/useAdminServices";
import { Loader2 } from "lucide-react";

interface PackageStatsTabProps {
  packageId: string;
  packageName: string;
}

// ── Periods ───────────────────────────────────────────────────────────────────
type PeriodKey = "7d" | "30d" | "90d" | "all";
const PERIODS: { key: PeriodKey; label: string; short: string; days?: number }[] = [
  { key: "7d",  label: "7 ngày qua",  short: "7N",  days: 7  },
  { key: "30d", label: "30 ngày qua", short: "30N", days: 30 },
  { key: "90d", label: "3 tháng qua", short: "3T",  days: 90 },
  { key: "all", label: "Tất cả",       short: "All"            },
];

function periodToDateFilter(key: PeriodKey) {
  if (key === "all") return {};
  const to   = new Date();
  const from = new Date();
  from.setDate(from.getDate() - (PERIODS.find(p => p.key === key)?.days ?? 30));
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

// ── Formatters ────────────────────────────────────────────────────────────────
const vnd = (v: number | null | undefined) => {
  if (!v && v !== 0) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(v);
};
const compactVnd = (v: number) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(".0", "")}tr`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}k`;
  return String(v);
};

// ── Ring Gauge ────────────────────────────────────────────────────────────────
function RingGauge({ pct, color, size = 140, sw = 13 }: {
  pct: number; color: string; size?: number; sw?: number;
}) {
  const r     = (size - sw * 2) / 2;
  const circ  = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(Math.max(pct, 0), 100) / 100);
  const c     = size / 2;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="var(--c-card-2)" strokeWidth={sw} />
        <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={sw}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.3s cubic-bezier(.4,0,.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-2xl font-black" style={{ color }}>{pct}%</span>
      </div>
    </div>
  );
}

// ── Tooltips ──────────────────────────────────────────────────────────────────
const PieTip = ({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-(--c-card) border border-(--c-line) rounded-xl px-3.5 py-2.5 shadow-xl">
      <p className="text-sm font-bold text-(--c-ink)">{payload[0].name}</p>
      <p className="text-xs text-(--c-muted) mt-0.5">{payload[0].value.toLocaleString("vi-VN")} đơn</p>
    </div>
  );
};
const BarTip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-(--c-card) border border-(--c-line) rounded-xl px-3.5 py-2.5 shadow-xl min-w-[140px]">
      <p className="text-xs font-bold text-(--c-ink) mb-1.5">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex justify-between gap-4 text-xs">
          <span className="text-(--c-muted)">{p.name}</span>
          <span className="font-bold text-(--c-ink)">{p.value.toLocaleString("vi-VN")}</span>
        </div>
      ))}
    </div>
  );
};

// ── Reusable KPI card ─────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, accent, badge }: {
  icon: React.ElementType; label: string; value: string;
  sub?: string; accent: string; badge?: string;
}) {
  return (
    <div className="relative rounded-2xl border p-5 overflow-hidden bg-(--c-card)"
      style={{ borderColor: `${accent}30` }}
    >
      <div className="absolute inset-0 opacity-[0.04]"
        style={{ background: `radial-gradient(circle at 80% 20%, ${accent}, transparent 60%)` }}
      />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className="p-2 rounded-xl" style={{ background: `${accent}18` }}>
            <Icon className="w-4 h-4" style={{ color: accent }} />
          </div>
          {badge && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: `${accent}18`, color: accent }}>{badge}</span>
          )}
        </div>
        <p className="text-3xl font-black text-(--c-ink) leading-none truncate">{value}</p>
        <p className="text-xs text-(--c-muted) font-medium mt-2">{label}</p>
        {sub && <p className="text-[10px] font-bold mt-0.5" style={{ color: accent }}>{sub}</p>}
      </div>
    </div>
  );
}

// ── Overview stats data shape ─────────────────────────────────────────────────
interface StatsData {
  totalBookings: number;
  totalRevenue: number;
  completedBookings: number;
  cancelledBookings: number;
  topTaskers: { taskerId: string; fullName: string; phoneNumber: string; completedJobs: number }[];
}

// ── Tasker detail panel ───────────────────────────────────────────────────────
function TaskerDetailPanel({
  tasker,
  data,
  period,
  onClose,
}: {
  tasker: { taskerId: string; fullName: string; phoneNumber: string; completedJobs: number };
  data: StatsData;
  period: PeriodKey;
  onClose: () => void;
}) {
  const { totalBookings, totalRevenue, completedBookings, cancelledBookings } = data;
  const completionRate   = totalBookings > 0 ? Math.round((completedBookings / totalBookings) * 100) : 0;
  const cancellationRate = totalBookings > 0 ? Math.round((cancelledBookings / totalBookings) * 100) : 0;
  const periodLabel      = PERIODS.find(p => p.key === period)?.label ?? "Tất cả";

  const donutData = [
    completedBookings > 0 && { name: "Hoàn thành", value: completedBookings, color: "#0E9F6E" },
    cancelledBookings > 0 && { name: "Đã hủy",     value: cancelledBookings, color: "#E11D48" },
  ].filter(Boolean) as { name: string; value: number; color: string }[];

  return (
    <div className="rounded-2xl border-2 border-(--c-primary)/30 bg-(--c-card) overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-5 bg-(--c-primary-soft) border-b border-(--c-primary)/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-(--c-primary-strong) flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-black text-(--c-ink)">{tasker.fullName}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Phone className="w-3 h-3 text-(--c-muted)" />
              <p className="text-xs text-(--c-muted)">{tasker.phoneNumber}</p>
              <span className="text-(--c-muted)">·</span>
              <Calendar className="w-3 h-3 text-(--c-muted)" />
              <p className="text-xs text-(--c-muted)">{periodLabel}</p>
            </div>
          </div>
        </div>
        <button onClick={onClose}
          className="p-2 rounded-xl hover:bg-(--c-card) transition-colors text-(--c-muted) hover:text-(--c-ink)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 space-y-5">
        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard icon={ShoppingCart} label="Tổng đơn nhận"   value={totalBookings.toLocaleString("vi-VN")}   accent="#2563EB" />
          <KpiCard icon={CheckCircle2} label="Đơn hoàn thành"  value={completedBookings.toLocaleString("vi-VN")} accent="#0E9F6E" badge={`${completionRate}%`} />
          <KpiCard icon={XCircle}      label="Đơn đã hủy"      value={cancelledBookings.toLocaleString("vi-VN")} accent="#E11D48" badge={`${cancellationRate}%`} />
          <KpiCard icon={DollarSign}   label="Doanh thu tạo ra" value={compactVnd(totalRevenue) + " ₫"}           accent="var(--c-primary-strong)" />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Donut */}
          {donutData.length > 0 && (
            <div className="bg-(--c-card-2) rounded-2xl p-4">
              <p className="text-xs font-bold text-(--c-muted) uppercase tracking-wide mb-3">Phân bổ đơn hàng</p>
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <ResponsiveContainer width={140} height={140}>
                    <PieChart>
                      <Pie data={donutData} cx="50%" cy="50%" innerRadius={40} outerRadius={65}
                        paddingAngle={4} dataKey="value" strokeWidth={0}>
                        {donutData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip content={<PieTip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-xl font-black text-(--c-ink)">{totalBookings}</p>
                    <p className="text-[10px] text-(--c-muted)">đơn</p>
                  </div>
                </div>
                <div className="space-y-2.5 flex-1">
                  {donutData.map(d => (
                    <div key={d.name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold text-(--c-ink) flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full inline-block" style={{ background: d.color }} />
                          {d.name}
                        </span>
                        <span className="font-black" style={{ color: d.color }}>
                          {Math.round((d.value / totalBookings) * 100)}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-(--c-card) rounded-full overflow-hidden">
                        <div className="h-full rounded-full"
                          style={{ width: `${Math.round((d.value / totalBookings) * 100)}%`, background: d.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Gauges */}
          <div className="bg-(--c-card-2) rounded-2xl p-4">
            <p className="text-xs font-bold text-(--c-muted) uppercase tracking-wide mb-3">Chỉ số hiệu suất</p>
            <div className="flex items-center justify-around">
              <div className="flex flex-col items-center gap-1.5">
                <RingGauge pct={completionRate}   color="#0E9F6E" size={110} sw={11} />
                <p className="text-xs font-semibold text-(--c-ink)">Hoàn thành</p>
              </div>
              <div className="w-px h-20 bg-(--c-line)/30" />
              <div className="flex flex-col items-center gap-1.5">
                <RingGauge pct={cancellationRate} color="#E11D48" size={110} sw={11} />
                <p className="text-xs font-semibold text-(--c-ink)">Đã hủy</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Tab ──────────────────────────────────────────────────────────────────
export function PackageStatsTab({ packageId, packageName }: PackageStatsTabProps) {
  const [period,          setPeriod]          = useState<PeriodKey>("all");
  const [selectedTasker,  setSelectedTasker]  = useState<StatsData["topTaskers"][0] | null>(null);

  const baseFilter   = useMemo(() => periodToDateFilter(period), [period]);
  const taskerFilter = useMemo(
    () => selectedTasker ? { ...baseFilter, taskerId: selectedTasker.taskerId } : undefined,
    [baseFilter, selectedTasker],
  );

  const { data: overview,     isLoading, isError, isFetching } = useAdminPackageAnalytics(packageId, baseFilter);
  const { data: taskerDetail, isLoading: tdLoading }           = useAdminPackageAnalytics(packageId, taskerFilter, !!selectedTasker);

  // ── derived ─────────────────────────────────────────────────────────────────
  const loading = isLoading;
  const d = overview;

  if (loading) return (
    <div className="flex items-center justify-center h-72">
      <Loader2 className="w-8 h-8 text-(--c-primary-strong) animate-spin" />
    </div>
  );

  if (isError || !d) return (
    <div className="flex flex-col items-center justify-center h-72 gap-3">
      <AlertTriangle className="w-10 h-10 text-amber-500" />
      <p className="text-sm text-(--c-muted)">Không thể tải dữ liệu thống kê lúc này.</p>
    </div>
  );

  const { totalBookings, totalRevenue, completedBookings, cancelledBookings, topTaskers } = d;

  const pending          = Math.max(0, totalBookings - completedBookings - cancelledBookings);
  const completionRate   = totalBookings > 0 ? Math.round((completedBookings / totalBookings) * 100) : 0;
  const cancellationRate = totalBookings > 0 ? Math.round((cancelledBookings / totalBookings) * 100) : 0;
  const avgRev           = completedBookings > 0 ? Math.round(totalRevenue / completedBookings) : 0;

  const donutData = [
    completedBookings > 0 && { name: "Hoàn thành", value: completedBookings, color: "#0E9F6E" },
    cancelledBookings > 0 && { name: "Đã hủy",     value: cancelledBookings, color: "#E11D48" },
    pending           > 0 && { name: "Đang xử lý", value: pending,           color: "#6366F1" },
  ].filter(Boolean) as { name: string; value: number; color: string }[];

  const taskerBarData = (topTaskers ?? []).slice(0, 6).map(t => ({
    name: t.fullName.split(" ").slice(-2).join(" "),
    fullName: t.fullName,
    "Đơn HT": t.completedJobs,
  }));

  const health =
    completionRate >= 80 && cancellationRate <= 10
      ? { label: "Hoạt động tốt",   desc: "Tỉ lệ hoàn thành cao, hủy thấp — tiếp tục duy trì!", color: "#0E9F6E", bg: "rgba(14,159,110,0.07)",  border: "rgba(14,159,110,0.3)",  Icon: CheckCircle2 }
      : cancellationRate > 20
      ? { label: "Cần chú ý!",      desc: "Tỉ lệ hủy cao — xem xét bảng giá hoặc chất lượng.",  color: "#E11D48", bg: "rgba(225,29,72,0.07)",   border: "rgba(225,29,72,0.3)",   Icon: AlertTriangle }
      : { label: "Đang phát triển", desc: "Còn room cải thiện — theo dõi thêm để tối ưu.",        color: "#D97706", bg: "rgba(217,119,6,0.07)",    border: "rgba(217,119,6,0.3)",   Icon: TrendingUp };

  const periodLabel = PERIODS.find(p => p.key === period)?.label ?? "Tất cả";
  const RANK_COLORS  = ["#F59E0B", "#94A3B8", "#CD7F32", "var(--c-primary-strong)", "var(--c-primary-strong)", "var(--c-primary-strong)"];
  const RANK_EMOJIS  = ["🥇", "🥈", "🥉"];

  return (
    <div className="space-y-5">

      {/* ── Header + period filter ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-(--c-ink) flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-(--c-primary-soft)">
              <BarChart3 className="w-5 h-5 text-(--c-primary-strong)" />
            </span>
            Thống kê gói dịch vụ
          </h3>
          <p className="text-sm text-(--c-muted) mt-1 pl-11">
            <span className="font-semibold text-(--c-ink)">{packageName}</span>
            {" · "}
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />{periodLabel}
            </span>
            {isFetching && <RefreshCw className="inline w-3 h-3 ml-1.5 animate-spin text-(--c-primary-strong)" />}
          </p>
        </div>

        <div className="flex items-center gap-2 bg-(--c-card-2) rounded-2xl p-1.5 self-start shrink-0">
          <Filter className="w-3.5 h-3.5 text-(--c-muted) ml-1.5 shrink-0" />
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className={[
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all",
                period === p.key
                  ? "bg-(--c-card) text-(--c-primary-strong) shadow-sm"
                  : "text-(--c-muted) hover:text-(--c-ink)",
              ].join(" ")}
            >{p.short}</button>
          ))}
        </div>
      </div>

      {/* ── KPI hero row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue hero */}
        <div className="col-span-2 relative rounded-2xl overflow-hidden p-6 min-h-[148px]"
          style={{ background: "var(--c-primary-strong)" }}
        >
          <div className="absolute inset-0 bg-linear-to-br from-transparent to-black/25 rounded-2xl" />
          <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full border-20 border-white/10" />
          <div className="absolute -bottom-10 -right-2 w-28 h-28 rounded-full border-16 border-white/6" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-white/20"><DollarSign className="w-4 h-4 text-white" /></div>
              <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">Tổng doanh thu</span>
            </div>
            <p className="text-3xl font-black text-white leading-none">{vnd(totalRevenue)}</p>
            {avgRev > 0 && (
              <p className="text-sm text-white/70 font-medium mt-2">
                TB <span className="text-white font-bold">{vnd(avgRev)}</span>/đơn
              </p>
            )}
          </div>
        </div>

        <KpiCard icon={ShoppingCart} label="Tổng đơn hàng"   value={totalBookings.toLocaleString("vi-VN")}    accent="#2563EB"
          badge={pending > 0 ? `${pending} chờ` : undefined}
        />
        <KpiCard icon={CheckCircle2} label="Đơn hoàn thành"  value={completedBookings.toLocaleString("vi-VN")} accent="#0E9F6E"
          badge={`${completionRate}%`}
        />
      </div>

      {/* ── Row 2 ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="relative rounded-2xl border border-[#E11D48]/20 p-5 overflow-hidden bg-(--c-card)">
          <div className="absolute inset-0 opacity-[0.04]"
            style={{ background: "radial-gradient(circle at 80% 20%, #E11D48, transparent 60%)" }} />
          <div className="relative flex items-center gap-6">
            <div>
              <div className="p-2 rounded-xl bg-[rgba(225,29,72,0.12)] w-fit mb-3">
                <XCircle className="w-4 h-4 text-[#E11D48]" />
              </div>
              <p className="text-3xl font-black text-(--c-ink) leading-none">{cancelledBookings.toLocaleString("vi-VN")}</p>
              <p className="text-xs text-(--c-muted) font-medium mt-2">Đơn đã hủy</p>
            </div>
            <div className="h-10 w-px bg-(--c-line)/30" />
            <div>
              <p className="text-2xl font-black text-[#E11D48]">{cancellationRate}%</p>
              <p className="text-xs text-(--c-muted) mt-1">Tỉ lệ hủy đơn</p>
            </div>
          </div>
        </div>

        <div className="relative rounded-2xl border p-5 flex items-center gap-4"
          style={{ background: health.bg, borderColor: health.border }}
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: health.color + "22" }}>
            <health.Icon className="w-6 h-6" style={{ color: health.color }} />
          </div>
          <div>
            <p className="text-base font-black" style={{ color: health.color }}>{health.label}</p>
            <p className="text-xs mt-0.5 text-(--c-muted) leading-relaxed">{health.desc}</p>
          </div>
        </div>
      </div>

      {/* ── Charts (visible when there is data) ── */}
      {totalBookings > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* Donut */}
          <div className="lg:col-span-3 bg-(--c-card) border border-(--c-line)/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-(--c-primary-strong)" />
                <h4 className="text-sm font-bold text-(--c-ink)">Phân bổ trạng thái đơn hàng</h4>
              </div>
              <span className="text-xs text-(--c-muted) bg-(--c-card-2) px-2.5 py-1 rounded-full font-medium">{periodLabel}</span>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative shrink-0">
                <ResponsiveContainer width={220} height={220}>
                  <PieChart>
                    <Pie data={donutData} cx="50%" cy="50%" innerRadius={62} outerRadius={100}
                      paddingAngle={4} dataKey="value" strokeWidth={0}>
                      {donutData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip content={<PieTip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-3xl font-black text-(--c-ink)">{totalBookings}</p>
                  <p className="text-xs text-(--c-muted) font-semibold mt-1">tổng đơn</p>
                </div>
              </div>

              <div className="flex-1 w-full space-y-3.5">
                {donutData.map(s => {
                  const pct = Math.round((s.value / totalBookings) * 100);
                  return (
                    <div key={s.name}>
                      <div className="flex justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                          <span className="text-sm font-semibold text-(--c-ink)">{s.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black" style={{ color: s.color }}>{pct}%</span>
                          <span className="text-xs text-(--c-muted)">({s.value.toLocaleString("vi-VN")})</span>
                        </div>
                      </div>
                      <div className="h-3 bg-(--c-card-2) rounded-full overflow-hidden">
                        <div className="h-full rounded-full"
                          style={{ width: `${pct}%`, background: `linear-gradient(90deg,${s.color}bb,${s.color})`, transition: "width 1s ease" }}
                        />
                      </div>
                    </div>
                  );
                })}
                <div className="mt-4 pt-3 border-t border-(--c-line)/40 grid grid-cols-2 gap-3">
                  <div className="bg-(--c-card-2) rounded-xl p-3">
                    <p className="text-xs text-(--c-muted) mb-0.5">Tổng đơn</p>
                    <p className="text-lg font-black text-(--c-ink)">{totalBookings.toLocaleString("vi-VN")}</p>
                  </div>
                  <div className="bg-(--c-card-2) rounded-xl p-3">
                    <p className="text-xs text-(--c-muted) mb-0.5">TB doanh thu</p>
                    <p className="text-base font-black text-(--c-ink) truncate">{compactVnd(avgRev)} ₫</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Gauges */}
          <div className="lg:col-span-2 bg-(--c-card) border border-(--c-line)/50 rounded-2xl p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-2 h-2 rounded-full bg-[#0E9F6E]" />
              <h4 className="text-sm font-bold text-(--c-ink)">Chỉ số hiệu suất</h4>
            </div>
            <div className="flex flex-col items-center gap-1 mb-5">
              <RingGauge pct={completionRate} color="#0E9F6E" size={148} sw={13} />
              <p className="text-sm font-bold text-(--c-ink) mt-2">Tỉ lệ hoàn thành</p>
              <p className="text-xs text-(--c-muted)">{completedBookings.toLocaleString("vi-VN")} / {totalBookings.toLocaleString("vi-VN")} đơn</p>
            </div>
            <div className="h-px bg-(--c-line)/30 mb-5" />
            <div className="flex flex-col items-center gap-1">
              <RingGauge pct={cancellationRate} color="#E11D48" size={148} sw={13} />
              <p className="text-sm font-bold text-(--c-ink) mt-2">Tỉ lệ đã hủy</p>
              <p className="text-xs text-(--c-muted)">{cancelledBookings.toLocaleString("vi-VN")} / {totalBookings.toLocaleString("vi-VN")} đơn</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Tasker section ── */}
      {(topTaskers?.length ?? 0) > 0 && (
        <div className="bg-(--c-card) border border-(--c-line)/50 rounded-2xl p-6 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h4 className="text-base font-bold text-(--c-ink) flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-500" />
              Hiệu suất Tasker
              <span className="text-xs text-(--c-muted) font-medium">· nhấn để xem chi tiết</span>
            </h4>
            <span className="text-xs text-(--c-muted) font-semibold bg-(--c-card-2) px-3 py-1.5 rounded-full">
              Top {Math.min(topTaskers.length, 6)}
            </span>
          </div>

          {/* Tasker chips — clickable selector */}
          <div className="flex flex-wrap gap-2">
            {topTaskers.slice(0, 6).map((t, idx) => {
              const isActive = selectedTasker?.taskerId === t.taskerId;
              const color    = RANK_COLORS[idx] ?? RANK_COLORS[5];
              return (
                <button
                  key={t.taskerId}
                  onClick={() => setSelectedTasker(isActive ? null : t)}
                  className={[
                    "flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold transition-all",
                    isActive
                      ? "text-(--c-ink) shadow-sm"
                      : "bg-(--c-card-2) border-(--c-line)/40 text-(--c-muted) hover:text-(--c-ink) hover:border-(--c-line)",
                  ].join(" ")}
                  style={isActive ? { background: `${color}15`, borderColor: `${color}60`, color: "var(--c-ink)" } : {}}
                >
                  <span className="text-base leading-none">{idx < 3 ? RANK_EMOJIS[idx] : `#${idx + 1}`}</span>
                  <span className="truncate max-w-[120px]">{t.fullName.split(" ").slice(-2).join(" ")}</span>
                  <span className="font-black text-xs ml-auto shrink-0" style={{ color }}>{t.completedJobs}</span>
                  {isActive && <X className="w-3.5 h-3.5 shrink-0 text-(--c-muted)" />}
                  {!isActive && <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-50" />}
                </button>
              );
            })}
          </div>

          {/* Tasker detail panel */}
          {selectedTasker && (
            <div>
              {tdLoading
                ? <div className="flex items-center justify-center h-40">
                    <Loader2 className="w-6 h-6 text-(--c-primary-strong) animate-spin" />
                  </div>
                : taskerDetail && (
                    <TaskerDetailPanel
                      tasker={selectedTasker}
                      data={taskerDetail}
                      period={period}
                      onClose={() => setSelectedTasker(null)}
                    />
                  )
              }
            </div>
          )}

          {/* Bar chart + leaderboard */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2 border-t border-(--c-line)/40">
            {/* Bar */}
            <div>
              <p className="text-xs text-(--c-muted) font-semibold mb-3 uppercase tracking-wide">Biểu đồ đơn hoàn thành</p>
              <ResponsiveContainer width="100%" height={taskerBarData.length * 48 + 20}>
                <BarChart layout="vertical" data={taskerBarData} margin={{ top: 0, right: 36, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.12} />
                  <XAxis type="number" axisLine={false} tickLine={false}
                    tick={{ fontSize: 11, fill: "#8A95A8" }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false}
                    tick={{ fontSize: 11, fill: "#8A95A8" }} width={70} />
                  <Tooltip content={<BarTip />} cursor={{ fill: "var(--c-card-2)", opacity: 0.6 }} />
                  <Bar dataKey="Đơn HT" radius={[0, 6, 6, 0]} maxBarSize={26}>
                    {taskerBarData.map((_, i) => (
                      <Cell key={i}
                        fill={RANK_COLORS[i] ?? RANK_COLORS[5]}
                        fillOpacity={selectedTasker
                          ? (topTaskers[i]?.taskerId === selectedTasker.taskerId ? 1 : 0.3)
                          : 1 - i * 0.1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Leaderboard */}
            <div>
              <p className="text-xs text-(--c-muted) font-semibold mb-3 uppercase tracking-wide">Bảng xếp hạng</p>
              <div className="space-y-3">
                {topTaskers.slice(0, 6).map((tasker, idx) => {
                  const maxJobs  = topTaskers[0]?.completedJobs ?? 1;
                  const pct      = maxJobs > 0 ? (tasker.completedJobs / maxJobs) * 100 : 0;
                  const color    = RANK_COLORS[idx] ?? RANK_COLORS[5];
                  const isActive = selectedTasker?.taskerId === tasker.taskerId;

                  return (
                    <button
                      key={tasker.taskerId}
                      onClick={() => setSelectedTasker(isActive ? null : tasker)}
                      className={[
                        "w-full flex items-center gap-3 rounded-xl p-2 transition-all text-left group",
                        isActive ? "bg-(--c-primary-soft)" : "hover:bg-(--c-card-2)",
                      ].join(" ")}
                    >
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-base"
                        style={idx < 3 ? { background: color + "18" } : { background: "var(--c-card-2)" }}>
                        {idx < 3 ? RANK_EMOJIS[idx] : <span className="text-xs font-bold text-(--c-muted)">#{idx + 1}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between mb-1">
                          <p className="text-sm font-bold text-(--c-ink) truncate">{tasker.fullName}</p>
                          <span className="text-sm font-black shrink-0 ml-2" style={{ color }}>
                            {tasker.completedJobs}
                          </span>
                        </div>
                        <div className="h-2 bg-(--c-card-2) rounded-full overflow-hidden">
                          <div className="h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              background: `linear-gradient(90deg,${color}88,${color})`,
                              opacity: selectedTasker && !isActive ? 0.35 : 1,
                              transition: `width 0.9s cubic-bezier(.4,0,.2,1) ${idx * 80}ms`,
                            }}
                          />
                        </div>
                      </div>
                      <ChevronRight className={[
                        "w-4 h-4 shrink-0 transition-all",
                        isActive ? "text-(--c-primary-strong) rotate-90" : "text-(--c-muted) opacity-0 group-hover:opacity-100",
                      ].join(" ")} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {totalBookings === 0 && (
        <div className="text-center py-20 border-2 border-dashed border-(--c-line) rounded-2xl bg-(--c-card-2)">
          <div className="w-20 h-20 rounded-2xl bg-(--c-card) flex items-center justify-center mx-auto mb-5 shadow-sm">
            <BarChart3 className="w-10 h-10 text-(--c-muted)" />
          </div>
          <p className="text-base font-bold text-(--c-muted)">Không có dữ liệu trong khoảng thời gian này</p>
          <p className="text-sm text-(--c-muted) mt-2">
            Thử chọn khoảng khác hoặc{" "}
            <button className="text-(--c-primary-strong) font-semibold" onClick={() => setPeriod("all")}>
              xem tất cả dữ liệu
            </button>.
          </p>
        </div>
      )}
    </div>
  );
}
