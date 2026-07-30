"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { RefreshCw, UserX, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

import {
  BaseTableList,
  Column,
  RowAction,
} from "@/components/ui/base/base_table_list";
import {
  PageHeader,
  AdminButton,
  StatusBadge,
  BadgeTone,
} from "@/components/admin";
import { toast } from "@/lib/toast";

import { useAdminBookings } from "@/features/admin/modules/booking/hooks/useAdminBooking";
import { adminBookingService } from "@/features/admin/modules/booking/services/admin-booking.service";
import { AdminBookingDetailModal } from "@/features/admin/modules/booking/_components/AdminBookingDetailModal";
import { AdminCreateBookingDrawer } from "@/features/admin/modules/booking/_components/AdminCreateBookingDrawer";
import {
  AdminBookingDetail,
  AdminBookingItem,
} from "@/features/admin/modules/booking/types/booking.types";
import { adminCustomerApi } from "@/features/admin/modules/customer/services/admin-customer.service";
import { adminTaskerApi } from "@/features/admin/modules/tasker/services/admin-tasker.service";

const ALL = "__all__";

const STATUS_OPTIONS = [
  { value: ALL, label: "Tất cả trạng thái" },
  { value: "POSTED", label: "Đang tìm kiếm nhân viên" },
  { value: "PENDING_CUSTOMER_CONFIRMATION", label: "Chờ khách xác nhận" },
  { value: "CONFIRMED", label: "Đã nhận đơn" },
  { value: "TASKER_ON_THE_WAY", label: "Nhân viên đang đến" },
  { value: "CHECKED_IN", label: "Đã đến nơi" },
  { value: "IN_PROGRESS", label: "Đang thực hiện" },
  { value: "COMPLETED", label: "Hoàn thành" },
  { value: "CANCELLED", label: "Đã hủy" },
  { value: "EXPIRED", label: "Đã hết hạn" },
];

const PAYMENT_OPTIONS = [
  { value: ALL, label: "Tất cả thanh toán" },
  { value: "PENDING", label: "Chờ thanh toán" },
  { value: "PAID", label: "Đã thanh toán" },
  { value: "FAILED", label: "Thất bại" },
  { value: "REFUNDED", label: "Hoàn tiền" },
];

const NO_SHOW_REVIEW_OPTIONS = [
  { value: ALL, label: "Tất cả no-show" },
  { value: "PENDING_REVIEW", label: "No-show chờ duyệt" },
  { value: "CONFIRMED", label: "No-show đã xác nhận" },
  { value: "EXCUSED", label: "Tasker được miễn" },
];

const STATUS_TONE: Record<string, BadgeTone> = {
  POSTED: "warning",
  PENDING_CUSTOMER_CONFIRMATION: "warning",
  CONFIRMED: "info",
  TASKER_ON_THE_WAY: "info",
  CHECKED_IN: "info",
  IN_PROGRESS: "purple",
  COMPLETED: "success",
  CANCELLED: "danger",
  EXPIRED: "neutral",
};

const STATUS_LABEL: Record<string, string> = {
  POSTED: "Đang tìm kiếm nhân viên",
  PENDING_CUSTOMER_CONFIRMATION: "Chờ khách xác nhận",
  CONFIRMED: "Đã nhận đơn",
  TASKER_ON_THE_WAY: "Nhân viên đang đến",
  CHECKED_IN: "Đã đến nơi",
  IN_PROGRESS: "Đang thực hiện",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
  EXPIRED: "Đã hết hạn",
};

// ─── Combobox nhỏ dùng cho Customer / Tasker ────────────────────────────────
interface LookupOption {
  id: string;
  label: string;
  sub?: string;
}

function LookupCombobox({
  placeholder,
  selected,
  onSelect,
  onSearch,
}: {
  placeholder: string;
  selected: LookupOption | null;
  onSelect: (v: LookupOption | null) => void;
  onSearch: (q: string) => Promise<LookupOption[]>;
}) {
  const [query, setQuery] = React.useState("");
  const [options, setOptions] = React.useState<LookupOption[]>([]);
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  // debounce
  React.useEffect(() => {
    if (!query.trim()) {
      setOptions([]);
      return;
    }
    const t = setTimeout(async () => {
      const res = await onSearch(query).catch(() => []);
      setOptions(res);
      setOpen(res.length > 0);
    }, 350);
    return () => clearTimeout(t);
  }, [query, onSearch]);

  // đóng khi click ngoài
  React.useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  if (selected) {
    return (
      <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-[var(--c-line-strong)] bg-[var(--c-card)] text-sm text-[var(--c-ink)] min-w-[180px]">
        <span className="flex-1 truncate">{selected.label}</span>
        <button
          onClick={() => {
            onSelect(null);
            setQuery("");
          }}
          className="text-[var(--c-muted)] hover:text-[var(--c-ink)]"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="h-9 min-w-[180px] bg-[var(--c-card)] border-[var(--c-line-strong)] text-[var(--c-ink)] placeholder:text-[var(--c-muted)] text-sm"
        onFocus={() => {
          if (options.length) setOpen(true);
        }}
      />
      {open && (
        <div className="absolute z-50 top-full mt-1 w-full min-w-[220px] rounded-md border border-[var(--c-line)] bg-[var(--c-card)] shadow-lg max-h-48 overflow-y-auto">
          {options.map((o) => (
            <button
              key={o.id}
              className="w-full text-left px-3 py-2 hover:bg-[var(--c-card-2)] text-sm text-[var(--c-ink)]"
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(o);
                setQuery("");
                setOpen(false);
              }}
            >
              <div>{o.label}</div>
              {o.sub && (
                <div className="text-xs text-[var(--c-muted)]">{o.sub}</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export function AdminBookingPage() {
  // Cho phép mở trang này kèm sẵn bộ lọc qua URL, ví dụ từ dashboard:
  //   /admin/bookings?status=POSTED       (ô trạng thái trên widget)
  //   /admin/bookings?keyword=BK2607200030 (một dòng trong "Đơn hàng gần đây")
  // Chỉ nhận status nằm trong STATUS_OPTIONS — tránh URL bịa đẩy filter rác vào API.
  const searchParams = useSearchParams();
  const initialStatus = React.useMemo(() => {
    const s = searchParams.get("status");
    return s && STATUS_OPTIONS.some((o) => o.value === s) ? s : ALL;
  }, [searchParams]);
  const initialKeyword = React.useMemo(
    () => searchParams.get("keyword") ?? "",
    [searchParams],
  );
  const initialOverdueCompletion = React.useMemo(
    () => searchParams.get("overdueCompletion") === "true",
    [searchParams],
  );

  const [keyword, setKeyword] = React.useState(initialKeyword);
  const [statusFilter, setStatusFilter] = React.useState(initialStatus);
  const [paymentFilter, setPaymentFilter] = React.useState(ALL);
  const [noShowReviewFilter, setNoShowReviewFilter] = React.useState(ALL);
  const [overdueCompletion, setOverdueCompletion] = React.useState(
    initialOverdueCompletion,
  );
  const [fromDate, setFromDate] = React.useState("");
  const [toDate, setToDate] = React.useState("");
  const [selectedCustomer, setSelectedCustomer] =
    React.useState<LookupOption | null>(null);
  const [selectedTasker, setSelectedTasker] =
    React.useState<LookupOption | null>(null);
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(10);

  const { data, total, isLoading, mutate } = useAdminBookings({
    page,
    limit,
    keyword,
    status: statusFilter === ALL ? undefined : statusFilter,
    paymentStatus: paymentFilter === ALL ? undefined : paymentFilter,
    customerId: selectedCustomer?.id,
    taskerId: selectedTasker?.id,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    noShowReviewStatus:
      noShowReviewFilter === ALL ? undefined : noShowReviewFilter,
    overdueCompletion: overdueCompletion || undefined,
  });

  const [selectedBooking, setSelectedBooking] =
    React.useState<AdminBookingDetail | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = React.useState(false);

  const handleViewDetail = async (id: string) => {
    try {
      const detail = await adminBookingService.getAdminBookingDetail(id);
      setSelectedBooking(detail);
      setIsModalOpen(true);
    } catch {
      toast.error("Không thể tải chi tiết đơn hàng");
    }
  };

  const handleExpireOverdue = async () => {
    try {
      const res = await adminBookingService.triggerExpireOverdue();
      toast.success(`Đã cập nhật ${res.expiredCount} đơn hàng quá hạn`);
      mutate();
    } catch {
      toast.error("Lỗi khi kiểm tra đơn quá hạn");
    }
  };

  // reset về trang 1 khi đổi bất kỳ filter nào
  React.useEffect(() => {
    setPage(1);
  }, [
    keyword,
    statusFilter,
    paymentFilter,
    noShowReviewFilter,
    overdueCompletion,
    fromDate,
    toDate,
    selectedCustomer,
    selectedTasker,
  ]);

  // search functions cho combobox
  const searchCustomers = React.useCallback(
    async (q: string): Promise<LookupOption[]> => {
      const res = await adminCustomerApi.getCustomers({
        keyword: q,
        limit: 10,
      });
      return res.data.map((c) => ({
        id: c.id,
        label: c.fullName,
        sub: c.phone ?? c.email,
      }));
    },
    [],
  );

  const searchTaskers = React.useCallback(
    async (q: string): Promise<LookupOption[]> => {
      const res = await adminTaskerApi.getTaskers({ keyword: q, limit: 10 });
      return res.data.map((t) => ({
        id: t.id,
        label: t.fullName ?? "—",
        sub: t.phone ?? undefined,
      }));
    },
    [],
  );

  const columns: Column<AdminBookingItem>[] = [
    {
      key: "bookingCode",
      title: "Mã Đơn",
      render: (row) => (
        <span className="font-mono text-xs uppercase tracking-wider text-[var(--c-primary-strong)] font-bold">
          {row.bookingCode}
        </span>
      ),
    },
    {
      key: "customerName",
      title: "Khách hàng",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-[var(--c-ink)]">
            {row.customer?.fullName || "N/A"}
          </span>
          <span className="text-[10px] text-[var(--c-muted)]">
            {row.customer?.phone}
          </span>
        </div>
      ),
    },
    {
      key: "service",
      title: "Dịch vụ",
      render: (row) => (
        <span className="text-sm font-medium text-[var(--c-ink)]">
          {row.service?.name ?? "—"}
        </span>
      ),
    },
    {
      key: "taskerName",
      title: "Tasker",
      render: (row) => (
        <div className="flex flex-col">
          {row.tasker ? (
            <>
              <span className="font-semibold text-emerald-600">
                {row.tasker.fullName}
              </span>
              <span className="text-[10px] text-[var(--c-muted)]">
                {row.tasker.phone}
              </span>
            </>
          ) : (
            <span className="text-xs text-[var(--c-muted)] italic">
              Chưa nhận
            </span>
          )}
        </div>
      ),
    },
    {
      key: "scheduledStart",
      title: "Lịch hẹn",
      render: (row) => {
        const raw =
          row.schedule?.scheduledStartDate ??
          row.schedule?.scheduledStart ??
          row.scheduledStart;
        if (!raw) return <span className="text-[var(--c-muted)]">—</span>;
        const dt = new Date(raw);
        const dateStr = dt.toLocaleDateString("vi-VN");
        const timeRaw = row.schedule?.scheduledStartTime;
        const timeStr = timeRaw
          ? timeRaw.length > 8
            ? new Date(timeRaw).toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : timeRaw
          : null;
        return (
          <div className="flex flex-col">
            <span className="font-medium text-[var(--c-ink)]">{dateStr}</span>
            {timeStr && (
              <span className="text-xs text-[var(--c-muted)]">{timeStr}</span>
            )}
          </div>
        );
      },
    },
    {
      key: "totalPrice",
      title: "Tổng tiền",
      render: (row) => (
        <span className="font-bold text-[var(--c-ink)]">
          {new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
          }).format(row.totalPrice)}
        </span>
      ),
    },
    {
      key: "noShowReview",
      title: "No-show",
      render: (row) => {
        if (row.noShow?.reviewStatus === "PENDING_REVIEW") {
          return (
            <StatusBadge tone="warning">
              <UserX className="mr-1 size-3" /> No-show chờ duyệt
            </StatusBadge>
          );
        }
        if (row.noShow?.reviewStatus === "CONFIRMED") {
          return <StatusBadge tone="danger">No-show vi phạm</StatusBadge>;
        }
        if (row.noShow?.reviewStatus === "EXCUSED") {
          return (
            <StatusBadge tone="success">No-show miễn trách nhiệm</StatusBadge>
          );
        }
        return (
          <span className="text-xs text-[var(--c-muted)]">Không phát sinh</span>
        );
      },
    },
    {
      key: "status",
      title: "Trạng thái",
      render: (row) => (
        <StatusBadge tone={STATUS_TONE[row.status] ?? "neutral"}>
          {STATUS_LABEL[row.status] ?? row.status}
        </StatusBadge>
      ),
    },
  ];

  const rowActions: RowAction<AdminBookingItem>[] = [
    {
      type: "view",
      label: "Xem chi tiết",
      onClick: (row) => handleViewDetail(row.id),
    },
  ];

  const hasActiveFilters =
    statusFilter !== ALL ||
    paymentFilter !== ALL ||
    noShowReviewFilter !== ALL ||
    overdueCompletion ||
    fromDate ||
    toDate ||
    selectedCustomer ||
    selectedTasker;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý Đơn hàng"
        description="Theo dõi và can thiệp vào các Booking trên hệ thống."
        actions={
          <>
            <AdminButton
              variant="secondary"
              onClick={handleExpireOverdue}
              icon={<RefreshCw className="w-4 h-4" />}
            >
              Kiểm tra đơn quá hạn
            </AdminButton>
            <AdminButton
              variant="primary"
              onClick={() => setIsCreateDrawerOpen(true)}
            >
              Tạo đơn hộ
            </AdminButton>
          </>
        }
      />

      {/* Filters */}
      <div className="space-y-2">
        {/* Row 1: Trạng thái + Thanh toán */}
        <div className="flex flex-wrap items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="cz-admin h-9 w-52 bg-[var(--c-card)] border-[var(--c-line-strong)] text-[var(--c-ink)]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="cz-admin bg-[var(--c-card)] border-[var(--c-line)] text-[var(--c-ink)]">
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="cz-admin h-9 w-44 bg-[var(--c-card)] border-[var(--c-line-strong)] text-[var(--c-ink)]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="cz-admin bg-[var(--c-card)] border-[var(--c-line)] text-[var(--c-ink)]">
              {PAYMENT_OPTIONS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={noShowReviewFilter}
            onValueChange={setNoShowReviewFilter}
          >
            <SelectTrigger className="cz-admin h-9 w-52 bg-[var(--c-card)] border-[var(--c-line-strong)] text-[var(--c-ink)]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="cz-admin bg-[var(--c-card)] border-[var(--c-line)] text-[var(--c-ink)]">
              {NO_SHOW_REVIEW_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <button
            type="button"
            aria-pressed={overdueCompletion}
            onClick={() => setOverdueCompletion((current) => !current)}
            className={
              overdueCompletion
                ? "h-9 rounded-md border border-rose-300 bg-rose-50 px-3 text-xs font-semibold text-rose-700"
                : "h-9 rounded-md border border-[var(--c-line-strong)] bg-[var(--c-card)] px-3 text-xs font-semibold text-[var(--c-muted)] hover:text-[var(--c-ink)]"
            }
          >
            Quá giờ chưa hoàn thành
          </button>

          {hasActiveFilters && (
            <button
              onClick={() => {
                setStatusFilter(ALL);
                setPaymentFilter(ALL);
                setNoShowReviewFilter(ALL);
                setOverdueCompletion(false);
                setFromDate("");
                setToDate("");
                setSelectedCustomer(null);
                setSelectedTasker(null);
              }}
              className="flex items-center gap-1 text-xs text-[var(--c-muted)] hover:text-[var(--c-ink)] px-2 py-1.5 rounded border border-[var(--c-line)] hover:border-[var(--c-line-strong)] transition-colors"
            >
              <X className="w-3 h-3" /> Xóa filter
            </button>
          )}
        </div>

        {/* Row 2: Ngày + Customer + Tasker */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-9 px-2 rounded-md border border-[var(--c-line-strong)] bg-[var(--c-card)] text-[var(--c-ink)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--c-primary)]"
            />
            <span className="text-[var(--c-muted)] text-xs">→</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              min={fromDate || undefined}
              className="h-9 px-2 rounded-md border border-[var(--c-line-strong)] bg-[var(--c-card)] text-[var(--c-ink)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--c-primary)]"
            />
          </div>

          <LookupCombobox
            placeholder="Tìm khách hàng..."
            selected={selectedCustomer}
            onSelect={setSelectedCustomer}
            onSearch={searchCustomers}
          />

          <LookupCombobox
            placeholder="Tìm tasker..."
            selected={selectedTasker}
            onSelect={setSelectedTasker}
            onSearch={searchTaskers}
          />
        </div>
      </div>

      <BaseTableList
        columns={columns}
        data={data}
        rowKey="id"
        keyword={keyword}
        onKeywordChange={setKeyword}
        placeholderSearch="Tìm theo mã đơn hoặc tên khách hàng..."
        rowActions={rowActions}
        totalItems={total}
        isLoading={isLoading}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={(nextLimit) => {
          setLimit(nextLimit);
          setPage(1);
        }}
      />

      <AdminBookingDetailModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        booking={selectedBooking}
        onBookingUpdated={setSelectedBooking}
      />

      <AdminCreateBookingDrawer
        open={isCreateDrawerOpen}
        onOpenChange={setIsCreateDrawerOpen}
      />
    </div>
  );
}
