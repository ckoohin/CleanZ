"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Calendar as CalendarIcon,
  CalendarRange,
  CheckCircle2,
  Eye,
  FileText,
  Loader2,
  Mail,
  Search,
  Send,
  X,
} from "lucide-react";
import {
  AdminButton,
  AdminDialog,
  AdminSheet,
  FilterTabs,
  FormField,
  PageHeader,
  StatCard,
  StatusBadge,
  adminInputClass,
  type BadgeTone,
} from "@/components/admin";
import {
  BaseTableList,
  type Column,
  type RowAction,
} from "@/components/ui/base/base_table_list";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatVnd } from "@/lib/format";
import { fmtDate } from "@/features/admin/lib/date-ranges";
import { useAdminTasker } from "@/features/admin/modules/tasker/hooks/admin-tasker.hooks";
import type { AdminTasker } from "@/features/admin/modules/tasker/types/admin-tasker.types";
import {
  useEarningsReportRun,
  useEarningsReportRuns,
  usePreviewEarningsReport,
  useSendEarningsReport,
} from "./hooks";
import type {
  EarningsReportDelivery,
  EarningsReportDeliveryStatus,
  EarningsReportPeriod,
  EarningsReportPeriodType,
  EarningsReportRun,
  EarningsReportRunStatus,
} from "./service";

const PERIOD_TABS: { key: EarningsReportPeriodType | "ALL"; label: string }[] = [
  { key: "ALL", label: "Tất cả" },
  { key: "WEEK", label: "Tuần" },
  { key: "MONTH", label: "Tháng" },
  { key: "YEAR", label: "Năm" },
];

const DELIVERY_TABS: {
  key: EarningsReportDeliveryStatus | "ALL";
  label: string;
}[] = [
  { key: "ALL", label: "Tất cả" },
  { key: "SENT", label: "Đã gửi" },
  { key: "PENDING", label: "Đang chờ" },
  { key: "FAILED", label: "Lỗi" },
];

const PERIOD_LABEL: Record<EarningsReportPeriodType, string> = {
  WEEK: "Tuần",
  MONTH: "Tháng",
  YEAR: "Năm",
};

const RUN_STATUS: Record<
  EarningsReportRunStatus,
  { label: string; tone: BadgeTone }
> = {
  PENDING: { label: "Chờ xử lý", tone: "warning" },
  RUNNING: { label: "Đang gửi", tone: "info" },
  COMPLETED: { label: "Hoàn tất", tone: "success" },
  FAILED: { label: "Có lỗi", tone: "danger" },
};

const DELIVERY_STATUS: Record<
  EarningsReportDeliveryStatus,
  { label: string; tone: BadgeTone }
> = {
  PENDING: { label: "Đang chờ", tone: "warning" },
  SENT: { label: "Đã gửi", tone: "success" },
  FAILED: { label: "Lỗi", tone: "danger" },
};

function fmtDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function EarningsReportManagement() {
  const [filter, setFilter] = useState<{
    periodType: EarningsReportPeriodType | "ALL";
    page: number;
    limit: number;
  }>({ periodType: "ALL", page: 1, limit: 20 });

  const [sendOpen, setSendOpen] = useState(false);
  const [detailRunId, setDetailRunId] = useState<string | null>(null);

  const { data, isLoading } = useEarningsReportRuns({
    page: filter.page,
    limit: filter.limit,
    ...(filter.periodType === "ALL" ? {} : { periodType: filter.periodType }),
  });

  // Giữ tham chiếu ổn định để useMemo bên dưới không tính lại mỗi lần render.
  const runs = useMemo(() => data?.items ?? [], [data?.items]);
  const total = data?.total ?? 0;

  const stats = useMemo(
    () => ({
      running: runs.filter(
        (r) => r.status === "PENDING" || r.status === "RUNNING",
      ).length,
      sent: runs.reduce((sum, r) => sum + r.sentCount, 0),
      failed: runs.reduce((sum, r) => sum + r.failedCount, 0),
    }),
    [runs],
  );

  const columns: Column<EarningsReportRun>[] = [
    {
      key: "periodStartKey",
      title: "Kỳ",
      render: (row) => (
        <div>
          <span className="font-semibold text-[var(--c-ink)]">
            {PERIOD_LABEL[row.periodType]}
          </span>{" "}
          <span className="tabular-nums text-[var(--c-ink-soft)]">
            {row.periodStartKey}
          </span>
        </div>
      ),
    },
    {
      key: "triggerSource",
      title: "Nguồn",
      render: (row) => (
        <StatusBadge
          tone={row.triggerSource === "SCHEDULER" ? "neutral" : "purple"}
          label={row.triggerSource === "SCHEDULER" ? "Tự động" : "Admin"}
        />
      ),
    },
    {
      key: "status",
      title: "Trạng thái",
      render: (row) => (
        <StatusBadge
          tone={RUN_STATUS[row.status].tone}
          label={RUN_STATUS[row.status].label}
          dot
        />
      ),
    },
    {
      key: "totalTaskers",
      title: "Tasker",
      className: "tabular-nums",
      render: (row) => row.totalTaskers,
    },
    {
      key: "sentCount",
      title: "Đã gửi",
      className: "tabular-nums",
      render: (row) => (
        <span className="text-[#0E9F6E]">{row.sentCount}</span>
      ),
    },
    {
      key: "failedCount",
      title: "Lỗi",
      className: "tabular-nums",
      render: (row) => (
        <span
          className={cn(row.failedCount > 0 && "font-semibold text-[#E11D48]")}
        >
          {row.failedCount}
        </span>
      ),
    },
    {
      key: "createdAt",
      title: "Tạo lúc",
      hideOnMobile: true,
      render: (row) => (
        <span className="text-[var(--c-ink-soft)]">
          {fmtDateTime(row.createdAt)}
        </span>
      ),
    },
  ];

  const rowActions: RowAction<EarningsReportRun>[] = [
    {
      type: "view",
      label: "Xem chi tiết",
      icon: Eye,
      onClick: (row) => setDetailRunId(row.id),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Bảng kê thu nhập"
        description="Gửi bảng kê thu nhập định kỳ cho Tasker qua email kèm file PDF."
        actions={
          <AdminButton
            variant="primary"
            icon={<Send className="size-4" />}
            onClick={() => setSendOpen(true)}
          >
            Gửi bảng kê
          </AdminButton>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={CalendarRange}
          label="Lượt gửi"
          value={total}
          tint="#2563EB"
        />
        <StatCard
          icon={Loader2}
          label="Đang chạy"
          value={stats.running}
          tint="#D97706"
        />
        <StatCard
          icon={CheckCircle2}
          label="Email đã gửi"
          value={stats.sent}
          tint="#0E9F6E"
        />
        <StatCard
          icon={AlertCircle}
          label="Email lỗi"
          value={stats.failed}
          tint="#E11D48"
        />
      </div>

      <BaseTableList
        columns={columns}
        data={runs}
        rowKey="id"
        totalItems={total}
        page={filter.page}
        limit={filter.limit}
        onPageChange={(page) => setFilter((prev) => ({ ...prev, page }))}
        onLimitChange={(limit) =>
          setFilter((prev) => ({ ...prev, limit, page: 1 }))
        }
        isLoading={isLoading}
        emptyIcon={FileText}
        emptyTitle="Chưa có lượt gửi nào"
        emptyDescription="Bảng kê sẽ tự gửi khi sang kỳ mới, hoặc bấm “Gửi bảng kê” để gửi ngay."
        rowActions={rowActions}
        filters={
          <FilterTabs
            tabs={PERIOD_TABS}
            value={filter.periodType}
            onChange={(periodType) =>
              setFilter((prev) => ({ ...prev, periodType, page: 1 }))
            }
          />
        }
      />

      <SendReportSheet open={sendOpen} onOpenChange={setSendOpen} />
      <RunDetailSheet runId={detailRunId} onClose={() => setDetailRunId(null)} />
    </div>
  );
}

/** Debounce ô tìm kiếm để không gọi API mỗi lần gõ. */
function useDebounced<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

/**
 * Chọn Tasker bằng cách tìm theo **số điện thoại, email hoặc tên** — backend
 * `GET /tasker/admin?keyword=` khớp cả ba trường, nên admin không cần biết UUID.
 */
function TaskerPicker({
  selected,
  onChange,
}: {
  selected: AdminTasker[];
  onChange: (next: AdminTasker[]) => void;
}) {
  const [keyword, setKeyword] = useState("");
  const debouncedKeyword = useDebounced(keyword);

  const { data, isFetching } = useAdminTasker({
    keyword: debouncedKeyword.trim() || undefined,
    page: 1,
    limit: 8,
  });

  const selectedIds = new Set(selected.map((t) => t.id));
  const results = (data?.data ?? []).filter((t) => !selectedIds.has(t.id));
  const searching = debouncedKeyword.trim().length > 0;

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--c-muted)]" />
        <input
          className={cn(adminInputClass, "pl-9")}
          placeholder="Nhập số điện thoại, email hoặc tên Tasker…"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        {isFetching && (
          <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-[var(--c-muted)]" />
        )}
      </div>

      {searching && (
        <div className="cz-scroll max-h-52 overflow-y-auto rounded-xl border border-[var(--c-line)]">
          {results.length === 0 ? (
            <p className="px-3 py-4 text-center text-[12.5px] text-[var(--c-muted)]">
              {isFetching ? "Đang tìm…" : "Không tìm thấy Tasker phù hợp."}
            </p>
          ) : (
            results.map((tasker) => (
              <button
                key={tasker.id}
                type="button"
                onClick={() => {
                  onChange([...selected, tasker]);
                  setKeyword("");
                }}
                className="flex w-full items-center justify-between gap-3 border-b border-[var(--c-line)] px-3 py-2 text-left last:border-b-0 hover:bg-[var(--c-card-2)]"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-[var(--c-ink)]">
                    {tasker.fullName ?? "(chưa có tên)"}
                  </span>
                  <span className="block truncate text-[12px] text-[var(--c-muted)]">
                    {tasker.phone ?? "Chưa có số điện thoại"}
                  </span>
                </span>
                <span className="shrink-0 text-[12px] font-semibold text-[var(--c-primary-strong)]">
                  Chọn
                </span>
              </button>
            ))
          )}
        </div>
      )}

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((tasker) => (
            <span
              key={tasker.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--c-primary-soft)] px-2.5 py-1 text-[12px] font-semibold text-[var(--c-primary-strong)]"
            >
              {tasker.fullName ?? tasker.id.slice(0, 8)}
              {tasker.phone ? ` · ${tasker.phone}` : ""}
              <button
                type="button"
                aria-label={`Bỏ chọn ${tasker.fullName ?? "Tasker"}`}
                onClick={() =>
                  onChange(selected.filter((t) => t.id !== tasker.id))
                }
                className="rounded-full p-0.5 hover:bg-[var(--c-primary)]/20"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Chọn một ngày theo mẫu Popover + Calendar đang dùng ở các màn admin khác. */
function SingleDatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const parsed = value ? new Date(`${value}T00:00:00`) : undefined;

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-10 items-center gap-2 rounded-xl border border-[var(--c-line-strong)] bg-[var(--c-card-2)] px-3 text-[13px] font-semibold text-[var(--c-ink)] transition-colors hover:border-[var(--c-primary-strong)]/60"
          >
            <CalendarIcon className="size-4 text-[var(--c-primary-strong)]" />
            <span>
              {parsed
                ? parsed.toLocaleDateString("vi-VN")
                : "Kỳ vừa kết thúc"}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="cz-admin w-auto rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
        >
          <Calendar
            mode="single"
            selected={parsed}
            onSelect={(date) => {
              onChange(date ? fmtDate(date) : "");
              setOpen(false);
            }}
            disabled={(date) => date > new Date()}
            className="rounded-2xl bg-white dark:bg-zinc-900"
          />
        </PopoverContent>
      </Popover>

      {value && (
        <AdminButton variant="ghost" size="sm" onClick={() => onChange("")}>
          Xoá
        </AdminButton>
      )}
    </div>
  );
}

function SendReportSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [period, setPeriod] = useState<EarningsReportPeriod>("month");
  const [anchor, setAnchor] = useState("");
  const [scopeAll, setScopeAll] = useState(true);
  const [selectedTaskers, setSelectedTaskers] = useState<AdminTasker[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const sendMutation = useSendEarningsReport();
  const previewMutation = usePreviewEarningsReport();

  const busy = sendMutation.isPending || previewMutation.isPending;
  const canSend = scopeAll || selectedTaskers.length > 0;

  const doSend = () => {
    sendMutation.mutate(
      {
        period,
        ...(anchor ? { anchor } : {}),
        ...(scopeAll ? {} : { taskerIds: selectedTaskers.map((t) => t.id) }),
      },
      {
        onSuccess: () => {
          setConfirmOpen(false);
          onOpenChange(false);
          setSelectedTaskers([]);
        },
      },
    );
  };

  return (
    <>
      <AdminSheet
        open={open}
        onOpenChange={onOpenChange}
        title="Gửi bảng kê thu nhập"
        description="Email kèm file PDF sẽ được gửi tới Tasker có đơn hoàn thành trong kỳ."
        widthClassName="sm:max-w-xl"
        footer={
          <div className="flex justify-end gap-2">
            <AdminButton
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Huỷ
            </AdminButton>
            <AdminButton
              variant="primary"
              icon={<Send className="size-4" />}
              disabled={!canSend || busy}
              onClick={() => (scopeAll ? setConfirmOpen(true) : doSend())}
            >
              {sendMutation.isPending ? "Đang gửi…" : "Gửi"}
            </AdminButton>
          </div>
        }
      >
        <div className="space-y-4">
          <FormField label="Kỳ báo cáo" required>
            <FilterTabs
              tabs={[
                { key: "week", label: "Tuần" },
                { key: "month", label: "Tháng" },
                { key: "year", label: "Năm" },
              ]}
              value={period}
              onChange={(key) => setPeriod(key as EarningsReportPeriod)}
            />
          </FormField>

          <FormField
            label="Ngày trong kỳ"
            hint="Bỏ trống = kỳ vừa kết thúc. Chọn ngày bất kỳ nằm trong kỳ muốn gửi."
          >
            <SingleDatePicker value={anchor} onChange={setAnchor} />
          </FormField>

          <FormField label="Phạm vi gửi" required>
            <div className="space-y-2 text-[13px]">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  className="accent-[var(--c-primary)]"
                  checked={scopeAll}
                  onChange={() => setScopeAll(true)}
                />
                Tất cả Tasker có đơn hoàn thành trong kỳ
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  className="accent-[var(--c-primary)]"
                  checked={!scopeAll}
                  onChange={() => setScopeAll(false)}
                />
                Chọn Tasker cụ thể
              </label>
            </div>
          </FormField>

          {!scopeAll && (
            <FormField
              label="Tasker nhận bảng kê"
              hint="Tìm theo số điện thoại, email hoặc tên."
            >
              <TaskerPicker
                selected={selectedTaskers}
                onChange={setSelectedTaskers}
              />
            </FormField>
          )}

          {/* Xem trước chỉ có nghĩa với đúng một Tasker. */}
          <div className="space-y-1">
            <AdminButton
              variant="secondary"
              icon={<FileText className="size-4" />}
              disabled={selectedTaskers.length !== 1 || busy}
              onClick={() =>
                previewMutation.mutate({
                  taskerId: selectedTaskers[0].id,
                  period,
                  ...(anchor ? { anchor } : {}),
                })
              }
            >
              {previewMutation.isPending ? "Đang dựng PDF…" : "Xem trước PDF"}
            </AdminButton>
            {selectedTaskers.length !== 1 && (
              <p className="text-[12px] text-[var(--c-muted)]">
                Chọn đúng một Tasker để xem trước bản kê.
              </p>
            )}
          </div>
        </div>
      </AdminSheet>

      <AdminDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Gửi cho toàn bộ Tasker trong kỳ?"
        description="Email sẽ được gửi thật và không thu hồi được. Kiểm tra lại kỳ trước khi xác nhận."
        footer={
          <div className="flex justify-end gap-2">
            <AdminButton
              variant="secondary"
              onClick={() => setConfirmOpen(false)}
              disabled={sendMutation.isPending}
            >
              Huỷ
            </AdminButton>
            <AdminButton
              variant="primary"
              onClick={doSend}
              disabled={sendMutation.isPending}
            >
              {sendMutation.isPending ? "Đang gửi…" : "Xác nhận gửi"}
            </AdminButton>
          </div>
        }
      >
        <p className="text-[13px] text-[var(--c-ink-soft)]">
          Kỳ:{" "}
          <strong>
            {period === "week" ? "Tuần" : period === "month" ? "Tháng" : "Năm"}
          </strong>
          {anchor ? ` chứa ngày ${anchor}` : " vừa kết thúc"}.
        </p>
      </AdminDialog>
    </>
  );
}


function RunDetailSheet({
  runId,
  onClose,
}: {
  runId: string | null;
  onClose: () => void;
}) {
  const [statusTab, setStatusTab] = useState<
    EarningsReportDeliveryStatus | "ALL"
  >("ALL");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  const { data, isLoading } = useEarningsReportRun(runId, {
    page,
    limit,
    ...(statusTab === "ALL" ? {} : { status: statusTab }),
  });

  const run = data?.run;
  const deliveries = data?.deliveries;

  const columns: Column<EarningsReportDelivery>[] = [
    { key: "email", title: "Email" },
    {
      key: "status",
      title: "Trạng thái",
      render: (row) => (
        <StatusBadge
          tone={DELIVERY_STATUS[row.status].tone}
          label={DELIVERY_STATUS[row.status].label}
          dot
        />
      ),
    },
    {
      key: "sentAt",
      title: "Gửi lúc",
      hideOnMobile: true,
      render: (row) => (
        <span className="text-[var(--c-ink-soft)]">
          {fmtDateTime(row.sentAt)}
        </span>
      ),
    },
    {
      key: "completedBookings",
      title: "Đơn",
      className: "tabular-nums",
      render: (row) => row.completedBookings,
    },
    {
      key: "netIncome",
      title: "Thực nhận",
      className: "tabular-nums font-semibold",
      render: (row) => formatVnd(row.netIncome),
    },
    {
      key: "lastError",
      title: "Lỗi",
      hideOnMobile: true,
      render: (row) => (
        <span
          className="block max-w-[220px] truncate text-[12px] text-[#E11D48]"
          title={row.lastError ?? undefined}
        >
          {row.lastError ?? "—"}
        </span>
      ),
    },
  ];

  return (
    <AdminSheet
      open={Boolean(runId)}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
          setStatusTab("ALL");
          setPage(1);
        }
      }}
      title="Chi tiết lượt gửi"
      description={
        run
          ? `${PERIOD_LABEL[run.periodType]} ${run.periodStartKey} · ${
              run.triggerSource === "SCHEDULER" ? "Tự động" : "Admin gửi tay"
            }`
          : undefined
      }
      widthClassName="sm:max-w-4xl"
    >
      {isLoading || !run ? (
        <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-[var(--c-muted)]">
          <Loader2 className="size-4 animate-spin" />
          Đang tải…
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                label: "Trạng thái",
                node: (
                  <StatusBadge
                    tone={RUN_STATUS[run.status].tone}
                    label={RUN_STATUS[run.status].label}
                    dot
                  />
                ),
              },
              { label: "Tổng Tasker", node: run.totalTaskers },
              { label: "Đã gửi", node: run.sentCount },
              { label: "Lỗi", node: run.failedCount },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-[var(--c-line)] bg-[var(--c-card-2)] px-3 py-2.5"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--c-muted)]">
                  {item.label}
                </p>
                <div className="mt-1 text-[15px] font-bold tabular-nums text-[var(--c-ink)]">
                  {item.node}
                </div>
              </div>
            ))}
          </div>

          <BaseTableList
            columns={columns}
            data={deliveries?.items ?? []}
            rowKey="id"
            totalItems={deliveries?.total ?? 0}
            page={page}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={(next) => {
              setLimit(next);
              setPage(1);
            }}
            emptyIcon={Mail}
            emptyTitle="Không có bản ghi nào"
            emptyDescription="Thử đổi bộ lọc trạng thái."
            filters={
              <FilterTabs
                tabs={DELIVERY_TABS}
                value={statusTab}
                onChange={(key) => {
                  setStatusTab(key);
                  setPage(1);
                }}
              />
            }
          />
        </div>
      )}
    </AdminSheet>
  );
}
