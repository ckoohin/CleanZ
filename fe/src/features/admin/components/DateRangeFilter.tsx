"use client";

import * as React from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import type { DateRange as DayPickerRange } from "react-day-picker";

import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useDashboardStore } from "../stores/dashboard.store";
import type { DateRange } from "../types/dashboard.types";
import {
  RANGE_OPTIONS,
  fmtDate,
  matchRangeKey,
  rangeLabel,
  rangeOf,
} from "../lib/date-ranges";

/**
 * Kỳ thống kê dùng chung cho CẢ TRANG dashboard. Mọi widget theo kỳ đều đọc
 * cùng khoảng này — nhờ đó "Xuất báo cáo" có đúng một kỳ để ghi vào file.
 */
export function DateRangeFilter() {
  const [open, setOpen] = React.useState(false);
  const range = useDashboardStore((s) => s.dateRange);
  const setDateRange = useDashboardStore((s) => s.setDateRange);

  const activeKey = matchRangeKey(range);
  const [draft, setDraft] = React.useState<DayPickerRange | undefined>();

  const pick = (r: DateRange) => {
    setDateRange(r);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-xl border px-3",
            "border-[var(--c-line)] bg-[var(--c-card)] text-[13px] font-semibold",
            "text-[var(--c-ink)] transition-colors hover:bg-[var(--c-card-2)]",
          )}
          title={`${range.fromDate} → ${range.toDate}`}
        >
          <CalendarDays className="size-4 shrink-0 text-[var(--c-muted)]" />
          <span>{rangeLabel(range)}</span>
          <ChevronDown className="size-3.5 shrink-0 text-[var(--c-muted)]" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-auto p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex">
          <div className="flex w-40 flex-col gap-0.5 border-r border-[var(--c-line)] p-2">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => pick(rangeOf(opt.key))}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-left text-[13px] font-medium transition-colors",
                  activeKey === opt.key
                    ? "bg-[var(--c-primary)]/10 text-[var(--c-primary-strong)]"
                    : "text-[var(--c-ink)] hover:bg-[var(--c-card-2)]",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="p-2">
            <Calendar
              mode="range"
              numberOfMonths={2}
              // Kỳ nằm ở tương lai luôn rỗng — chặn luôn cho khỏi tưởng là lỗi.
              disabled={{ after: new Date() }}
              defaultMonth={new Date(range.fromDate)}
              selected={
                draft ?? {
                  from: new Date(range.fromDate),
                  to: new Date(range.toDate),
                }
              }
              onSelect={(r) => {
                setDraft(r);
                if (r?.from && r?.to) {
                  pick({ fromDate: fmtDate(r.from), toDate: fmtDate(r.to) });
                  setDraft(undefined);
                }
              }}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
