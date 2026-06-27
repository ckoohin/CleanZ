// Hand-built SVG charts for the admin kit — theme-aware via currentColor
// (the wrapper sets the colour). Ported from test/_components/charts.tsx.
"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

export function Sparkline({
  data,
  className,
  width = 120,
  height = 38,
}: {
  data: number[];
  className?: string;
  width?: number;
  height?: number;
}) {
  const pad = 3;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const stepX = (width - pad * 2) / (data.length - 1 || 1);
  const x = (i: number) => pad + i * stepX;
  const y = (v: number) => pad + (1 - (v - min) / range) * (height - pad * 2);
  const line = data
    .map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`)
    .join(" ");
  const area = `${line} L ${x(data.length - 1).toFixed(1)} ${height - pad} L ${x(0).toFixed(1)} ${height - pad} Z`;
  const gid = "g" + useId().replace(/:/g, "");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={cn("overflow-visible", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity={0.26} />
          <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={x(data.length - 1)} cy={y(data[data.length - 1])} r={2.6} fill="currentColor" />
    </svg>
  );
}

export function AreaChart({
  series,
  className,
  ariaLabel,
}: {
  series: { day: string; value: number }[];
  className?: string;
  ariaLabel?: string;
}) {
  const gid = "g" + useId().replace(/:/g, "");
  const W = 740;
  const H = 260;
  const padL = 6;
  const padR = 6;
  const padT = 18;
  const padB = 30;
  const values = series.map((s) => s.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const stepX = innerW / (series.length - 1 || 1);
  const x = (i: number) => padL + i * stepX;
  const y = (v: number) => padT + (1 - (v - min) / range) * innerH;
  const line = series
    .map((s, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(s.value).toFixed(1)}`)
    .join(" ");
  const area = `${line} L ${x(series.length - 1).toFixed(1)} ${padT + innerH} L ${x(0).toFixed(1)} ${padT + innerH} Z`;
  const grid = [0, 0.25, 0.5, 0.75, 1];
  const lastIdx = series.length - 1;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={cn("w-full", className)} role="img" aria-label={ariaLabel}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity={0.24} />
          <stop offset="70%" stopColor="currentColor" stopOpacity={0.04} />
          <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
        </linearGradient>
      </defs>

      {grid.map((g, i) => {
        const gy = padT + g * innerH;
        return (
          <line
            key={i}
            x1={padL}
            x2={W - padR}
            y1={gy}
            y2={gy}
            stroke="rgba(148,163,184,0.22)"
            strokeWidth={1}
            strokeDasharray={i === grid.length - 1 ? "0" : "3 5"}
          />
        );
      })}

      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(lastIdx)} cy={y(series[lastIdx].value)} r={7} fill="currentColor" fillOpacity={0.16} />
      <circle cx={x(lastIdx)} cy={y(series[lastIdx].value)} r={3.4} fill="currentColor" />

      {series.map((s, i) =>
        i % 2 === 0 || i === lastIdx ? (
          <text key={s.day} x={x(i)} y={H - 8} textAnchor="middle" fontSize={12} fill="rgba(120,134,160,0.9)">
            {s.day}
          </text>
        ) : null
      )}
    </svg>
  );
}

export function Donut({
  segments,
  total,
  centerLabel = "đơn / tháng",
  className,
}: {
  segments: { label: string; value: number; color: string }[];
  total: number;
  centerLabel?: string;
  className?: string;
}) {
  const size = 168;
  const stroke = 22;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const sum = segments.reduce((a, s) => a + s.value, 0) || 1;
  let acc = 0;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className={cn("shrink-0", className)} width={size} height={size} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(148,163,184,0.16)" strokeWidth={stroke} />
      {segments.map((s) => {
        const frac = s.value / sum;
        const dash = frac * c;
        const el = (
          <circle
            key={s.label}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={stroke}
            strokeDasharray={`${dash} ${c - dash}`}
            strokeDashoffset={-acc}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        );
        acc += dash;
        return el;
      })}
      <text x="50%" y="46%" textAnchor="middle" fontSize={34} fontWeight={700} fill="currentColor">
        {total}
      </text>
      <text x="50%" y="60%" textAnchor="middle" fontSize={13} fill="rgba(120,134,160,0.95)">
        {centerLabel}
      </text>
    </svg>
  );
}

export interface HorizontalBarItem {
  label: string;
  value: number;
  /** Optional override; defaults to amber gradient. */
  color?: string;
}

/**
 * Horizontal progress-bar list — consolidates the many "X by category" widgets
 * (area performance, levels, fee breakdown…) into one reusable chart.
 */
export function HorizontalBarChart({
  items,
  max,
  formatValue,
  className,
}: {
  items: HorizontalBarItem[];
  max?: number;
  formatValue?: (v: number) => string;
  className?: string;
}) {
  const peak = max ?? Math.max(1, ...items.map((a) => a.value));
  return (
    <ul className={cn("space-y-3", className)}>
      {items.map((a) => (
        <li key={a.label}>
          <div className="mb-1 flex items-center justify-between text-[12.5px]">
            <span className="text-[var(--c-ink-soft)]">{a.label}</span>
            <span className="font-semibold text-[var(--c-ink)] tabular-nums">
              {formatValue ? formatValue(a.value) : a.value}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--c-card-2)]">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, (a.value / peak) * 100)}%`,
                background: a.color ?? "linear-gradient(90deg, #FFC24B, #FF9800)",
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
