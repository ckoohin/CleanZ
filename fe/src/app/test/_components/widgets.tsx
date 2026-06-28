'use client';

import {
  UserPlus,
  ShieldCheck,
  TriangleAlert,
  LifeBuoy,
  Banknote,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Star,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sparkline, AreaChart, Donut } from './charts';
import {
  hero,
  kpis,
  alerts,
  statusSnapshot,
  recentBookings,
  topTaskers,
  areaPerf,
  gmvSeries,
  statusMeta,
  formatVnd,
  type Kpi,
  type AlertItem,
} from '../_lib/mock';

export const cardBase =
  'flex h-full flex-col overflow-hidden rounded-2xl border bg-[var(--c-card)] border-[var(--c-line)] shadow-[0_1px_2px_rgba(15,27,51,0.04),0_8px_24px_-14px_rgba(15,27,51,0.10)]';

const ALERT_ICON: Record<AlertItem['icon'], LucideIcon> = {
  unassigned: UserPlus,
  kyc: ShieldCheck,
  incident: TriangleAlert,
  ticket: LifeBuoy,
  withdrawal: Banknote,
};

const ALERT_COLOR: Record<string, string> = {
  unassigned: '#D97706',
  kyc: '#2563EB',
  incident: '#E11D48',
  ticket: '#7C3AED',
  withdrawal: '#059669',
};

function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('text-[11px] font-semibold uppercase tracking-[0.16em]', className)}>{children}</div>;
}

function DeltaPill({ pct, trend, goodWhenDown }: { pct: number; trend: 'up' | 'down'; goodWhenDown?: boolean }) {
  const good = goodWhenDown ? trend === 'down' : trend === 'up';
  const Icon = trend === 'up' ? TrendingUp : TrendingDown;
  const sign = trend === 'up' ? '+' : '−';
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-bold tabular-nums"
      style={{ color: good ? '#0E9F6E' : '#E11D48', background: good ? 'rgba(14,159,110,0.12)' : 'rgba(225,29,72,0.12)' }}
    >
      <Icon className="size-3" />
      {sign}
      {pct.toLocaleString('vi-VN')}%
    </span>
  );
}

function CardHead({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="text-[15px] font-bold text-[var(--c-ink)]">{title}</h3>
        {hint && <p className="mt-0.5 text-[12.5px] text-[var(--c-muted)]">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

function StatusBadge({ status }: { status: keyof typeof statusMeta }) {
  const m = statusMeta[status];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold" style={{ color: m.color, background: m.soft }}>
      <span className="size-1.5 rounded-full" style={{ background: m.color }} />
      {m.label}
    </span>
  );
}

// ── Today / GMV summary ──
export function TodayWidget() {
  return (
    <div className={cn(cardBase, 'justify-between p-5')} style={{ background: 'linear-gradient(120deg, var(--c-hero) 0%, var(--c-card) 65%)' }}>
      <div className="flex items-start justify-between gap-3">
        <Eyebrow className="text-[var(--c-primary-strong)]">Doanh thu hôm nay</Eyebrow>
        <DeltaPill pct={hero.deltaPct} trend="up" />
      </div>
      <div className="mt-2">
        <div className="font-sans text-[30px] font-bold leading-none tracking-tight text-[var(--c-ink)] tabular-nums">{formatVnd(hero.todayGmv)}</div>
        <div className="mt-1.5 text-[12.5px] text-[var(--c-muted)]">{hero.ordersToday} đơn · so với hôm qua</div>
      </div>
      <div className="mt-2 text-[var(--c-primary)]">
        <Sparkline data={hero.spark} width={220} height={44} className="w-full" />
      </div>
    </div>
  );
}

// ── KPI ──
export function KpiWidget({ kpiKey }: { kpiKey: string }) {
  const kpi = kpis.find((k) => k.key === kpiKey) as Kpi;
  return (
    <div className={cn(cardBase, 'justify-center p-5')}>
      <div className="flex items-center justify-between">
        <Eyebrow className="text-[var(--c-muted)]">{kpi.label}</Eyebrow>
        <DeltaPill pct={kpi.deltaPct} trend={kpi.trend} goodWhenDown={kpi.goodWhenDown} />
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <div className="text-[28px] font-bold leading-none text-[var(--c-ink)] tabular-nums">{kpi.value}</div>
          <div className="mt-1.5 text-[12px] text-[var(--c-muted)]">{kpi.sub}</div>
        </div>
        <div className="shrink-0 text-[var(--c-primary)]">
          <Sparkline data={kpi.spark} width={88} height={36} />
        </div>
      </div>
    </div>
  );
}

// ── Needs-action ──
export function AlertsWidget() {
  return (
    <div className={cn(cardBase, 'p-5')}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-[15px] font-bold text-[var(--c-ink)]">Cần xử lý ngay</h3>
          <span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: 'var(--c-primary-soft)', color: 'var(--c-primary-strong)' }}>
            37 việc
          </span>
        </div>
        <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[var(--c-ink-soft)]">
          Xem tất cả <ArrowUpRight className="size-3.5" />
        </span>
      </div>
      <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {alerts.map((a) => {
          const Icon = ALERT_ICON[a.icon];
          const c = ALERT_COLOR[a.key];
          return (
            <div key={a.key} className="flex items-start gap-3 rounded-xl border border-[var(--c-line)] bg-[var(--c-card-2)] p-3.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg" style={{ background: `${c}1f`, color: c }}>
                <Icon className="size-[18px]" />
              </span>
              <div className="min-w-0">
                <div className="text-[22px] font-bold leading-none text-[var(--c-ink)] tabular-nums">{a.count}</div>
                <div className="mt-1 truncate text-[12.5px] font-semibold text-[var(--c-ink)]">{a.label}</div>
                <div className="mt-0.5 text-[11.5px] text-[var(--c-muted)]">{a.note}</div>
                {a.urgent && <div className="mt-1 text-[11.5px] font-semibold text-[#E11D48]">{a.urgent}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── GMV chart ──
export function GmvChartWidget() {
  return (
    <div className={cn(cardBase, 'p-5')}>
      <CardHead
        title="Doanh thu 14 ngày"
        hint="Tổng GMV các đơn hoàn tất theo ngày"
        action={<span className="rounded-lg border border-[var(--c-line)] bg-[var(--c-card-2)] px-2.5 py-1 text-[12px] font-semibold text-[var(--c-ink-soft)]">Theo ngày</span>}
      />
      <div className="flex flex-1 items-center text-[var(--c-primary)]">
        <AreaChart series={gmvSeries} ariaLabel="Biểu đồ doanh thu 14 ngày" />
      </div>
    </div>
  );
}

// ── Booking status ──
export function StatusWidget() {
  const total = statusSnapshot.reduce((a, s) => a + s.value, 0);
  return (
    <div className={cn(cardBase, 'p-5')}>
      <CardHead title="Trạng thái đơn hàng" hint="Tháng 6/2026" />
      <div className="flex flex-1 flex-col items-center justify-center gap-5 sm:flex-row">
        <div className="text-[var(--c-ink)]">
          <Donut segments={statusSnapshot} total={total} />
        </div>
        <ul className="w-full flex-1 space-y-2.5">
          {statusSnapshot.map((s) => (
            <li key={s.label} className="flex items-center gap-2.5 text-[13px]">
              <span className="size-2.5 rounded-sm" style={{ background: s.color }} />
              <span className="text-[var(--c-ink-soft)]">{s.label}</span>
              <span className="ml-auto font-semibold text-[var(--c-ink)] tabular-nums">{s.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── Recent bookings ──
export function RecentBookingsWidget() {
  return (
    <div className={cn(cardBase, 'p-5')}>
      <CardHead
        title="Đơn hàng gần đây"
        action={<span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[var(--c-ink-soft)]">Xem tất cả <ArrowUpRight className="size-3.5" /></span>}
      />
      <div className="cz-scroll -mx-2 flex-1 overflow-auto px-2">
        <table className="w-full min-w-[560px] border-collapse">
          <thead className="sticky top-0 z-10 bg-[var(--c-card)]">
            <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--c-muted)]">
              <th className="px-2 pb-2.5 font-semibold">Mã / Khách hàng</th>
              <th className="px-2 pb-2.5 font-semibold">Dịch vụ</th>
              <th className="px-2 pb-2.5 font-semibold">Tasker</th>
              <th className="px-2 pb-2.5 text-right font-semibold">Giá trị</th>
              <th className="px-2 pb-2.5 font-semibold">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {recentBookings.map((b) => (
              <tr key={b.id} className="border-t border-[var(--c-line)] text-[13px]">
                <td className="px-2 py-3">
                  <div className="font-semibold text-[var(--c-ink)]">{b.customer}</div>
                  <div className="text-[11.5px] text-[var(--c-muted)] tabular-nums">{b.id} · {b.time}</div>
                </td>
                <td className="px-2 py-3 text-[var(--c-ink-soft)]">{b.service}</td>
                <td className="px-2 py-3 text-[var(--c-ink-soft)]">{b.tasker ?? <span className="italic text-[var(--c-muted)]">Chưa gán</span>}</td>
                <td className="px-2 py-3 text-right font-semibold text-[var(--c-ink)] tabular-nums">{formatVnd(b.amount)}</td>
                <td className="px-2 py-3"><StatusBadge status={b.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Top taskers ──
export function TopTaskersWidget() {
  return (
    <div className={cn(cardBase, 'p-5')}>
      <CardHead title="Top Tasker" hint="Đánh giá cao nhất tháng" />
      <ul className="cz-scroll flex-1 space-y-1 overflow-auto">
        {topTaskers.map((t, i) => (
          <li key={t.name} className="flex items-center gap-3 rounded-lg px-1 py-2">
            <span className="w-4 text-center text-[12px] font-bold text-[var(--c-muted)] tabular-nums">{i + 1}</span>
            <span className="grid size-9 shrink-0 place-items-center rounded-full text-[12px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #FFC774 0%, #FF9800 100%)' }}>
              {t.initials}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold text-[var(--c-ink)]">{t.name}</div>
              <div className="text-[11.5px] text-[var(--c-muted)]">{t.level} · {t.jobs} đơn</div>
            </div>
            <span className="inline-flex items-center gap-1 text-[12.5px] font-bold text-[var(--c-ink)] tabular-nums">
              <Star className="size-3.5" style={{ fill: 'var(--c-primary)', color: 'var(--c-primary)' }} />
              {t.rating.toLocaleString('vi-VN')}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Area performance ──
export function AreaPerfWidget() {
  const max = Math.max(...areaPerf.map((a) => a.value));
  return (
    <div className={cn(cardBase, 'p-5')}>
      <CardHead title="Đơn theo khu vực" hint="TP. Hồ Chí Minh" />
      <ul className="flex flex-1 flex-col justify-center space-y-3">
        {areaPerf.map((a) => (
          <li key={a.name}>
            <div className="mb-1 flex items-center justify-between text-[12.5px]">
              <span className="text-[var(--c-ink-soft)]">{a.name}</span>
              <span className="font-semibold text-[var(--c-ink)] tabular-nums">{a.value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--c-card-2)]">
              <div className="h-full rounded-full" style={{ width: `${(a.value / max) * 100}%`, background: 'linear-gradient(90deg, #FFC24B, #FF9800)' }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
