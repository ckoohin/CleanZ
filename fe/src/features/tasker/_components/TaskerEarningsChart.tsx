"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  RefreshCw,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useTaskerEarningsBreakdown } from "@/features/tasker/hooks/useTaskerWallet";
import { useTaskerCompletedBookings } from "@/features/booking/hooks/useTaskerBooking";
import type {
  TaskerEarningsPeriod,
  TaskerEarningsPoint,
} from "@/features/tasker/types/tasker-wallet.types";

const PERIOD_META: Record<
  TaskerEarningsPeriod,
  { title: string; description: string; tickInterval: number }
> = {
  today: {
    title: "Thu nhập theo ngày",
    description:
      "Chọn ngày, tháng và năm để xem thu nhập cùng các đơn đã hoàn tất.",
    tickInterval: 4,
  },
  week: {
    title: "Thu nhập theo ngày trong tuần",
    description: "Mỗi cột tương ứng với một ngày, từ Thứ Hai đến Chủ nhật.",
    tickInterval: 0,
  },
  month: {
    title: "Thu nhập theo ngày trong tháng",
    description: "Mỗi cột tương ứng với một ngày trong tháng đã chọn.",
    tickInterval: 4,
  },
  year: {
    title: "Thu nhập theo tháng trong năm",
    description: "Mỗi cột tương ứng với một tháng trong năm đã chọn.",
    tickInterval: 0,
  },
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

const formatCompactCurrency = (value: number) => {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1).replace(".0", "")}tỷ`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(".0", "")}tr`;
  }
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(value);
};

const parseDateKey = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const formatDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const formatDateLabel = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parseDateKey(value));

function EarningsTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: TaskerEarningsPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;

  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 shadow-lg">
      <p className="text-xs font-bold text-foreground">{point.dateLabel}</p>
      <p className="mt-1 text-sm font-black text-primary">
        {formatCurrency(point.amount)}
      </p>
    </div>
  );
}

export function TaskerEarningsChart({
  period,
  onClose,
}: {
  period: TaskerEarningsPeriod;
  onClose: () => void;
}) {
  const meta = PERIOD_META[period];
  const [anchor, setAnchor] = useState<string>();
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch, isFetching } =
    useTaskerEarningsBreakdown(period, anchor);

  const orderRange = useMemo(() => {
    if (!data) return undefined;
    return { fromAt: data.rangeStart, toAt: data.rangeEnd };
  }, [data]);

  const ordersQuery = useTaskerCompletedBookings(
    page,
    5,
    Boolean(orderRange),
    orderRange,
  );
  const totalPages = ordersQuery.data?.totalPages ?? 1;
  const selectedOptionIndex = data?.options.findIndex(
    (option) => option.value === data.selectedValue,
  );

  const selectAnchor = (value: string) => {
    setAnchor(value);
    setPage(1);
  };

  const orderTitle =
    period === "today"
      ? `Đơn hoàn tất ${data?.rangeLabel.toLocaleLowerCase("vi-VN") ?? "trong ngày"}`
      : `Đơn hoàn tất trong ${data?.rangeLabel.toLocaleLowerCase("vi-VN") ?? "kỳ này"}`;

  return (
    <section className="rounded-2xl border border-primary/20 bg-card p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <BarChart3 className="size-5 text-primary" />
            {meta.title}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {meta.description}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Đóng biểu đồ"
        >
          <X className="size-4" />
        </button>
      </div>

      {isLoading ? (
        <Skeleton className="mt-5 h-64 rounded-xl" />
      ) : isError ? (
        <div className="mt-5 rounded-xl border border-dashed border-destructive/30 bg-destructive/5 p-8 text-center">
          <p className="text-sm font-semibold">
            Không thể tải biểu đồ thu nhập.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            <RefreshCw
              className={isFetching ? "size-4 animate-spin" : "size-4"}
            />
            Thử lại
          </Button>
        </div>
      ) : data ? (
        <>
          {period === "today" ? (
            <div className="mt-4">
              <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                Ngày xem thu nhập
              </span>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex h-11 w-full items-center justify-between rounded-xl border border-primary/40 bg-background px-3 text-left text-sm font-bold outline-none transition-colors hover:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 sm:max-w-64"
                  >
                    <span>{formatDateLabel(data.selectedValue)}</span>
                    <CalendarDays className="size-4 text-primary" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-[min(calc(100vw-2rem),360px)] rounded-2xl border-border/70 bg-card p-0 shadow-xl"
                >
                  <Calendar
                    mode="single"
                    selected={parseDateKey(data.selectedValue)}
                    defaultMonth={parseDateKey(data.selectedValue)}
                    fromYear={parseDateKey(data.availableFrom).getFullYear()}
                    toYear={parseDateKey(data.availableTo).getFullYear()}
                    disabled={(date) => {
                      const key = formatDateKey(date);
                      return key < data.availableFrom || key > data.availableTo;
                    }}
                    onSelect={(date) => {
                      if (!date) return;
                      selectAnchor(formatDateKey(date));
                      setDatePickerOpen(false);
                    }}
                    className="rounded-2xl"
                  />
                </PopoverContent>
              </Popover>
            </div>
          ) : data.options.length > 0 ? (
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                disabled={
                  selectedOptionIndex === undefined ||
                  selectedOptionIndex < 0 ||
                  selectedOptionIndex >= data.options.length - 1
                }
                onClick={() => {
                  if (selectedOptionIndex === undefined) return;
                  const older = data.options[selectedOptionIndex + 1];
                  if (older) selectAnchor(older.value);
                }}
                className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground disabled:opacity-30"
                aria-label="Xem kỳ trước"
              >
                <ChevronLeft className="size-4" />
              </button>
              <Select value={data.selectedValue} onValueChange={selectAnchor}>
                <SelectTrigger
                  aria-label="Chọn kỳ thu nhập"
                  className="h-10 min-w-0 flex-1 rounded-xl border-border bg-background text-sm font-extrabold focus-visible:border-primary focus-visible:ring-primary/20"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72 rounded-xl border-border bg-card">
                  {data.options.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      className="rounded-lg text-sm font-semibold"
                    >
                      {option.label}
                      {option.isCurrent ? " · Hiện tại" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                type="button"
                disabled={
                  selectedOptionIndex === undefined || selectedOptionIndex <= 0
                }
                onClick={() => {
                  if (selectedOptionIndex === undefined) return;
                  const newer = data.options[selectedOptionIndex - 1];
                  if (newer) selectAnchor(newer.value);
                }}
                className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground disabled:opacity-30"
                aria-label="Xem kỳ sau"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          ) : null}

          {period === "today" ? (
            <div className="mt-4 rounded-2xl bg-primary/5 p-5 text-center">
              <p className="text-xs font-semibold text-muted-foreground">
                Thu nhập {data.rangeLabel.toLocaleLowerCase("vi-VN")}
              </p>
              <p className="mt-2 text-3xl font-black text-primary">
                {formatCurrency(data.total)}
              </p>
            </div>
          ) : (
            <>
              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Tổng thu nhập · {data.rangeLabel}
                  </p>
                  <p className="text-xl font-black text-primary">
                    {formatCurrency(data.total)}
                  </p>
                </div>
              </div>

              <div className="mt-4 h-64 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.points}
                    margin={{ top: 8, right: 12, bottom: 0, left: -10 }}
                    barCategoryGap="24%"
                  >
                    <CartesianGrid
                      stroke="var(--border)"
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      interval={meta.tickInterval}
                      tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                      dy={8}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      width={56}
                      tickFormatter={formatCompactCurrency}
                      tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    />
                    <Tooltip
                      content={<EarningsTooltip />}
                      cursor={{ fill: "var(--muted)" }}
                    />
                    <Bar
                      dataKey="amount"
                      name="Thu nhập"
                      radius={[5, 5, 0, 0]}
                      maxBarSize={36}
                    >
                      {data.points.map((point) => (
                        <Cell key={point.key} fill="#f59e0b" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}

          <div className="mt-5 border-t border-border pt-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="flex min-w-0 items-center gap-2 text-sm font-extrabold">
                <ListChecks className="size-4 shrink-0 text-primary" />
                <span className="truncate font-medium text-[12px]">
                  {orderTitle}
                </span>
              </h3>
              <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                {ordersQuery.data?.total ?? 0} đơn
              </span>
            </div>

            <div className="mt-3 space-y-2">
              {ordersQuery.isLoading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-20 rounded-xl" />
                ))
              ) : ordersQuery.data?.items.length ? (
                ordersQuery.data.items.map((booking) => (
                  <Link
                    key={booking.id}
                    href={`/tasker/jobs/${booking.id}`}
                    className="flex items-center gap-3 rounded-xl border border-border/60 p-3 transition-colors hover:border-primary/40 hover:bg-primary/5"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                      <CheckCircle2 className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">
                        {booking.service.name}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {booking.bookingCode}
                        {booking.completedAt
                          ? ` · ${new Date(booking.completedAt).toLocaleString("vi-VN")}`
                          : ""}
                      </span>
                      <span className="mt-1 inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-foreground">
                        Thanh toán:{" "}
                        {booking.paymentMethod === "CASH"
                          ? "Tiền mặt"
                          : "Chuyển khoản"}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-[10px] font-medium text-muted-foreground">
                        Giá trị đơn
                      </span>
                      <span className="block text-sm font-black text-primary">
                        {formatCurrency(booking.totalPrice)}
                      </span>
                    </span>
                  </Link>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-border p-7 text-center text-sm text-muted-foreground">
                  Chưa có đơn hoàn tất trong khoảng thời gian này.
                </div>
              )}
            </div>

            {totalPages > 1 && (
              <div className="mt-3 flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  <ChevronLeft className="size-4" /> Trước
                </Button>
                <span className="text-xs text-muted-foreground">
                  Trang {page}/{totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                >
                  Sau <ChevronRight className="size-4" />
                </Button>
              </div>
            )}
          </div>
        </>
      ) : null}
    </section>
  );
}
