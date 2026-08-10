"use client";

import * as React from "react";
import Image from "next/image";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  RefreshCw,
  UserRoundX,
  WalletCards,
} from "lucide-react";
import {
  AdminButton,
  FilterTabs,
  PageHeader,
  StatCard,
  StatusBadge,
  type BadgeTone,
} from "@/components/admin";
import {
  BaseTableList,
  type Column,
  type RowAction,
} from "@/components/ui/base/base_table_list";
import { cn } from "@/lib/utils";
import {
  useAdminAbsenceReports,
  useBulkApproveAbsenceReports,
} from "../hooks/useAdminAbsenceReports";
import type {
  AbsenceReportStatus,
  AdminAbsenceReport,
} from "../types/absence-report.types";
import { AbsenceReportDetailDialog } from "./AbsenceReportDetailDialog";

const TABS: Array<{ key: AbsenceReportStatus; label: string }> = [
  { key: "PENDING_REVIEW", label: "Chờ duyệt" },
  { key: "APPROVED", label: "Đã duyệt" },
  { key: "REJECTED", label: "Đã từ chối" },
  { key: "EXPIRED", label: "Quá SLA" },
];

const STATUS_META: Record<
  AbsenceReportStatus,
  { label: string; tone: BadgeTone }
> = {
  PENDING_REVIEW: { label: "Chờ duyệt", tone: "warning" },
  APPROVED: { label: "Đã duyệt", tone: "success" },
  REJECTED: { label: "Đã từ chối", tone: "danger" },
  EXPIRED: { label: "Quá SLA", tone: "neutral" },
};

function money(value: number) {
  return `${value.toLocaleString("vi-VN")}đ`;
}

function dateTime(value: string) {
  return new Date(value).toLocaleString("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function SlaLabel({ report }: { report: AdminAbsenceReport }) {
  if (report.status !== "PENDING_REVIEW")
    return <span className="text-xs text-[var(--c-muted)]">Đã chốt</span>;
  const hours = report.slaRemainingMs / 3_600_000;
  return (
    <div className={cn("space-y-0.5", hours <= 2 && "text-rose-700")}>
      <div className="font-semibold">
        {hours > 0 ? `Còn ${Math.max(1, Math.ceil(hours))} giờ` : "Đã quá hạn"}
      </div>
      <div className="text-xs opacity-70">{dateTime(report.reviewDueAt)}</div>
    </div>
  );
}

export function AdminAbsenceReportPage() {
  const [status, setStatus] =
    React.useState<AbsenceReportStatus>("PENDING_REVIEW");
  const [keyword, setKeyword] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(20);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const query = useAdminAbsenceReports({ status, keyword, page, limit });
  const bulkApprove = useBulkApproveAbsenceReports();
  const items = query.data?.items ?? [];

  const openDetail = (id: string) => {
    setSelectedId(id);
    setDetailOpen(true);
  };

  const columns: Column<AdminAbsenceReport>[] = [
    {
      key: "booking",
      title: "Đơn & khách",
      render: (row) => (
        <div className="min-w-40 space-y-1">
          <p className="font-mono text-xs font-black uppercase tracking-wider text-[var(--c-primary-strong)]">
            {row.booking.bookingCode}
          </p>
          <p className="font-semibold text-[var(--c-ink)]">
            {row.customer.fullName ?? "Khách vãng lai"}
          </p>
          <p className="text-xs text-[var(--c-muted)]">
            {row.customer.phone ?? "Không có SĐT"}
          </p>
        </div>
      ),
    },
    {
      key: "tasker",
      title: "Tasker",
      render: (row) => (
        <div className="space-y-1">
          <p className="font-semibold">{row.tasker?.fullName ?? "—"}</p>
          <p className="text-xs text-[var(--c-muted)]">
            {row.taskerStats30d.reported} báo cáo / 30 ngày
          </p>
        </div>
      ),
    },
    {
      key: "evidence",
      title: "Bằng chứng",
      hideOnMobile: true,
      render: (row) => (
        <div className="flex min-w-52 items-center gap-3 text-sm">
          <div className="relative size-14 shrink-0 overflow-hidden rounded-2xl border border-[var(--c-line)] bg-slate-100">
            <Image
              src={row.proofPhotoUrl}
              alt="Ảnh địa chỉ khách hàng"
              fill
              unoptimized
              className="object-contain"
            />
          </div>
          <div className="space-y-1">
            <p
              className={
                row.hasCallHistoryPhoto
                  ? "font-semibold text-emerald-700"
                  : "font-semibold text-amber-700"
              }
            >
              {row.hasCallHistoryPhoto
                ? "Đủ hình ảnh"
                : "Hồ sơ cũ · thiếu lịch sử gọi"}
            </p>
            <p>Chờ {row.waitedMinutes} phút</p>
            <p
              className={
                row.checkinFar
                  ? "font-semibold text-rose-700"
                  : "text-[var(--c-muted)]"
              }
            >
              {row.checkinDistanceMeters == null
                ? "Không có GPS"
                : `${Math.round(row.checkinDistanceMeters)}m từ địa chỉ`}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "money",
      title: "Bồi hoàn",
      render: (row) => (
        <div className="space-y-1 tabular-nums">
          <p className="font-black text-[var(--c-ink)]">
            {money(row.compensationAmount)}
          </p>
          <p className="text-xs text-[var(--c-muted)]">
            Đã hoàn {money(row.refundedUpfront)}
          </p>
        </div>
      ),
    },
    {
      key: "sla",
      title: "SLA",
      hideOnMobile: true,
      render: (row) => <SlaLabel report={row} />,
    },
    {
      key: "status",
      title: "Trạng thái",
      render: (row) => (
        <div className="space-y-1.5">
          <StatusBadge tone={STATUS_META[row.status].tone}>
            {STATUS_META[row.status].label}
          </StatusBadge>
          {row.needsAttention && (
            <StatusBadge tone="danger">Cần xem kỹ</StatusBadge>
          )}
        </div>
      ),
    },
    {
      key: "quick-review",
      title: "Xử lý",
      hideOnMobile: true,
      render: (row) =>
        row.status === "PENDING_REVIEW" && !row.needsAttention ? (
          <AdminButton
            size="sm"
            disabled={bulkApprove.isPending}
            onClick={() => void bulkApprove.mutateAsync([row.id])}
          >
            <CheckCircle2 className="size-4" /> Duyệt nhanh
          </AdminButton>
        ) : (
          <button
            type="button"
            onClick={() => openDetail(row.id)}
            className="text-xs font-bold text-[var(--c-primary-strong)] hover:underline"
          >
            Xem hồ sơ
          </button>
        ),
    },
  ];

  const rowActions: RowAction<AdminAbsenceReport>[] = [
    {
      type: "view",
      label: "Xem hồ sơ & xử lý",
      onClick: (row) => openDetail(row.id),
    },
  ];
  const dueSoon = items.filter(
    (item) =>
      item.status === "PENDING_REVIEW" && item.slaRemainingMs <= 2 * 3_600_000,
  ).length;
  const attention = items.filter((item) => item.needsAttention).length;
  const totalHeld = items.reduce((sum, item) => sum + item.heldForReview, 0);

  return (
    <div className="space-y-8 pb-10">
      <PageHeader
        title="Khách hàng vắng mặt"
        description="Một hàng chờ tập trung: bằng chứng, lịch sử và tác động tài chính được tính sẵn trước khi duyệt."
        actions={
          <AdminButton
            variant="secondary"
            onClick={() => void query.refetch()}
            icon={
              <RefreshCw
                className={cn("size-4", query.isFetching && "animate-spin")}
              />
            }
          >
            Làm mới
          </AdminButton>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Clock3}
          label="Đang hiển thị"
          value={query.isLoading ? "…" : (query.data?.total ?? 0)}
          tint="#D97706"
        />
        <StatCard
          icon={AlertTriangle}
          label="Sắp / đã quá SLA"
          value={dueSoon}
          tint={dueSoon ? "#E11D48" : "#0E9F6E"}
        />
        <StatCard
          icon={UserRoundX}
          label="Ca cần xem kỹ"
          value={attention}
          tint="#7C3AED"
        />
        <StatCard
          icon={WalletCards}
          label="Tiền đang giữ trên trang"
          value={money(totalHeld)}
          tint="#2563EB"
        />
      </div>

      <FilterTabs
        tabs={TABS}
        value={status}
        onChange={(nextStatus) => {
          setStatus(nextStatus);
          setPage(1);
        }}
      />

      <BaseTableList
        columns={columns}
        data={items}
        rowKey="id"
        keyword={keyword}
        onKeywordChange={(nextKeyword) => {
          setKeyword(nextKeyword);
          setPage(1);
        }}
        placeholderSearch="Mã đơn, khách hàng, Tasker hoặc số điện thoại..."
        rowActions={rowActions}
        bulkActions={
          status === "PENDING_REVIEW"
            ? [
                {
                  label: bulkApprove.isPending
                    ? "Đang duyệt..."
                    : "Duyệt các ca sạch",
                  icon: CheckCircle2,
                  onClick: (selected) =>
                    void bulkApprove.mutateAsync(selected.map((row) => row.id)),
                },
              ]
            : []
        }
        totalItems={query.data?.total ?? 0}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={(next) => {
          setLimit(next);
          setPage(1);
        }}
        isLoading={query.isLoading}
        emptyIcon={UserRoundX}
        emptyTitle="Không có báo cáo trong nhóm này"
        emptyDescription="Hàng chờ đã sạch hoặc chưa có dữ liệu phù hợp với bộ lọc."
      />

      <AbsenceReportDetailDialog
        reportId={selectedId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
