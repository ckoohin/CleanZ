"use client";

import { useMemo, useState } from "react";
import {
  BaseTableList,
  type Column,
  type RowAction,
} from "@/components/ui/base/base_table_list";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
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

type OwnerFilter = WalletOwnerType | "ALL";

const OWNER_CONFIG: Record<
  WalletOwnerType,
  { label: string; className: string; icon: typeof UserRound }
> = {
  CUSTOMER: {
    label: "Khách hàng",
    icon: UserRound,
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  TASKER: {
    label: "Tasker",
    icon: ShieldCheck,
    className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  },
  SYSTEM: {
    label: "Hệ thống",
    icon: Building2,
    className: "bg-primary/10 text-primary border-primary/20",
  },
};

const formatCurrency = (value: number | string | undefined) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));

export function WalletManagement() {
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
            <div className={`rounded-xl p-2.5 ${config.className}`}>
              <Icon className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="max-w-[180px] truncate text-sm font-bold">
                {owner.name}
              </p>
              <p className="max-w-[180px] truncate text-xs text-muted-foreground">
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
          <Badge
            variant="outline"
            className={`rounded-full text-[10px] font-bold uppercase ${config.className}`}
          >
            {config.label}
          </Badge>
        );
      },
    },
    {
      key: "balance",
      title: "Số dư khả dụng",
      render: (wallet) => (
        <span className="font-black text-emerald-600 dark:text-emerald-400">
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
          <LockKeyhole className="size-3.5 text-amber-500" />
          <span className="font-semibold">
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
        <span className="text-xs text-muted-foreground">
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
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Quản lý ví</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Theo dõi số dư, tiền đang giữ và biến động ví trong toàn hệ thống.
        </p>
      </div>

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
            <SelectTrigger className="h-10 min-w-[170px] rounded-full border-border/40 bg-background shadow-none">
              <ListFilter className="size-4 text-muted-foreground" />
              <SelectValue placeholder="Loại ví" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
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
