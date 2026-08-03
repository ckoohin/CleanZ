"use client";

import * as React from "react";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addMonths,
  startOfYear,
  endOfYear,
  addDays,
  subMonths,
} from "date-fns";
import { vi } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { CalendarIcon, X, ChevronRight, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Calendar } from "./calendar";
import { cn } from "./utils";

// ── Helpers ───────────────────────────────────────────────────────────────────
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

// ── Presets ───────────────────────────────────────────────────────────────────
const getPresets = () => {
  const today = new Date();
  return [
    {
      label: "Hôm nay",
      from: today,
      to: today,
      navMonth: today,
    },
    {
      label: "Hôm qua",
      from: addDays(today, -1),
      to: addDays(today, -1),
      navMonth: addDays(today, -1),
    },
    {
      label: "7 ngày qua",
      from: addDays(today, -6),
      to: today,
      navMonth: addDays(today, -6),
    },
    {
      label: "Tuần này",
      from: startOfWeek(today, { weekStartsOn: 1 }),
      to: endOfWeek(today, { weekStartsOn: 1 }),
      navMonth: startOfWeek(today, { weekStartsOn: 1 }),
    },
    {
      label: "Tuần trước",
      from: startOfWeek(addDays(today, -7), { weekStartsOn: 1 }),
      to: endOfWeek(addDays(today, -7), { weekStartsOn: 1 }),
      navMonth: startOfWeek(addDays(today, -7), { weekStartsOn: 1 }),
    },
    {
      label: "Tháng này",
      from: startOfMonth(today),
      to: endOfMonth(today),
      navMonth: startOfMonth(today),
    },
    {
      label: "Tháng trước",
      from: startOfMonth(addMonths(today, -1)),
      to: endOfMonth(addMonths(today, -1)),
      navMonth: startOfMonth(addMonths(today, -1)),
    },
    {
      label: "3 tháng qua",
      from: startOfMonth(addMonths(today, -2)),
      to: endOfMonth(today),
      navMonth: startOfMonth(addMonths(today, -2)),
    },
    {
      label: "Năm nay",
      from: startOfYear(today),
      to: endOfYear(today),
      navMonth: startOfYear(today),
    },
  ];
};

// ── Types ─────────────────────────────────────────────────────────────────────
export interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartChange?: (v: string) => void;
  onEndChange?: (v: string) => void;
  onRangeChange?: (start: string, end: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Cho phép chọn ngày quá khứ — dùng cho màn hình báo cáo/tài chính */
  allowPastDates?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function DateRangePicker({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
  onRangeChange,
  placeholder = "Chọn khoảng thời gian",
  className,
  disabled,
  allowPastDates = false,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  // State để kiểm soát tháng hiển thị trên calendar
  const [calendarMonth, setCalendarMonth] = React.useState<Date>(() => {
    // Mặc định: nếu đã có startDate thì navigate về đó, không thì tháng hiện tại
    return fromISO(startDate) ?? new Date();
  });

  const range: DateRange = {
    from: fromISO(startDate),
    to: fromISO(endDate),
  };

  // Khi mở popover, tự navigate về tháng của startDate hiện tại
  React.useEffect(() => {
    if (open) {
      const d = fromISO(startDate);
      if (d) setCalendarMonth(d);
    }
  }, [open, startDate]);

  const emitChange = (startStr: string, endStr: string) => {
    if (onRangeChange) {
      onRangeChange(startStr, endStr);
    } else {
      onStartChange?.(startStr);
      onEndChange?.(endStr);
    }
  };

  const handleSelect = (r: DateRange | undefined) => {
    const startStr = r?.from ? toISO(r.from) : "";
    const endStr = r?.to ? toISO(r.to) : "";
    emitChange(startStr, endStr);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    emitChange("", "");
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
        className="w-auto p-0 shadow-2xl border border-slate-200/80 rounded-2xl overflow-hidden"
        style={{ zIndex: 9999 }}
      >
        <div className="flex">
          {/* ── Presets panel ── */}
          <div className="w-40 border-r border-slate-100 bg-slate-50/60 py-3 flex flex-col gap-0.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 mb-1">
              Chọn nhanh
            </p>
            {presets.map((p) => {
              const isActive =
                startDate === toISO(p.from) && endDate === toISO(p.to);
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    // Navigate calendar về đúng tháng của preset
                    setCalendarMonth(p.navMonth);
                    emitChange(toISO(p.from), toISO(p.to));
                  }}
                  className={cn(
                    "flex items-center justify-between mx-2 px-3 py-2 text-[13px] rounded-lg transition-all duration-150 text-left w-[calc(100%-16px)]",
                    isActive
                      ? "bg-primary text-white font-semibold shadow-sm"
                      : "text-slate-700 hover:bg-white hover:shadow-sm hover:text-slate-900"
                  )}
                >
                  <span>{p.label}</span>
                  {isActive && <Check className="w-3.5 h-3.5 opacity-90 shrink-0" />}
                </button>
              );
            })}

            {/* Clear */}
            <div className="mt-auto mx-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  emitChange("", "");
                  setCalendarMonth(new Date());
                }}
                className="text-xs text-slate-400 hover:text-red-500 font-semibold transition-colors w-full text-left px-3 py-2 rounded-lg hover:bg-red-50"
              >
                Xoá lựa chọn
              </button>
            </div>
          </div>

          {/* ── Calendar panel ── */}
          <div className="p-4">
            <Calendar
              mode="range"
              selected={range}
              onSelect={handleSelect}
              month={calendarMonth}
              onMonthChange={setCalendarMonth}
              numberOfMonths={2}
              locale={vi}
              disabled={allowPastDates ? undefined : { before: new Date() }}
              classNames={{
                months: "flex gap-6",
              }}
            />

            {/* Footer */}
            <div className="border-t border-slate-100 pt-3 mt-2 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                {hasValue
                  ? `${toDisplay(startDate) || "…"} → ${toDisplay(endDate) || "…"}`
                  : "Chưa chọn khoảng thời gian"}
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xs font-bold text-white bg-primary hover:bg-primary/90 transition-colors px-4 py-1.5 rounded-lg shadow-sm"
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
