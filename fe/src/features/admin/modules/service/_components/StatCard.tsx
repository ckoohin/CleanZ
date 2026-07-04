import React from "react";
import { cn } from "@/lib/utils";

export function StatCard({ icon: Icon, iconColor, bgColor, label, value, sub }: {
  icon: React.ElementType; iconColor: string; bgColor: string;
  label: string; value: string | number; sub?: string;
}) {
  return (
    <div className="bg-(--c-card) border border-(--c-line)/50 rounded-2xl p-5 flex items-center gap-4">
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", bgColor)}>
        <Icon className={cn("w-5 h-5", iconColor)} aria-hidden="true" />
      </div>
      <div>
        <p className="text-xs text-(--c-muted) font-semibold uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-black text-(--c-ink) leading-tight">{value}</p>
        {sub && <p className="text-xs text-(--c-muted) mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
