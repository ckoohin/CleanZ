"use client";

import * as React from "react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addMonths, startOfYear, endOfYear, addDays } from "date-fns";
import { vi } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { CalendarIcon, X, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Calendar } from "./calendar";
import { cn } from "./utils";

// ── Helpers ──────────────────────────────────────────────────────────────────
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

// ── Presets ──────────────────────────────────────────────────────────────────
const getPresets = () => {
  const today = new Date();
  return [
    { label: "Tuần này", from: startOfWeek(today, { weekStartsOn: 1 }), to: endOfWeek(today, { weekStartsOn: 1 }) },
    { label: "Tuần tới", from: startOfWeek(addDays(today, 7), { weekStartsOn: 1 }), to: endOfWeek(addDays(today, 7), { weekStartsOn: 1 }) },
    { label: "Tháng này", from: startOfMonth(today), to: endOfMonth(today) },
    { label: "Tháng tới", from: startOfMonth(addMonths(today, 1)), to: endOfMonth(addMonths(today, 1)) },
    { label: "3 tháng tới", from: today, to: endOfMonth(addMonths(today, 2)) },
    { label: "6 tháng tới", from: today, to: endOfMonth(addMonths(today, 5)) },
    { label: "Năm nay", from: startOfYear(today), to: endOfYear(today) },
  ];
};

// ── Component ─────────────────────────────────────────────────────────────────
export interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
  placeholder = "Không giới hạn",
  className,
  disabled,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  const range: DateRange = {
    from: fromISO(startDate),
    to: fromISO(endDate),
  };

  const handleSelect = (r: DateRange | undefined) => {
    onStartChange(r?.from ? toISO(r.from) : "");
    onEndChange(r?.to ? toISO(r.to) : "");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onStartChange("");
    onEndChange("");
  };

  const hasValue = !!startDate || !!endDate;

  const displayText = hasValue
    ? `${toDisplay(startDate) || "…"}  →  ${toDisplay(endDate) || "…"}`
    : placeholder;

  const presets = getPresets();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "inline-flex items-center gap-2 h-9 px-3 rounded-lg border text-sm transition-colors",
            "bg-white border-slate-200 hover:border-primary/60 focus:outline-none",
            open && "border-primary ring-1 ring-primary/20",
            !hasValue ? "text-muted-foreground" : "text-foreground font-semibold",
            className
          )}
        >
          <CalendarIcon className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="whitespace-nowrap">{displayText}</span>
          {hasValue && (
            <X
              className="w-3.5 h-3.5 text-slate-400 hover:text-slate-700 shrink-0 ml-1 transition-colors"
              onClick={handleClear}
            />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-auto p-0 shadow-xl border border-slate-200 rounded-xl overflow-hidden"
      >
        <div className="flex">
          {/* Presets panel */}
          <div className="w-36 border-r border-slate-100 py-2 flex flex-col">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1">Chọn nhanh</p>
            {presets.map((p) => {
              const isActive = startDate === toISO(p.from) && endDate === toISO(p.to);
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    onStartChange(toISO(p.from));
                    onEndChange(toISO(p.to));
                    setOpen(false);
                  }}
                  className={cn(
                    "flex items-center justify-between px-3 py-1.5 text-sm transition-colors text-left w-full",
                    isActive
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-slate-700 hover:bg-muted hover:text-foreground"
                  )}
                >
                  {p.label}
                  {isActive && <ChevronRight className="w-3 h-3 opacity-60" />}
                </button>
              );
            })}
            <div className="mt-auto px-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => { onStartChange(""); onEndChange(""); setOpen(false); }}
                className="text-xs text-slate-400 hover:text-slate-600 font-semibold transition-colors w-full text-left"
              >
                Xoá lựa chọn
              </button>
            </div>
          </div>

          {/* Calendar panel */}
          <div className="p-3">
            <Calendar
              mode="range"
              selected={range}
              onSelect={handleSelect}
              numberOfMonths={2}
              locale={vi}
              disabled={{ before: new Date() }}
              classNames={{
                months: "flex gap-4",
              }}
            />
            {/* Footer */}
            <div className="border-t border-slate-100 pt-2 mt-1 flex items-center justify-between px-1">
              <span className="text-xs text-slate-400">
                {hasValue
                  ? `${toDisplay(startDate) || "…"} → ${toDisplay(endDate) || "…"}`
                  : "Chưa chọn khoảng thời gian"}
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xs font-bold text-primary hover:text-primary/80 transition-colors px-2 py-1 rounded"
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
