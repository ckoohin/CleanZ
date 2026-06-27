import * as React from "react";
import { cn } from "@/lib/utils";

export interface FilterTab<K extends string = string> {
  key: K;
  label: string;
  count?: number;
}

export interface FilterTabsProps<K extends string = string> {
  tabs: FilterTab<K>[];
  value: K;
  onChange: (key: K) => void;
  className?: string;
}

/**
 * Segmented filter control — active tab gets a raised card surface (design system §7).
 * Extracted from test/_components/CustomerManagement.tsx status tabs.
 */
export function FilterTabs<K extends string = string>({
  tabs,
  value,
  onChange,
  className,
}: FilterTabsProps<K>) {
  return (
    <div
      className={cn("flex flex-wrap items-center gap-1 rounded-xl border p-1", className)}
      style={{ borderColor: "var(--c-line-strong)", background: "var(--c-card-2)" }}
    >
      {tabs.map((t) => {
        const active = value === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-primary)]/40",
              active
                ? "bg-[var(--c-card)] text-[var(--c-ink)] shadow-sm"
                : "text-[var(--c-muted)] hover:text-[var(--c-ink)]"
            )}
          >
            {t.label}
            {t.count != null && (
              <span className="text-[11px] tabular-nums text-[var(--c-muted)]">{t.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
