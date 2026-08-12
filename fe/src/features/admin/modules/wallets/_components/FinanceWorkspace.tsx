"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BanknoteArrowDown,
  CalendarDays,
  CreditCard,
  ExternalLink,
  Eye,
  HandCoins,
  ListFilter,
  Lock,
  PiggyBank,
  ReceiptText,
  Search,
  Undo2,
  Users,
  Wallet,
  WalletCards,
  X,
} from "lucide-react";
import {
  BaseTableList,
  type Column,
} from "@/components/ui/base/base_table_list";
import { Input } from "@/components/ui/input";
import { AdminCard, PageHeader, StatCard } from "@/components/admin";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCustomerSpending,
  useFinanceOverview,
  useTransactionFlowSummary,
  useWalletTransactions,
} from "../hooks/useAdminWallets";
import { TransactionDetailDrawer } from "./TransactionDetailDrawer";
import { WalletManagement } from "./WalletManagement";
import { UnifiedWithdrawalManagement } from "@/features/admin/modules/withdrawals/_components/UnifiedWithdrawalManagement";
import type {
  CustomerSpendingItem,
  WalletOwnerType,
  WalletTransaction,
  WalletTransactionType,
} from "../types/wallet.types";

type TransactionFilter = WalletTransactionType | "ALL";
type OwnerTab = WalletOwnerType | "ALL";

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

const OWNER_TABS: { value: OwnerTab; label: string }[] = [
  { value: "ALL", label: "Tất cả" },
  { value: "CUSTOMER", label: "Khách hàng" },
  { value: "TASKER", label: "Tasker" },
  { value: "SYSTEM", label: "Hệ thống" },
];

const OWNER_BADGES: Record<WalletOwnerType, { label: string; color: string }> =
  {
    CUSTOMER: { label: "Khách", color: "#2563EB" },
    TASKER: { label: "Tasker", color: "#0E9F6E" },
    SYSTEM: { label: "Hệ thống", color: "#7C3AED" },
  };

const formatCurrency = (value: number | string) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value));

const shortId = (value?: string | null) =>
  value ? `${value.slice(0, 8)}…${value.slice(-4)}` : "—";

function walletOwnerName(transaction: WalletTransaction): string {
  const wallet = transaction.wallet;
  if (!wallet) return "—";
  if (wallet.ownerType === "SYSTEM") return "Ví CleanZ";
  return (
    wallet.customer?.user?.fullName ?? wallet.tasker?.user?.fullName ?? "—"
  );
}

/**
 * Gộp ba màn cũ `/admin/finances` (Giao dịch), `/admin/wallets` (Quản lý ví) và
 * `/admin/withdrawals` (Rút tiền) thành một nơi. Cả ba đều đọc `useFinanceOverview`
 * và tự vẽ lại cùng bộ chỉ số số dư / tạm giữ / chờ rút; ngoài ra Giao dịch và
 * Quản lý ví còn trùng cả đường "xem giao dịch của một ví".
 *
 * Khối chỉ số tổng quan giờ chỉ vẽ một lần ở cấp trang, dùng chung cho cả ba tab —
 * nên `WalletManagement` và `WithdrawalManagement` được nhúng với cờ `embedded`.
 *
 * Số yêu cầu chờ duyệt hiện trên nhãn tab "Rút tiền" để hàng chờ không bị khuất
 * sau khi mục này rời khỏi sidebar.
 */
export function FinanceWorkspace() {
  const router = useRouter();
  const [selectedTransaction, setSelectedTransaction] =
    useState<WalletTransaction | null>(null);
  const [ownerTab, setOwnerTab] = useState<OwnerTab>("ALL");
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerSpendingItem | null>(null);
  const [spendingSearch, setSpendingSearch] = useState("");
  const [spendingPage, setSpendingPage] = useState(1);
  const [spendingLimit, setSpendingLimit] = useState(5);
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

  // Đang xem giao dịch của 1 customer cụ thể → lọc theo ví của người đó,
  // ngược lại lọc theo tab loại ví.
  const selectedWalletId = selectedCustomer?.walletId ?? undefined;

  const query = useMemo(
    () => ({
      page: filter.page,
      limit: filter.limit,
      ...(filter.type !== "ALL" && { type: filter.type }),
      ...(filter.fromDate && { fromDate: filter.fromDate }),
      ...(filter.toDate && { toDate: filter.toDate }),
      ...(selectedWalletId
        ? { walletId: selectedWalletId }
        : ownerTab !== "ALL" && { ownerType: ownerTab }),
    }),
    [filter, ownerTab, selectedWalletId],
  );

  const { data, isLoading } = useWalletTransactions(query);
  const { data: overview, isLoading: isOverviewLoading } = useFinanceOverview();
  const { data: flowSummary, isLoading: isFlowLoading } =
    useTransactionFlowSummary({
      ...(filter.fromDate && { fromDate: filter.fromDate }),
      ...(filter.toDate && { toDate: filter.toDate }),
    });
  const { data: spending, isLoading: isSpendingLoading } = useCustomerSpending({
    page: spendingPage,
    limit: spendingLimit,
    ...(spendingSearch.trim() && { search: spendingSearch.trim() }),
  });

  const handleSelectCustomer = (customer: CustomerSpendingItem) => {
    setSelectedCustomer(customer);
    setOwnerTab("CUSTOMER");
    setFilter((current) => ({ ...current, page: 1 }));
  };

  const handleChangeTab = (tab: OwnerTab) => {
    setOwnerTab(tab);
    setSelectedCustomer(null);
    setFilter((current) => ({ ...current, page: 1 }));
  };

  const columns: Column<WalletTransaction>[] = [
    {
      key: "id",
      title: "Giao dịch",
      render: (transaction) => (
        <div>
          <p className="font-mono text-xs font-bold text-[var(--c-primary-strong)]">
            #{shortId(transaction.id)}
          </p>
          <p className="mt-0.5 max-w-60 truncate text-xs text-[var(--c-muted)]">
            {transaction.description || "Không có mô tả"}
          </p>
        </div>
      ),
    },
    {
      key: "wallet",
      title: "Chủ ví",
      hideOnMobile: true,
      render: (transaction) => {
        const ownerType = transaction.wallet?.ownerType;
        const badge = ownerType ? OWNER_BADGES[ownerType] : null;
        return (
          <div>
            <p className="text-xs font-semibold text-[var(--c-ink)]">
              {walletOwnerName(transaction)}
            </p>
            {badge && (
              <span
                className="mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold"
                style={{ background: `${badge.color}1a`, color: badge.color }}
              >
                {badge.label}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "type",
      title: "Loại giao dịch",
      hideOnMobile: true,
      render: (transaction) => (
        <span className="text-xs font-semibold text-[var(--c-ink)]">
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
            className="flex items-center gap-1.5 font-black"
            style={{ color: isCredit ? "#0E9F6E" : "#E11D48" }}
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
        <span className="text-xs font-semibold text-[var(--c-ink)]">
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
  ];

  const spendingColumns: Column<CustomerSpendingItem>[] = [
    {
      key: "fullName",
      title: "Khách hàng",
      render: (customer) => (
        <div>
          <p className="text-xs font-bold text-[var(--c-ink)]">
            {customer.fullName}
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--c-muted)]">
            {customer.email}
            {customer.phone ? ` · ${customer.phone}` : ""}
          </p>
        </div>
      ),
    },
    {
      key: "completedBookings",
      title: "Đơn hoàn thành",
      hideOnMobile: true,
      render: (customer) => (
        <span className="text-xs font-semibold text-[var(--c-ink)]">
          {customer.completedBookings}
        </span>
      ),
    },
    {
      key: "totalSpent",
      title: "Tổng chi tiêu",
      render: (customer) => (
        <span className="font-black text-[var(--c-primary-strong)]">
          {formatCurrency(customer.totalSpent)}
        </span>
      ),
    },
  ];

  const tabTriggerClass =
    "gap-2 rounded-xl py-2.5 text-sm font-semibold data-[state=active]:bg-[var(--c-card)] data-[state=active]:text-[var(--c-primary-strong)] data-[state=active]:shadow-sm";
  const pendingWithdrawals = overview?.pendingWithdrawals ?? 0;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Giao dịch, Ví & Rút tiền"
        description="Tổng quan dòng tiền, chi tiêu khách hàng, biến động số dư, danh sách ví và hàng chờ rút tiền của Tasker."
      />

      {/* Tổng quan toàn hệ thống — dùng chung cho cả hai tab */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={Wallet}
          label="Tổng số dư ví (gồm ví hệ thống)"
          tint="#0E9F6E"
          value={
            isOverviewLoading
              ? "…"
              : formatCurrency(overview?.totalWalletBalance ?? 0)
          }
        />
        <StatCard
          icon={Lock}
          label="Tiền đang tạm giữ"
          tint="#F59E0B"
          value={
            isOverviewLoading
              ? "…"
              : formatCurrency(overview?.totalHoldBalance ?? 0)
          }
        />
        <StatCard
          icon={HandCoins}
          label={`Chờ rút (${overview?.pendingWithdrawals ?? 0} yêu cầu)`}
          tint="#E11D48"
          value={
            isOverviewLoading
              ? "…"
              : formatCurrency(overview?.pendingWithdrawalAmount ?? 0)
          }
        />
      </div>

      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList className="grid h-auto w-full max-w-2xl grid-cols-3 rounded-2xl border border-[var(--c-line)] bg-[var(--c-card-2)] p-1.5">
          <TabsTrigger value="transactions" className={tabTriggerClass}>
            <ReceiptText className="size-4" />
            Giao dịch
          </TabsTrigger>
          <TabsTrigger value="wallets" className={tabTriggerClass}>
            <WalletCards className="size-4" />
            Ví
          </TabsTrigger>
          <TabsTrigger value="withdrawals" className={tabTriggerClass}>
            <BanknoteArrowDown className="size-4" />
            Rút tiền
            {pendingWithdrawals > 0 && (
              <span className="ml-0.5 rounded-full bg-[#E11D48] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white tabular-nums">
                {pendingWithdrawals}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="mt-0 space-y-4">
          {/* Dòng tiền theo khoảng ngày đang lọc */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={PiggyBank}
              label="Tổng nạp"
              tint="#0E9F6E"
              value={
                isFlowLoading
                  ? "…"
                  : formatCurrency(flowSummary?.totalDeposit ?? 0)
              }
            />
            <StatCard
              icon={CreditCard}
              label="Tổng thanh toán"
              tint="#2563EB"
              value={
                isFlowLoading
                  ? "…"
                  : formatCurrency(flowSummary?.totalPayment ?? 0)
              }
            />
            <StatCard
              icon={Undo2}
              label="Tổng hoàn tiền"
              tint="#F59E0B"
              value={
                isFlowLoading
                  ? "…"
                  : formatCurrency(flowSummary?.totalRefund ?? 0)
              }
            />
            <StatCard
              icon={HandCoins}
              label="Tổng rút"
              tint="#E11D48"
              value={
                isFlowLoading
                  ? "…"
                  : formatCurrency(flowSummary?.totalWithdraw ?? 0)
              }
            />
          </div>
          <p className="text-xs text-[var(--c-muted)]">
            Số liệu nạp / thanh toán / hoàn / rút tính theo khoảng ngày đang lọc
            ở bảng giao dịch bên dưới.
          </p>

          {/* Chi tiêu khách hàng */}
          <AdminCard className="space-y-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="flex items-center gap-1.5 text-sm font-bold text-[var(--c-ink)]">
                  <Users className="size-4 text-[var(--c-primary-strong)]" />
                  Chi tiêu khách hàng
                </h2>
                <p className="mt-0.5 text-xs text-[var(--c-muted)]">
                  Tổng giá trị các đơn đã hoàn thành (mọi phương thức thanh
                  toán), sắp theo chi tiêu giảm dần.
                </p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--c-muted)]" />
                <Input
                  value={spendingSearch}
                  onChange={(event) => {
                    setSpendingSearch(event.target.value);
                    setSpendingPage(1);
                  }}
                  placeholder="Tìm theo tên, email, SĐT..."
                  className="h-10 w-full rounded-full border-[var(--c-line)] bg-[var(--c-card)] pl-9 shadow-none"
                />
              </div>
            </div>

            <BaseTableList
              columns={spendingColumns}
              data={spending?.items ?? []}
              rowKey="customerId"
              totalItems={spending?.total ?? 0}
              page={spendingPage}
              limit={spendingLimit}
              onPageChange={setSpendingPage}
              onLimitChange={(limit) => {
                setSpendingLimit(limit);
                setSpendingPage(1);
              }}
              isLoading={isSpendingLoading}
              emptyTitle="Không tìm thấy khách hàng"
              emptyDescription="Thử từ khóa khác theo tên, email hoặc số điện thoại."
              emptyIcon={Users}
              rowActions={[
                {
                  type: "view",
                  label: "Xem giao dịch",
                  icon: Eye,
                  onClick: handleSelectCustomer,
                },
                {
                  type: "edit",
                  label: "Ví 360° Khách hàng",
                  icon: ExternalLink,
                  onClick: (cust) =>
                    router.push(`/admin/customers/${cust.customerId}`),
                },
              ]}
            />
          </AdminCard>

          {/* Card customer đang chọn */}
          {selectedCustomer && (
            <AdminCard className="flex flex-wrap items-center justify-between gap-3 border-[var(--c-primary-strong)]/30 p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--c-muted)]">
                  Đang xem giao dịch của
                </p>
                <p className="mt-0.5 text-sm font-bold text-[var(--c-ink)]">
                  {selectedCustomer.fullName}
                  <span className="ml-2 text-xs font-medium text-[var(--c-muted)]">
                    {selectedCustomer.email}
                  </span>
                </p>
                <p className="mt-1 text-sm">
                  Tổng chi tiêu:{" "}
                  <span className="font-black text-[var(--c-primary-strong)]">
                    {formatCurrency(selectedCustomer.totalSpent)}
                  </span>
                  <span className="ml-2 text-xs text-[var(--c-muted)]">
                    {selectedCustomer.completedBookings} đơn hoàn thành
                  </span>
                </p>
                {!selectedCustomer.walletId && (
                  <p className="mt-1 text-xs text-amber-600">
                    Khách này chưa có Ví CleanZ nên không có giao dịch ví — bảng
                    dưới đang hiển thị theo tab loại ví.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="flex items-center gap-1 rounded-full border border-[var(--c-line)] px-3 py-1.5 text-xs font-semibold text-[var(--c-muted)] transition-colors hover:text-[var(--c-ink)]"
              >
                <X className="size-3.5" />
                Bỏ chọn
              </button>
            </AdminCard>
          )}

          {/* Tabs theo loại ví */}
          <div className="flex flex-wrap gap-2">
            {OWNER_TABS.map((tab) => {
              const active = ownerTab === tab.value && !selectedWalletId;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => handleChangeTab(tab.value)}
                  className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${
                    active
                      ? "bg-[var(--c-primary-strong)] text-white"
                      : "border border-[var(--c-line)] bg-[var(--c-card)] text-[var(--c-muted)] hover:text-[var(--c-ink)]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
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
                  <SelectTrigger className="h-10 w-full rounded-full border-[var(--c-line)] bg-[var(--c-card)] shadow-none">
                    <ListFilter className="size-4 text-[var(--c-muted)]" />
                    <SelectValue placeholder="Loại giao dịch" />
                  </SelectTrigger>
                  <SelectContent className="cz-admin rounded-xl">
                    <SelectItem value="ALL">Tất cả giao dịch</SelectItem>
                    {TRANSACTION_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {TRANSACTION_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="relative w-full">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--c-muted)]" />
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
                    className="h-10 w-full rounded-full border-[var(--c-line)] bg-[var(--c-card)] pl-9 shadow-none"
                  />
                </div>

                <div className="relative w-full">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--c-muted)]" />
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
                    className="h-10 w-full rounded-full border-[var(--c-line)] bg-[var(--c-card)] pl-9 shadow-none"
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
        </TabsContent>

        <TabsContent value="wallets" className="mt-0">
          <WalletManagement embedded />
        </TabsContent>

        <TabsContent value="withdrawals" className="mt-0">
          <UnifiedWithdrawalManagement embedded />
        </TabsContent>
      </Tabs>

      <TransactionDetailDrawer
        transaction={selectedTransaction}
        open={Boolean(selectedTransaction)}
        onClose={() => setSelectedTransaction(null)}
      />
    </div>
  );
}
