"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BaseTableList,
  type Column,
  type RowAction,
} from "@/components/ui/base/base_table_list";
import { PageHeader, StatusBadge } from "@/components/admin";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  ExternalLink,
  Eye,
  ListFilter,
  LockKeyhole,
  ShieldCheck,
  UserRound,
  WalletCards,
} from "lucide-react";
import { useAdminWallets } from "../hooks/useAdminWallets";
import type {
  AdminWallet,
  WalletOwnerType,
} from "../types/wallet.types";
import { WalletDetailDrawer } from "./WalletDetailDrawer";
import { CustomerWalletOverviewCards } from "./CustomerWalletOverviewCards";

type OwnerFilter = WalletOwnerType | "ALL";

const OWNER_CONFIG: Record<
  WalletOwnerType,
  { label: string; color: string; soft: string; icon: typeof UserRound }
> = {
  CUSTOMER: {
    label: "Khách hàng",
    icon: UserRound,
    color: "#2563EB",
    soft: "rgba(37,99,235,0.12)",
  },
  TASKER: {
    label: "Tasker",
    icon: ShieldCheck,
    color: "#D97706",
    soft: "rgba(217,119,6,0.14)",
  },
  SYSTEM: {
    label: "Hệ thống",
    icon: Building2,
    color: "var(--c-primary-strong)",
    soft: "var(--c-primary-soft)",
  },
};

const formatCurrency = (value: number | string | undefined) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));

export function WalletManagement() {
  const router = useRouter();
  const [filter, setFilter] = useState<{
    keyword: string;
    ownerType: OwnerFilter;
    page: number;
    limit: number;
  }>({
    keyword: "",
    ownerType: "ALL",
    page: 1,
    limit: 10,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const query = useMemo(
    () => ({
      page: filter.page,
      limit: filter.limit,
      ...(filter.keyword.trim() && { search: filter.keyword.trim() }),
      ...(filter.ownerType !== "ALL" && {
        ownerType: filter.ownerType,
      }),
    }),
    [filter],
  );

  const { data, isLoading } = useAdminWallets(query);

  const columns: Column<AdminWallet>[] = [
    {
      key: "owner",
      title: "Chủ ví",
      render: (wallet) => {
        const owner = getOwner(wallet);
        const config = OWNER_CONFIG[wallet.ownerType];
        const Icon = config.icon;

        return (
          <div className="flex items-center gap-3">
            <div
              className="rounded-xl p-2.5"
              style={{ background: config.soft, color: config.color }}
            >
              <Icon className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="max-w-[180px] truncate text-sm font-bold text-[var(--c-ink)]">
                {owner.name}
              </p>
              <p className="max-w-[180px] truncate text-xs text-[var(--c-muted)]">
                {owner.email}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      key: "ownerType",
      title: "Loại ví",
      render: (wallet) => {
        const config = OWNER_CONFIG[wallet.ownerType];
        return (
          <StatusBadge
            color={config.color}
            soft={config.soft}
            className="text-[10px] font-bold uppercase"
          >
            {config.label}
          </StatusBadge>
        );
      },
    },
    {
      key: "balance",
      title: "Số dư khả dụng",
      render: (wallet) => (
        <span className="font-black text-[#0E9F6E]">
          {formatCurrency(wallet.balance)}
        </span>
      ),
    },
    {
      key: "holdBalance",
      title: "Đang giữ",
      hideOnMobile: true,
      render: (wallet) => (
        <div className="flex items-center gap-1.5 text-sm">
          <LockKeyhole className="size-3.5 text-[#D97706]" />
          <span className="font-semibold text-[var(--c-ink)]">
            {formatCurrency(wallet.holdBalance)}
          </span>
        </div>
      ),
    },
    {
      key: "updatedAt",
      title: "Cập nhật",
      hideOnMobile: true,
      render: (wallet) => (
        <span className="text-xs text-[var(--c-muted)]">
          {new Date(wallet.updatedAt).toLocaleString("vi-VN")}
        </span>
      ),
    },
  ];

  const rowActions: RowAction<AdminWallet>[] = [
    {
      type: "view",
      label: "Xem ví và giao dịch",
      icon: Eye,
      onClick: (wallet) => setSelectedId(wallet.id),
    },
    {
      label: "Phân tích ví 360° khách hàng",
      icon: ExternalLink,
      hidden: (wallet) => wallet.ownerType !== "CUSTOMER",
      onClick: (wallet) =>
        router.push(`/admin/customers/${wallet.customer?.id}?tab=finance`),
      separatorBefore: true,
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Quản lý ví"
        description="Theo dõi số dư, tiền đang giữ và biến động ví trong toàn hệ thống."
      />

      <CustomerWalletOverviewCards />

      <BaseTableList
        columns={columns}
        data={data?.items ?? []}
        rowKey="id"
        totalItems={data?.total ?? 0}
        page={filter.page}
        limit={filter.limit}
        onPageChange={(page) =>
          setFilter((current) => ({ ...current, page }))
        }
        onLimitChange={(limit) =>
          setFilter((current) => ({ ...current, limit, page: 1 }))
        }
        keyword={filter.keyword}
        onKeywordChange={(keyword) =>
          setFilter((current) => ({ ...current, keyword, page: 1 }))
        }
        placeholderSearch="Tìm theo mã ví, tên hoặc email..."
        filters={
          <Select
            value={filter.ownerType}
            onValueChange={(ownerType) =>
              setFilter((current) => ({
                ...current,
                ownerType: ownerType as OwnerFilter,
                page: 1,
              }))
            }
          >
            <SelectTrigger className="h-10 min-w-[170px] rounded-full border-[var(--c-line)] bg-[var(--c-card)] shadow-none">
              <ListFilter className="size-4 text-[var(--c-muted)]" />
              <SelectValue placeholder="Loại ví" />
            </SelectTrigger>
            <SelectContent className="cz-admin rounded-xl">
              <SelectItem value="ALL">Tất cả loại ví</SelectItem>
              <SelectItem value="CUSTOMER">Khách hàng</SelectItem>
              <SelectItem value="TASKER">Tasker</SelectItem>
              <SelectItem value="SYSTEM">Hệ thống</SelectItem>
            </SelectContent>
          </Select>
        }
        isLoading={isLoading}
        emptyTitle="Không tìm thấy ví"
        emptyDescription="Không có ví nào phù hợp với từ khóa hoặc bộ lọc."
        emptyIcon={WalletCards}
        rowActions={rowActions}
        inlineActionCount={1}
      />

      {selectedId && (
        <WalletDetailDrawer
          walletId={selectedId}
          open
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

function getOwner(wallet: AdminWallet) {
  if (wallet.ownerType === "SYSTEM") {
    return { name: "Ví hệ thống CleanZ", email: "system@cleanz.vn" };
  }

  const profile =
    wallet.ownerType === "TASKER" ? wallet.tasker : wallet.customer;
  return {
    name: profile?.user?.fullName || "Chưa cập nhật",
    email: profile?.user?.email || "—",
  };
}
