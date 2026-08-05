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
import type { DateRange } from "../types/dashboard.types";
import {
  RANGE_OPTIONS,
  fmtDate,
  matchRangeKey,
  rangeLabel,
  rangeOf,
} from "../lib/date-ranges";

export interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
  /**
   * Nhãn thay thế khi kỳ lọc CHƯA được áp dụng.
   *
   * Lịch luôn cần một cặp ngày để hiển thị, nên nơi gọi thường phải mượn tạm
   * một kỳ mặc định. Nếu cứ in `rangeLabel(value)` ra thì chip đọc là "30 ngày
   * qua" trong khi bảng đang hiện toàn bộ dữ liệu — người dùng tin vào chip,
   * và bản Excel xuất theo bộ lọc đó cũng không đúng cái họ tưởng.
   */
  inactiveLabel?: string;
  /**
   * Có truyền thì danh sách kỳ dựng sẵn hiện thêm mục "Toàn bộ thời gian".
   *
   * Việc bỏ lọc là MỘT LỰA CHỌN KỲ, không phải một hành động riêng — tách nó ra
   * thành nút bên cạnh chỉ làm toolbar dài thêm và bắt người dùng tìm ở hai chỗ
   * cho cùng một việc.
   */
  onClear?: () => void;
}

/**
 * Chọn kỳ lọc: danh sách kỳ dựng sẵn bên trái, lịch 2 tháng bên phải.
 *
 * Bản CÓ ĐIỀU KHIỂN (value/onChange) để dùng được ngoài dashboard — hàng đợi
 * ticket giữ kỳ lọc trong URL, không phải trong store dashboard. `DateRangeFilter`
 * là lớp mỏng nối component này với store.
 */
export function DateRangePicker({
  value,
  onChange,
  className,
  inactiveLabel,
  onClear,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<DayPickerRange | undefined>();
  // Chưa lọc thì KHÔNG tô sáng preset nào: `value` lúc đó chỉ là kỳ mượn tạm để
  // lịch có gì mà vẽ, tô sáng "30 ngày qua" sẽ nói dối về trạng thái thật.
  const activeKey = inactiveLabel ? null : matchRangeKey(value);

  const pick = (r: DateRange) => {
    onChange(r);
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
            className,
          )}
          title={
            inactiveLabel ? inactiveLabel : `${value.fromDate} → ${value.toDate}`
          }
        >
          <CalendarDays className="size-4 shrink-0 text-[var(--c-muted)]" />
          <span>{inactiveLabel ?? rangeLabel(value)}</span>
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
            {onClear && (
              <button
                type="button"
                onClick={() => {
                  onClear();
                  setOpen(false);
                }}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-left text-[13px] font-medium transition-colors",
                  inactiveLabel
                    ? "bg-[var(--c-primary)]/10 text-[var(--c-primary-strong)]"
                    : "text-[var(--c-ink)] hover:bg-[var(--c-card-2)]",
                )}
              >
                Toàn bộ thời gian
              </button>
            )}
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
              defaultMonth={new Date(value.fromDate)}
              selected={
                draft ?? {
                  from: new Date(value.fromDate),
                  to: new Date(value.toDate),
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
