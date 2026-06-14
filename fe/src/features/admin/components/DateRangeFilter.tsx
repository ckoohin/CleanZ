"use client";

import * as React from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import type { DateRange as DayPickerRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useDashboardStore } from "../stores/dashboard.store";
import type { DateRange } from "../types/dashboard.types";

type QuickKey = "week" | "month" | "year" | "custom";

function getRange(key: QuickKey): DateRange | null {
  const now = new Date();
  if (key === "week") {
    const day = now.getDay(); // 0=Sun
    const diffToMon = (day === 0 ? -6 : 1 - day);
    const mon = new Date(now);
    mon.setDate(now.getDate() + diffToMon);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return { fromDate: fmt(mon), toDate: fmt(sun) };
  }
  if (key === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { fromDate: fmt(from), toDate: fmt(to) };
  }
  if (key === "year") {
    return {
      fromDate: `${now.getFullYear()}-01-01`,
      toDate: `${now.getFullYear()}-12-31`,
    };
  }
  return null;
}

function fmt(d: Date) {
  return d.toISOString().split("T")[0];
}

function activeKey(dateRange: DateRange): QuickKey {
  const now = new Date();
  const w = getRange("week");
  const m = getRange("month");
  const y = getRange("year");
  if (w && dateRange.fromDate === w.fromDate && dateRange.toDate === w.toDate) return "week";
  if (m && dateRange.fromDate === m.fromDate && dateRange.toDate === m.toDate) return "month";
  if (y && dateRange.fromDate === y.fromDate && dateRange.toDate === y.toDate) return "year";
  return "custom";
}

const QUICK: { key: QuickKey; label: string }[] = [
  { key: "week", label: "Tuần này" },
  { key: "month", label: "Tháng này" },
  { key: "year", label: "Năm này" },
  { key: "custom", label: "Tuỳ chọn" },
];

export function DateRangeFilter() {
  const { dateRange, setDateRange } = useDashboardStore();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState<DayPickerRange | undefined>();

  const current = activeKey(dateRange);

  function handleQuick(key: QuickKey) {
    if (key === "custom") {
      setOpen(true);
      return;
    }
    const r = getRange(key);
    if (r) setDateRange(r);
  }

  function handleConfirm() {
    if (pending?.from && pending?.to) {
      setDateRange({ fromDate: fmt(pending.from), toDate: fmt(pending.to) });
      setOpen(false);
    }
  }

  const displayLabel =
    current !== "custom"
      ? QUICK.find((q) => q.key === current)?.label
      : `${format(new Date(dateRange.fromDate), "dd/MM/yyyy", { locale: vi })} — ${format(new Date(dateRange.toDate), "dd/MM/yyyy", { locale: vi })}`;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {QUICK.map(({ key, label }) => {
        if (key === "custom") {
          return (
            <Popover key={key} open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={current === "custom" ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "rounded-xl text-xs font-semibold gap-1.5",
                    current === "custom" && "shadow-md shadow-primary/20",
                  )}
                >
                  <CalendarIcon className="w-3.5 h-3.5" />
                  {current === "custom" ? displayLabel : label}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-auto p-0">
                <Calendar
                  mode="range"
                  numberOfMonths={2}
                  selected={pending}
                  onSelect={setPending}
                  disabled={{ after: new Date() }}
                  initialFocus
                />
                <div className="flex justify-end gap-2 p-3 border-t">
                  <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                    Huỷ
                  </Button>
                  <Button
                    size="sm"
                    disabled={!pending?.from || !pending?.to}
                    onClick={handleConfirm}
                  >
                    Áp dụng
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          );
        }
        return (
          <Button
            key={key}
            variant={current === key ? "default" : "outline"}
            size="sm"
            className={cn(
              "rounded-xl text-xs font-semibold",
              current === key && "shadow-md shadow-primary/20",
            )}
            onClick={() => handleQuick(key)}
          >
            {label}
          </Button>
        );
      })}
    </div>
  );
}
