import * as React from "react";
import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminCard } from "./AdminCard";

export interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  /** e.g. "18%" — rendered as a coloured delta pill when present. */
  delta?: string;
  /** up = green by default, down = red (set goodWhenDown to invert). */
  deltaTrend?: "up" | "down";
  goodWhenDown?: boolean;
  /** Icon chip accent colour (hex). */
  tint?: string;
  className?: string;
}

/**
 * KPI stat card — square icon chip + eyebrow label + tabular number + optional delta.
 * Extracted from test/_components/CustomerManagement.tsx StatCard.
 */
export function StatCard({
  icon: Icon,
  label,
  value,
  delta,
  deltaTrend = "up",
  goodWhenDown = false,
  tint = "#FF9800",
  className,
}: StatCardProps) {
  const good = goodWhenDown ? deltaTrend === "down" : deltaTrend === "up";
  const DeltaIcon = deltaTrend === "up" ? TrendingUp : TrendingDown;
  return (
    <AdminCard className={cn("flex items-center gap-4 p-4", className)}>
      <span
        className="grid size-11 shrink-0 place-items-center rounded-xl"
        style={{ background: `${tint}1f`, color: tint }}
      >
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--c-muted)]">
          {label}
        </div>
        <div className="mt-0.5 flex items-baseline gap-2">
          <span className="text-[22px] font-bold leading-none text-[var(--c-ink)] tabular-nums">
            {value}
          </span>
          {delta && (
            <span
              className="inline-flex items-center gap-0.5 text-[12px] font-bold tabular-nums"
              style={{ color: good ? "#0E9F6E" : "#E11D48" }}
            >
              <DeltaIcon className="size-3" />
              {delta}
            </span>
          )}
        </div>
      </div>
    </AdminCard>
  );
}
