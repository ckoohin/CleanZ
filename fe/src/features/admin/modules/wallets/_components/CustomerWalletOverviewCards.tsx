"use client";

import { useFinanceOverview, useCustomerSpending } from "../hooks/useAdminWallets";
import {
  Wallet,
  LockKeyhole,
  Users,
  RotateCcw,
} from "lucide-react";

const formatCurrency = (value: number | undefined) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));

export function CustomerWalletOverviewCards() {
  const { data: overview, isLoading: isOverviewLoading } = useFinanceOverview();
  const { data: spending, isLoading: isSpendingLoading } = useCustomerSpending({
    limit: 1,
  });

  const cards = [
    {
      title: "Tổng số dư ví toàn sàn",
      value: formatCurrency(overview?.totalWalletBalance),
      subtitle: "Gồm ví Khách, Tasker & System",
      icon: Wallet,
      iconStyle: "bg-[var(--c-primary-soft)] text-[var(--c-primary-strong)]",
    },
    {
      title: "Tiền tạm giữ (Hold)",
      value: formatCurrency(overview?.totalHoldBalance),
      subtitle: "Tạm đóng băng theo đơn hàng",
      icon: LockKeyhole,
      iconStyle: "bg-amber-500/10 text-amber-600",
    },
    {
      title: "Khách hàng có ví",
      value: spending?.total ?? 0,
      subtitle: "Đã phát sinh giao dịch tài chính",
      icon: Users,
      iconStyle: "bg-blue-500/10 text-blue-600",
      isCount: true,
    },
    {
      title: "Chờ rút tiền",
      value: overview?.pendingWithdrawals ?? 0,
      subtitle: `${formatCurrency(overview?.pendingWithdrawalAmount)} đang chờ duyệt`,
      icon: RotateCcw,
      iconStyle: "bg-purple-500/10 text-purple-600",
      isCount: true,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        const isLoading = isOverviewLoading || isSpendingLoading;

        return (
          <div
            key={idx}
            className="rounded-2xl border border-[var(--c-line)] bg-[var(--c-card)] p-5 shadow-xs transition-all hover:border-[var(--c-line-strong)]"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--c-muted)]">
                {card.title}
              </span>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${card.iconStyle}`}>
                <Icon className="size-4.5" />
              </div>
            </div>

            <div className="mt-3">
              {isLoading ? (
                <div className="h-8 w-32 animate-pulse rounded-xl bg-[var(--c-card-2)]" />
              ) : (
                <p className="text-2xl font-black tracking-tight text-[var(--c-ink)]">
                  {card.isCount ? card.value.toLocaleString("vi-VN") : card.value}
                </p>
              )}
              <p className="mt-1 text-xs text-[var(--c-muted)]">
                {card.subtitle}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
