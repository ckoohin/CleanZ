"use client";

import { cn } from "@/lib/utils";

export interface MetricOption<T extends string> {
  key: T;
  label: string;
}

export function MetricToggle<T extends string>({
  options, value, onChange,
}: {
  options: MetricOption<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-1 p-1 bg-(--c-card-2) rounded-xl shrink-0">
      {options.map((opt) => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className={cn(
            "px-3 py-1 rounded-lg text-xs font-bold transition-all",
            value === opt.key ? "bg-(--c-card) text-(--c-primary-strong) shadow-sm" : "text-(--c-muted) hover:text-(--c-ink)",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
