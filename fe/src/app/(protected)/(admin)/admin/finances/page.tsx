"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  Eye,
  ListFilter,
  ReceiptText,
} from "lucide-react";
import {
  BaseTableList,
  type Column,
} from "@/components/ui/base/base_table_list";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWalletTransactions } from "@/features/admin/modules/wallets/hooks/useAdminWallets";
import { TransactionDetailDrawer } from "@/features/admin/modules/wallets/_components/TransactionDetailDrawer";
import type {
  WalletTransaction,
  WalletTransactionType,
} from "@/features/admin/modules/wallets/types/wallet.types";

type TransactionFilter = WalletTransactionType | "ALL";

const TRANSACTION_LABELS: Record<WalletTransactionType, string> = {
  DEPOSIT: "Nạp tiền",
  WITHDRAW: "Rút tiền",
  PAYMENT: "Thanh toán",
  REFUND: "Hoàn tiền",
  PLATFORM_FEE: "Phí nền tảng",
  TASKER_EARNING: "Thu nhập Tasker",
  DEPOSIT_HOLD: "Giữ tiền cọc",
  DEPOSIT_RELEASE: "Giải phóng tiền cọc",
  DEPOSIT_DEDUCT: "Khấu trừ tiền cọc",
  CANCELLATION_FEE: "Phí hủy",
  ADJUSTMENT: "Điều chỉnh",
};

const TRANSACTION_TYPES = Object.keys(
  TRANSACTION_LABELS,
) as WalletTransactionType[];

const formatCurrency = (value: number | string) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value));

const shortId = (value?: string | null) =>
  value ? `${value.slice(0, 8)}…${value.slice(-4)}` : "—";

export default function AdminFinancesPage() {
  const [selectedTransaction, setSelectedTransaction] =
    useState<WalletTransaction | null>(null);
  const [filter, setFilter] = useState<{
    type: TransactionFilter;
    fromDate: string;
    toDate: string;
    page: number;
    limit: number;
  }>({
    type: "ALL",
    fromDate: "",
    toDate: "",
    page: 1,
    limit: 10,
  });

  const query = useMemo(
    () => ({
      page: filter.page,
      limit: filter.limit,
      ...(filter.type !== "ALL" && { type: filter.type }),
      ...(filter.fromDate && { fromDate: filter.fromDate }),
      ...(filter.toDate && { toDate: filter.toDate }),
    }),
    [filter],
  );

  const { data, isLoading } = useWalletTransactions(query);

  const columns: Column<WalletTransaction>[] = [
    {
      key: "id",
      title: "Giao dịch",
      render: (transaction) => (
        <div>
          <p className="font-mono text-xs font-bold text-primary">
            #{shortId(transaction.id)}
          </p>
          <p className="mt-0.5 max-w-60 truncate text-xs text-muted-foreground">
            {transaction.description || "Không có mô tả"}
          </p>
        </div>
      ),
    },
    {
      key: "type",
      title: "Loại giao dịch",
      hideOnMobile: true,
      render: (transaction) => (
        <span className="text-xs font-semibold">
          {TRANSACTION_LABELS[transaction.type]}
        </span>
      ),
    },
    {
      key: "amount",
      title: "Số tiền",
      render: (transaction) => {
        const isCredit =
          Number(transaction.balanceAfter) >= Number(transaction.balanceBefore);
        const Icon = isCredit ? ArrowDownLeft : ArrowUpRight;

        return (
          <div
            className={`flex items-center gap-1.5 font-black ${
              isCredit
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            <Icon className="size-4" />
            {isCredit ? "+" : "-"}
            {formatCurrency(Math.abs(Number(transaction.amount)))}
          </div>
        );
      },
    },
    {
      key: "balanceAfter",
      title: "Số dư sau",
      hideOnMobile: true,
      render: (transaction) => (
        <span className="text-xs font-semibold">
          {formatCurrency(transaction.balanceAfter)}
        </span>
      ),
    },
    {
      key: "createdAt",
      title: "Thời gian",
      hideOnMobile: true,
      render: (transaction) => {
        const date = new Date(transaction.createdAt);
        return (
          <div>
            <p className="text-xs font-semibold">
              {date.toLocaleDateString("vi-VN")}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {date.toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Lịch sử giao dịch</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Theo dõi toàn bộ biến động số dư ví được ghi nhận trong hệ thống.
        </p>
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
          <div className="grid w-full grid-cols-1 gap-2 md:grid-cols-3">
            <Select
              value={filter.type}
              onValueChange={(type) =>
                setFilter((current) => ({
                  ...current,
                  type: type as TransactionFilter,
                  page: 1,
                }))
              }
            >
              <SelectTrigger className="h-10 w-full rounded-full border-border/40 bg-background shadow-none">
                <ListFilter className="size-4 text-muted-foreground" />
                <SelectValue placeholder="Loại giao dịch" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="ALL">Tất cả giao dịch</SelectItem>
                {TRANSACTION_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {TRANSACTION_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative w-full">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="date"
                value={filter.fromDate}
                onChange={(event) =>
                  setFilter((current) => ({
                    ...current,
                    fromDate: event.target.value,
                    page: 1,
                  }))
                }
                aria-label="Từ ngày"
                className="h-10 w-full rounded-full border-border/40 bg-background pl-9 shadow-none"
              />
            </div>

            <div className="relative w-full">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="date"
                value={filter.toDate}
                min={filter.fromDate || undefined}
                onChange={(event) =>
                  setFilter((current) => ({
                    ...current,
                    toDate: event.target.value,
                    page: 1,
                  }))
                }
                aria-label="Đến ngày"
                className="h-10 w-full rounded-full border-border/40 bg-background pl-9 shadow-none"
              />
            </div>
          </div>
        }
        isLoading={isLoading}
        emptyTitle="Chưa có giao dịch"
        emptyDescription="Không có giao dịch nào phù hợp với bộ lọc đã chọn."
        emptyIcon={ReceiptText}
        rowActions={[
          {
            type: "view",
            label: "Xem chi tiết",
            icon: Eye,
            onClick: setSelectedTransaction,
          },
        ]}
      />

      <TransactionDetailDrawer
        transaction={selectedTransaction}
        open={Boolean(selectedTransaction)}
        onClose={() => setSelectedTransaction(null)}
      />
    </div>
  );
}
