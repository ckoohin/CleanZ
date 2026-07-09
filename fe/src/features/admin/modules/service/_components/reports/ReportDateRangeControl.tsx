"use client";

import * as React from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  endOfYear,
  subDays,
} from "date-fns";
import { vi } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { CalendarIcon, X, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const toISO = (d: Date) => format(d, "yyyy-MM-dd");
const toDisplay = (s: string) => {
  if (!s) return "";
  const [y, m, day] = s.split("-");
  return `${day}/${m}/${y}`;
};
const fromISO = (s: string): Date | undefined => {
  if (!s) return undefined;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const getPresets = () => {
  const today = new Date();
  return [
    { label: "Tháng này", from: startOfMonth(today), to: today },
    { label: "Tháng trước", from: startOfMonth(subMonths(today, 1)), to: endOfMonth(subMonths(today, 1)) },
    { label: "90 ngày qua", from: subDays(today, 90), to: today },
    { label: "Năm nay", from: startOfYear(today), to: endOfYear(today) },
  ];
};

export interface ReportDateRangeControlProps {
  from?: string;
  to?: string;
  onChange: (from?: string, to?: string) => void;
  className?: string;
}

export function ReportDateRangeControl({ from, to, onChange, className }: ReportDateRangeControlProps) {
  const [open, setOpen] = React.useState(false);

  const range: DateRange = {
    from: fromISO(from ?? ""),
    to: fromISO(to ?? ""),
  };

  const handleSelect = (r: DateRange | undefined) => {
    onChange(r?.from ? toISO(r.from) : undefined, r?.to ? toISO(r.to) : undefined);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(undefined, undefined);
  };

  const hasValue = !!from || !!to;
  const displayText = hasValue ? `${toDisplay(from ?? "") || "…"}  →  ${toDisplay(to ?? "") || "…"}` : "Toàn bộ thời gian";
  const presets = getPresets();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-2 h-10 px-3.5 rounded-xl border-2 text-sm font-semibold transition-all shadow-sm",
            "bg-(--c-card-2) border-(--c-line) hover:border-(--c-primary)/70 hover:shadow-md focus:outline-none",
            open && "border-(--c-primary) ring-2 ring-(--c-primary)/20 bg-(--c-card)",
            !hasValue ? "text-(--c-muted)" : "text-(--c-ink)",
            className
          )}
        >
          <span className="grid place-items-center size-6 rounded-lg bg-(--c-primary-soft) shrink-0">
            <CalendarIcon className="w-3.5 h-3.5 text-(--c-primary-strong)" />
          </span>
          <span className="whitespace-nowrap">{displayText}</span>
          {hasValue && (
            <X
              className="w-3.5 h-3.5 text-(--c-muted) hover:text-(--c-ink) shrink-0 ml-1 transition-colors"
              onClick={handleClear}
            />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" sideOffset={6} className="cz-admin w-auto p-0 shadow-xl border border-(--c-line)/60 rounded-xl overflow-hidden bg-(--c-card)">
        <div className="flex">
          <div className="w-36 border-r border-(--c-line)/40 py-2 flex flex-col">
            <p className="text-[10px] font-bold text-(--c-muted) uppercase tracking-wider px-3 mb-1">Chọn nhanh</p>
            {presets.map((p) => {
              const isActive = from === toISO(p.from) && to === toISO(p.to);
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    onChange(toISO(p.from), toISO(p.to));
                    setOpen(false);
                  }}
                  className={cn(
                    "flex items-center justify-between px-3 py-1.5 text-sm transition-colors text-left w-full",
                    isActive
                      ? "bg-(--c-primary-soft) text-(--c-primary-strong) font-semibold"
                      : "text-(--c-ink) hover:bg-(--c-card-2)"
                  )}
                >
                  {p.label}
                  {isActive && <ChevronRight className="w-3 h-3 opacity-60" />}
                </button>
              );
            })}
            <div className="mt-auto px-3 pt-2 border-t border-(--c-line)/40">
              <button
                type="button"
                onClick={() => { onChange(undefined, undefined); setOpen(false); }}
                className="text-xs text-(--c-muted) hover:text-(--c-ink) font-semibold transition-colors w-full text-left"
              >
                Xoá lựa chọn
              </button>
            </div>
          </div>

          <div className="p-3">
            <Calendar
              mode="range"
              selected={range}
              onSelect={handleSelect}
              numberOfMonths={2}
              locale={vi}
              disabled={{ after: new Date() }}
              classNames={{ months: "flex gap-4" }}
            />
            <div className="border-t border-(--c-line)/40 pt-2 mt-1 flex items-center justify-between px-1">
              <span className="text-xs text-(--c-muted)">
                {hasValue ? `${toDisplay(from ?? "") || "…"} → ${toDisplay(to ?? "") || "…"}` : "Chưa chọn khoảng thời gian"}
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xs font-bold text-(--c-primary-strong) hover:opacity-80 transition-colors px-2 py-1 rounded"
              >
                Xong
              </button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
