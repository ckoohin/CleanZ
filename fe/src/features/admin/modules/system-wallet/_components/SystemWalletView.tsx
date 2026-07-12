"use client";

import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  Lock,
  ReceiptText,
} from "lucide-react";
import {
  BaseTableList,
  type Column,
} from "@/components/ui/base/base_table_list";
import { PageHeader, StatCard, AdminCard } from "@/components/admin";
import { Input } from "@/components/ui/input";
import {
  useSystemWallet,
  useSystemWalletTransactions,
} from "../hooks/useSystemWallet";
import type { SystemWalletTransaction } from "../types/system-wallet.types";

const TYPE_LABELS: Record<string, string> = {
  PAYMENT: "Khách thanh toán",
  TASKER_EARNING: "Trả công tasker",
  PLATFORM_FEE: "Hoa hồng đơn tiền mặt",
  REFUND: "Hoàn tiền khách",
  ADJUSTMENT: "Điều chỉnh",
  DEPOSIT: "Nạp ví",
  WITHDRAW: "Rút tiền",
  DEPOSIT_HOLD: "Tạm giữ",
  DEPOSIT_RELEASE: "Giải phóng tạm giữ",
  DEPOSIT_DEDUCT: "Khấu trừ bồi thường",
  CANCELLATION_FEE: "Phí hủy",
};

const formatVnd = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/**
 * Chiều tiền KHÔNG suy ra được từ `type` (ví dụ ADJUSTMENT có thể là thu hoặc chi),
 * và `amount` thì luôn dương. Chỉ hiệu số dư trước/sau mới cho biết thật sự tiền
 * vào hay ra khỏi ví hệ thống.
 */
const signedDelta = (transaction: SystemWalletTransaction) =>
  Number(transaction.balanceAfter) - Number(transaction.balanceBefore);

const LIMIT = 20;

export function SystemWalletView() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(LIMIT);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const { data: wallet, isLoading: isWalletLoading } = useSystemWallet();
  const { data, isLoading } = useSystemWalletTransactions({
    page,
    limit,
    ...(fromDate && { fromDate }),
    ...(toDate && { toDate }),
  });

  const columns: Column<SystemWalletTransaction>[] = [
    {
      key: "createdAt",
      title: "Thời gian",
      render: (transaction) => (
        <span className="whitespace-nowrap text-[13px] text-[var(--c-muted)]">
          {formatDateTime(transaction.createdAt)}
        </span>
      ),
    },
    {
      key: "type",
      title: "Nội dung",
      render: (transaction) => (
        <div className="min-w-0">
          <p className="truncate font-semibold">
            {TYPE_LABELS[transaction.type] ?? transaction.type}
          </p>
          {transaction.description && (
            <p className="truncate text-xs text-[var(--c-muted)]">
              {transaction.description}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "amount",
      title: "Vào / Ra",
      render: (transaction) => {
        const delta = signedDelta(transaction);
        const isIn = delta >= 0;
        return (
          <span
            className={`inline-flex items-center gap-1 whitespace-nowrap font-mono font-bold tabular-nums ${
              isIn ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {isIn ? (
              <ArrowDownLeft className="size-3.5" />
            ) : (
              <ArrowUpRight className="size-3.5" />
            )}
            {isIn ? "+" : "−"}
            {formatVnd(Math.abs(delta))}
          </span>
        );
      },
    },
    {
      key: "balanceAfter",
      title: "Số dư sau",
      render: (transaction) => (
        <span className="whitespace-nowrap font-mono tabular-nums text-[var(--c-muted)]">
          {formatVnd(Number(transaction.balanceAfter))}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Ví hệ thống"
        description="Toàn bộ tiền của nền tảng: hoa hồng thu được, tiền đang giữ hộ khách và các khoản đã chi."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard
          icon={Landmark}
          label="Số dư ví hệ thống"
          tint="#0E9F6E"
          value={
            isWalletLoading ? "…" : formatVnd(Number(wallet?.balance ?? 0))
          }
        />
        <StatCard
          icon={Lock}
          label="Đang tạm giữ (sự cố)"
          tint="#F59E0B"
          value={
            isWalletLoading ? "…" : formatVnd(Number(wallet?.holdBalance ?? 0))
          }
        />
      </div>

      <AdminCard className="flex gap-3 p-4 text-sm">
        <ReceiptText className="mt-0.5 size-4 shrink-0 text-[var(--c-muted)]" />
        <p className="text-[var(--c-muted)]">
          Đơn trả bằng ví: tiền khách vào thẳng ví này (<strong>Khách thanh
          toán</strong>), sau đó nền tảng trả công tasker (<strong>Trả công
          tasker</strong>). Phần chênh lệch giữa hai dòng đó chính là hoa hồng.
          Đơn tiền mặt thì tasker cầm tiền của khách nên hoa hồng được thu lại từ
          ví tasker, hiện thành dòng <strong>Hoa hồng đơn tiền mặt</strong>.
        </p>
      </AdminCard>

      <BaseTableList
        columns={columns}
        data={data?.items ?? []}
        rowKey="id"
        isLoading={isLoading}
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
            <Input
              type="date"
              value={fromDate}
              onChange={(event) => {
                setFromDate(event.target.value);
                setPage(1);
              }}
              className="h-10 rounded-full border-[var(--c-line)] bg-[var(--c-card)] shadow-none"
            />
            <Input
              type="date"
              value={toDate}
              onChange={(event) => {
                setToDate(event.target.value);
                setPage(1);
              }}
              className="h-10 rounded-full border-[var(--c-line)] bg-[var(--c-card)] shadow-none"
            />
          </div>
        }
      />
    </div>
  );
}
