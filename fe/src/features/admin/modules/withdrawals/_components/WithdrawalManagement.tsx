"use client";

import { useMemo, useState } from "react";
import {
  BaseTableList,
  type Column,
  type RowAction,
} from "@/components/ui/base/base_table_list";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/admin";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BanknoteArrowDown,
  CheckCircle2,
  Clock3,
  Eye,
  ListFilter,
  PiggyBank,
  WalletCards,
  XCircle,
} from "lucide-react";
import {
  useAdminWithdrawals,
  useFinancialOverview,
} from "../hooks/useAdminWithdrawals";
import type {
  WithdrawalRequest,
  WithdrawalStatus,
} from "../types/withdrawal.types";
import { WithdrawalStatusBadge } from "./WithdrawalStatusBadge";
import { WithdrawalReviewDialog } from "./WithdrawalReviewDialog";

type StatusFilter = WithdrawalStatus | "ALL";
type ReviewMode = "APPROVED" | "REJECTED" | null;

const formatCurrency = (value: number | string | undefined) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));

const shortId = (value: string) => `${value.slice(0, 8)}…${value.slice(-4)}`;

const STATUS_OPTIONS: Array<{
  value: StatusFilter;
  label: string;
}> = [
  { value: "ALL", label: "Tất cả trạng thái" },
  { value: "PENDING", label: "Chờ duyệt" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "REJECTED", label: "Từ chối" },
  { value: "PROCESSED", label: "Đã xử lý" },
];

export function WithdrawalManagement({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const [filter, setFilter] = useState<{
    status: StatusFilter;
    page: number;
    limit: number;
  }>({
    status: "ALL",
    page: 1,
    limit: 10,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reviewMode, setReviewMode] = useState<ReviewMode>(null);

  const query = useMemo(
    () => ({
      page: filter.page,
      limit: filter.limit,
      ...(filter.status !== "ALL" && { status: filter.status }),
    }),
    [filter],
  );

  const { data, isLoading } = useAdminWithdrawals(query);
  const { data: overview, isLoading: isOverviewLoading } =
    useFinancialOverview();

  const openDetail = (row: WithdrawalRequest, mode: ReviewMode = null) => {
    setSelectedId(row.id);
    setReviewMode(mode);
  };

  const columns: Column<WithdrawalRequest>[] = [
    {
      key: "taskerId",
      title: "Tasker",
      render: (row) => (
        <div>
          <p className="text-sm font-bold text-[var(--c-ink)]">
            {row.tasker?.user?.fullName || "-"}
          </p>
          <p className="text-[11px] text-[var(--c-muted)]">
            {row.tasker?.user?.email || shortId(row.taskerId)}
          </p>
        </div>
      ),
    },
    {
      key: "amount",
      title: "Số tiền rút",
      render: (row) => (
        <span className="font-black text-[#D97706]">
          {formatCurrency(row.amount)}
        </span>
      ),
    },
    {
      key: "bank",
      title: "Tài khoản nhận",
      hideOnMobile: true,
      render: (row) => (
        <div className="max-w-55">
          <p className="truncate text-sm font-semibold text-[var(--c-ink)]">
            {row.bankName || "Chưa cung cấp ngân hàng"}
          </p>
          <p className="truncate font-mono text-xs text-[var(--c-muted)]">
            {row.bankAccount || "—"}
          </p>
        </div>
      ),
    },
    {
      key: "createdAt",
      title: "Ngày yêu cầu",
      hideOnMobile: true,
      render: (row) => {
        const date = new Date(row.createdAt);
        return (
          <div>
            <p className="text-xs font-semibold text-[var(--c-ink)]">
              {date.toLocaleDateString("vi-VN")}
            </p>
            <p className="text-[11px] text-[var(--c-muted)]">
              {date.toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        );
      },
    },
    {
      key: "status",
      title: "Trạng thái",
      render: (row) => <WithdrawalStatusBadge status={row.status} />,
    },
  ];

  const rowActions: RowAction<WithdrawalRequest>[] = [
    {
      type: "view",
      label: "Xem chi tiết",
      icon: Eye,
      onClick: (row) => openDetail(row),
    },
    {
      type: "approve",
      label: "Phê duyệt",
      icon: CheckCircle2,
      onClick: (row) => openDetail(row, "APPROVED"),
      hidden: (row) => row.status !== "PENDING",
    },
    {
      label: "Từ chối",
      icon: XCircle,
      onClick: (row) => openDetail(row, "REJECTED"),
      hidden: (row) => row.status !== "PENDING",
      variant: "destructive",
    },
  ];

  return (
    <div className="space-y-4">
      {!embedded && (
        <PageHeader
          title="Yêu cầu rút tiền"
          description="Kiểm tra số dư, thông tin ngân hàng và xét duyệt yêu cầu của Tasker."
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <OverviewCard
          icon={WalletCards}
          label="Tổng số dư ví"
          value={formatCurrency(overview?.totalWalletBalance)}
          loading={isOverviewLoading}
          tone="primary"
        />
        <OverviewCard
          icon={PiggyBank}
          label="Số dư đang giữ"
          value={formatCurrency(overview?.totalHoldBalance)}
          loading={isOverviewLoading}
          tone="blue"
        />
        <OverviewCard
          icon={Clock3}
          label="Yêu cầu chờ duyệt"
          value={String(overview?.pendingWithdrawals ?? 0)}
          loading={isOverviewLoading}
          tone="amber"
        />
        <OverviewCard
          icon={BanknoteArrowDown}
          label="Tiền đang chờ rút"
          value={formatCurrency(overview?.pendingWithdrawalAmount)}
          loading={isOverviewLoading}
          tone="emerald"
        />
      </div>

      <BaseTableList
        columns={columns}
        data={data?.items ?? []}
        rowKey="id"
        totalItems={data?.total ?? 0}
        page={filter.page}
        limit={filter.limit}
        onPageChange={(page) => setFilter((current) => ({ ...current, page }))}
        onLimitChange={(limit) =>
          setFilter((current) => ({ ...current, limit, page: 1 }))
        }
        filters={
          <Select
            value={filter.status}
            onValueChange={(status) =>
              setFilter((current) => ({
                ...current,
                status: status as StatusFilter,
                page: 1,
              }))
            }
          >
            <SelectTrigger className="h-10 min-w-[180px] rounded-full border-[var(--c-line)] bg-[var(--c-card)] shadow-none">
              <ListFilter className="size-4 text-[var(--c-muted)]" />
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent className="cz-admin rounded-xl">
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
        isLoading={isLoading}
        emptyTitle="Chưa có yêu cầu rút tiền"
        emptyDescription="Không có yêu cầu nào phù hợp với trạng thái đã chọn."
        emptyIcon={BanknoteArrowDown}
        rowActions={rowActions}
        inlineActionCount={2}
      />

      {selectedId && (
        <WithdrawalReviewDialog
          key={`${selectedId}-${reviewMode ?? "detail"}`}
          withdrawalId={selectedId}
          open
          initialMode={reviewMode}
          onClose={() => {
            setSelectedId(null);
            setReviewMode(null);
          }}
        />
      )}
    </div>
  );
}

function OverviewCard({
  icon: Icon,
  label,
  value,
  loading,
  tone,
}: {
  icon: typeof WalletCards;
  label: string;
  value: string;
  loading: boolean;
  tone: "primary" | "blue" | "amber" | "emerald";
}) {
  const tones: Record<typeof tone, { color: string; soft: string }> = {
    primary: {
      color: "var(--c-primary-strong)",
      soft: "var(--c-primary-soft)",
    },
    blue: { color: "#2563EB", soft: "rgba(37,99,235,0.12)" },
    amber: { color: "#D97706", soft: "rgba(217,119,6,0.14)" },
    emerald: { color: "#0E9F6E", soft: "rgba(14,159,110,0.12)" },
  };

  return (
    <div className="rounded-[20px] border border-[var(--c-line)] bg-[var(--c-card)] p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div
          className="rounded-xl p-2.5"
          style={{ background: tones[tone].soft, color: tones[tone].color }}
        >
          <Icon className="size-5" />
        </div>
        <Badge
          variant="outline"
          className="rounded-full border-[var(--c-line)] text-[10px] text-[var(--c-muted)]"
        >
          Hiện tại
        </Badge>
      </div>
      <p className="mt-4 text-xs font-medium text-[var(--c-muted)]">{label}</p>
      {loading ? (
        <div className="mt-2 h-7 w-28 animate-pulse rounded-lg bg-[var(--c-card-2)]" />
      ) : (
        <p className="mt-1 truncate text-xl font-black tracking-tight text-[var(--c-ink)]">
          {value}
        </p>
      )}
    </div>
  );
}
