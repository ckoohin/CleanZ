"use client";

import { useMemo, useState } from "react";
import { ArrowDownToLine, ListFilter, Undo2 } from "lucide-react";
import {
  BaseTableList,
  type Column,
} from "@/components/ui/base/base_table_list";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminTopups, useRefundTopup } from "../hooks/useAdminWallets";
import type {
  AdminTopupOrder,
  AdminTopupStatus,
} from "../types/wallet.types";

const STATUS_LABELS: Record<AdminTopupStatus, string> = {
  CREATED: "Chờ thanh toán",
  COMPLETED: "Thành công",
  FAILED: "Thất bại",
  CANCELLED: "Đã hủy",
  EXPIRED: "Hết hạn",
  REFUND_PENDING: "Đang hoàn tiền",
  REFUNDED: "Đã hoàn tiền",
};

const STATUS_TONES: Record<AdminTopupStatus, string> = {
  CREATED: "bg-amber-500/10 text-amber-600",
  COMPLETED: "bg-emerald-500/10 text-emerald-600",
  FAILED: "bg-red-500/10 text-red-600",
  CANCELLED: "bg-zinc-500/10 text-zinc-500",
  EXPIRED: "bg-zinc-500/10 text-zinc-500",
  REFUND_PENDING: "bg-amber-500/10 text-amber-600",
  REFUNDED: "bg-blue-500/10 text-blue-600",
};

const formatVnd = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

/** Bảng đơn nạp ví (PayPal/Adyen) + hoàn tiền Adyen về phương thức gốc. */
export function TopupOrdersSection() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [provider, setProvider] = useState<string>("ALL");
  const [status, setStatus] = useState<string>("ALL");
  const [refundTarget, setRefundTarget] = useState<AdminTopupOrder | null>(
    null,
  );

  const query = useMemo(
    () => ({
      page,
      limit,
      ...(provider !== "ALL" && { provider }),
      ...(status !== "ALL" && { status: status as AdminTopupStatus }),
    }),
    [page, limit, provider, status],
  );

  const { data, isLoading } = useAdminTopups(query);
  const refund = useRefundTopup();

  const columns: Column<AdminTopupOrder>[] = [
    {
      key: "createdAt",
      title: "Thời gian",
      render: (row) =>
        new Date(row.createdAt).toLocaleString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
    },
    {
      key: "owner",
      title: "Người nạp",
      render: (row) => {
        const user = row.customer?.user ?? row.tasker?.user;
        return (
          <div>
            <p className="font-semibold">{user?.fullName ?? "—"}</p>
            <p className="text-xs text-[var(--c-muted)]">
              {row.customer ? "Customer" : "Tasker"}
            </p>
          </div>
        );
      },
    },
    {
      key: "provider",
      title: "Cổng",
      render: (row) => (
        <span className="font-mono text-xs font-bold">{row.provider}</span>
      ),
    },
    {
      key: "amountVnd",
      title: "Số tiền",
      render: (row) => (
        <span className="font-mono font-bold">
          {formatVnd(Number(row.amountVnd))}
        </span>
      ),
    },
    {
      key: "gatewayTxnNo",
      title: "Mã GD cổng",
      hideOnMobile: true,
      render: (row) => (
        <span className="font-mono text-xs">
          {row.gatewayTxnNo ?? row.paypalOrderId ?? "—"}
        </span>
      ),
    },
    {
      key: "status",
      title: "Trạng thái",
      render: (row) => (
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_TONES[row.status]}`}
        >
          {STATUS_LABELS[row.status]}
        </span>
      ),
    },
  ];

  return (
    <>
      <BaseTableList
        columns={columns}
        data={data?.items ?? []}
        rowKey="id"
        totalItems={data?.total ?? 0}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={(next) => {
          setLimit(next);
          setPage(1);
        }}
        filters={
          <div className="grid w-full grid-cols-1 gap-2 md:grid-cols-2">
            <Select
              value={provider}
              onValueChange={(next) => {
                setProvider(next);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-10 w-full rounded-full border-[var(--c-line)] bg-[var(--c-card)] shadow-none">
                <ListFilter className="size-4 text-[var(--c-muted)]" />
                <SelectValue placeholder="Cổng thanh toán" />
              </SelectTrigger>
              <SelectContent className="cz-admin rounded-xl">
                <SelectItem value="ALL">Tất cả cổng</SelectItem>
                <SelectItem value="ADYEN">Adyen</SelectItem>
                <SelectItem value="PAYPAL">PayPal</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={status}
              onValueChange={(next) => {
                setStatus(next);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-10 w-full rounded-full border-[var(--c-line)] bg-[var(--c-card)] shadow-none">
                <ListFilter className="size-4 text-[var(--c-muted)]" />
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent className="cz-admin rounded-xl">
                <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                {(Object.keys(STATUS_LABELS) as AdminTopupStatus[]).map(
                  (value) => (
                    <SelectItem key={value} value={value}>
                      {STATUS_LABELS[value]}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
        }
        isLoading={isLoading}
        emptyTitle="Chưa có đơn nạp"
        emptyDescription="Không có đơn nạp ví nào phù hợp với bộ lọc đã chọn."
        emptyIcon={ArrowDownToLine}
        rowActions={[
          {
            label: "Hoàn tiền",
            icon: Undo2,
            variant: "destructive",
            onClick: setRefundTarget,
            // Chỉ hoàn được đơn Adyen đã thành công (BE cũng chặn lại lần nữa).
            hidden: (row) =>
              row.provider !== "ADYEN" || row.status !== "COMPLETED",
          },
        ]}
      />

      <AlertDialog
        open={Boolean(refundTarget)}
        onOpenChange={(open) => !open && setRefundTarget(null)}
      >
        <AlertDialogContent className="cz-admin">
          <AlertDialogHeader>
            <AlertDialogTitle>Hoàn tiền đơn nạp?</AlertDialogTitle>
            <AlertDialogDescription>
              {refundTarget
                ? `Hoàn ${formatVnd(Number(refundTarget.amountVnd))} về phương thức thanh toán gốc qua Adyen cho ${
                    refundTarget.customer?.user?.fullName ??
                    refundTarget.tasker?.user?.fullName ??
                    "người dùng"
                  }. Ví phải còn đủ số dư. Kết quả hoàn tiền xác nhận qua webhook, có thể mất vài phút (đơn sẽ ở trạng thái "Đang hoàn tiền" trong lúc chờ). Hành động này không thể hoàn tác.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={refund.isPending}>
              Hủy
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={refund.isPending}
              onClick={() => {
                if (!refundTarget) return;
                refund.mutate(refundTarget.id, {
                  onSettled: () => setRefundTarget(null),
                });
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {refund.isPending ? "Đang hoàn tiền..." : "Hoàn tiền"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
