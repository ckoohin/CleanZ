"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BanknoteArrowDown,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  CircleDollarSign,
  History,
  ListChecks,
  LockKeyhole,
  Plus,
  ReceiptText,
  ShieldCheck,
  WalletCards,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateTaskerWithdrawal,
  useTaskerEarningsSummary,
  useTaskerDepositTransactions,
  useTaskerWallet,
  useTaskerWalletTransactions,
} from "@/features/tasker/hooks/useTaskerWallet";
import { useTaskerCompletedBookings } from "@/features/booking/hooks/useTaskerBooking";
import { TaskerTopupDialog } from "@/features/tasker/_components/TaskerTopupDialog";
import { TaskerEarningsChart } from "@/features/tasker/_components/TaskerEarningsChart";
import type {
  TaskerEarningsPeriod,
  TaskerDepositTransaction,
  TaskerWalletTransaction,
  TaskerWithdrawalRequest,
} from "@/features/tasker/types/tasker-wallet.types";
import { toast } from "sonner";

const TRANSACTION_LABELS: Record<string, string> = {
  DEPOSIT: "Nạp tiền",
  WITHDRAW: "Rút tiền",
  PAYMENT: "Thanh toán",
  REFUND: "Hoàn tiền",
  PLATFORM_FEE: "Phí nền tảng",
  TASKER_EARNING: "Thu nhập công việc",
  DEPOSIT_HOLD: "Giữ tiền",
  DEPOSIT_RELEASE: "Hoàn ký quỹ",
  DEPOSIT_DEDUCT: "Khấu trừ ký quỹ",
  CANCELLATION_FEE: "Phí hủy",
  ADJUSTMENT: "Điều chỉnh",
};

const formatCurrency = (value: number | undefined) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value ?? 0);

const TX_LIMIT = 10;

export default function TaskerEarningsPage() {
  const [activeSection, setActiveSection] = useState<"income" | "wallet">(
    "income",
  );
  const [withdrawalOpen, setWithdrawalOpen] = useState(false);
  const [topupOpen, setTopupOpen] = useState(false);
  const [completedOpen, setCompletedOpen] = useState(false);
  const [selectedEarningsPeriod, setSelectedEarningsPeriod] =
    useState<TaskerEarningsPeriod | null>(null);
  const [showWalletHistory, setShowWalletHistory] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<TaskerWalletTransaction | null>(null);
  const [recentRequest, setRecentRequest] =
    useState<TaskerWithdrawalRequest | null>(null);
  const [txPage, setTxPage] = useState(1);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const txQuery = {
    page: txPage,
    limit: TX_LIMIT,
    ...(fromDate && { fromDate }),
    ...(toDate && { toDate }),
  };

  const { data: wallet, isLoading: walletLoading } = useTaskerWallet();
  const { data: earningsSummary, isLoading: earningsSummaryLoading } =
    useTaskerEarningsSummary();
  const walletHistoryEnabled = activeSection === "wallet" && showWalletHistory;
  const { data: transactions, isLoading: transactionsLoading } =
    useTaskerWalletTransactions(txQuery, walletHistoryEnabled);
  const { data: depositTransactions, isLoading: depositTransactionsLoading } =
    useTaskerDepositTransactions(walletHistoryEnabled);

  const totalPages = transactions?.totalPages ?? 1;
  const hasFilter = Boolean(fromDate || toDate);

  const resetFilter = () => {
    setFromDate("");
    setToDate("");
    setTxPage(1);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-5 md:p-8">
      <div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Thu <span className="text-primary">nhập</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Theo dõi tiền công và quản lý ví Tasker tại một nơi.
          </p>
        </div>
      </div>

      <div
        className="grid grid-cols-2 rounded-2xl bg-muted p-1"
        role="tablist"
        aria-label="Nội dung thu nhập và ví"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeSection === "income"}
          onClick={() => setActiveSection("income")}
          className={`h-11 rounded-xl text-sm font-bold transition-all ${
            activeSection === "income"
              ? "bg-card text-primary shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Thu nhập
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeSection === "wallet"}
          onClick={() => setActiveSection("wallet")}
          className={`h-11 rounded-xl text-sm font-bold transition-all ${
            activeSection === "wallet"
              ? "bg-card text-primary shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Ví
        </button>
      </div>

      {activeSection === "income" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <IncomeMetricCard
              label="Hôm nay"
              value={earningsSummary?.today}
              loading={earningsSummaryLoading}
              selected={selectedEarningsPeriod === "today"}
              onClick={() => setSelectedEarningsPeriod("today")}
            />
            <IncomeMetricCard
              label="Tuần này"
              value={earningsSummary?.week}
              loading={earningsSummaryLoading}
              selected={selectedEarningsPeriod === "week"}
              onClick={() => setSelectedEarningsPeriod("week")}
            />
            <IncomeMetricCard
              label="Tháng này"
              value={earningsSummary?.month}
              loading={earningsSummaryLoading}
              selected={selectedEarningsPeriod === "month"}
              onClick={() => setSelectedEarningsPeriod("month")}
            />
            <IncomeMetricCard
              label="Năm nay"
              value={earningsSummary?.year}
              loading={earningsSummaryLoading}
              selected={selectedEarningsPeriod === "year"}
              onClick={() => setSelectedEarningsPeriod("year")}
            />
          </div>

          {selectedEarningsPeriod && (
            <TaskerEarningsChart
              key={selectedEarningsPeriod}
              period={selectedEarningsPeriod}
              onClose={() => setSelectedEarningsPeriod(null)}
            />
          )}

          {/* <button
            type="button"
            onClick={() => setCompletedOpen(true)}
            className="flex w-full items-center gap-4 rounded-2xl border border-border/60 bg-card p-5 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <ListChecks className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-muted-foreground">
                Số đơn đã hoàn tất
              </p>
              {earningsSummaryLoading ? (
                <Skeleton className="mt-1 h-7 w-20" />
              ) : (
                <p className="text-2xl font-black">
                  {earningsSummary?.completedBookings ?? 0} đơn
                </p>
              )}
            </div>
            <span className="flex items-center gap-1 text-xs font-bold text-primary">
              Xem danh sách <ChevronRight className="size-4" />
            </span>
          </button> */}
        </div>
      )}

      {activeSection === "wallet" && (
        <>
          <div className="grid gap-4 lg:grid-cols-[1.45fr_1fr]">
            <div className="space-y-4">
              {/* <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-800 to-slate-950 p-6 text-white shadow-xl">
                <div className="absolute -right-12 -top-16 size-48 rounded-full bg-primary/20 blur-3xl" />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-white/70">
                      <WalletCards className="size-5" />
                      Tổng số dư ví
                    </div>
                    <Badge className="border-white/15 bg-white/10 text-white">
                      Ví Tasker
                    </Badge>
                  </div>
                  {walletLoading ? (
                    <Skeleton className="mt-6 h-10 w-52 bg-white/15" />
                  ) : (
                    <p className="mt-6 text-4xl font-black tracking-tight">
                      {formatCurrency(Number(wallet?.balance ?? 0))}
                    </p>
                  )}
                  <div className="mt-8 flex items-center justify-between text-xs text-white/60">
                    <span>Số dư có thể rút</span>
                    <span className="font-bold text-white">
                      {formatCurrency(Number(wallet?.withdrawableBalance ?? 0))}
                    </span>
                  </div>
                </div>
              </div> */}
<div className="rounded-[28px] border border-border/50 bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-600">
                    <ShieldCheck className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Số dư có thể rút</p>
                    {/* <p className="text-xs text-muted-foreground">
                      Phần giữ lại để tiếp tục nhận đơn
                    </p> */}
                  </div>
                </div>
                {/* <LockKeyhole className="size-4 text-muted-foreground" /> */}
              </div>
              {walletLoading ? (
                <Skeleton className="mt-5 h-8 w-36" />
              ) : (
                <>
                  <p className="mt-5 text-2xl font-black">
                    {formatCurrency(Number(wallet?.withdrawableBalance ?? 0))}
                  </p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-amber-500"
                      style={{
                        width: `${Math.min(
                          100,
                          (Number(wallet?.balance ?? 0) /
                            Math.max(
                              Number(wallet?.minAcceptBalance ?? 1),
                              1,
                            )) *
                            100,
                        )}%`,
                      }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                    <span>Phải giữ tối thiểu để nhận đơn</span>
                    <span>
                      {formatCurrency(Number(wallet?.minAcceptBalance ?? 0))}
                    </span>
                  </div>
                </>
              )}
            </div>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setTopupOpen(true)}
                  className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card p-3 text-center transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                    <Plus className="size-5" />
                  </span>
                  <span className="text-xs font-bold sm:text-sm">Nạp tiền</span>
                </button>
                <button
                  type="button"
                  onClick={() => setWithdrawalOpen(true)}
                  disabled={
                    !wallet ||
                    Number(wallet.withdrawableBalance ?? wallet.balance) <= 0
                  }
                  className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card p-3 text-center transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="flex size-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600">
                    <BanknoteArrowDown className="size-5" />
                  </span>
                  <span className="text-xs font-bold sm:text-sm">Rút tiền</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowWalletHistory(true)}
                  className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card p-3 text-center transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  <span className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                    <ReceiptText className="size-5" />
                  </span>
                  <span className="text-xs font-bold leading-tight sm:text-sm">
                    Kiểm tra lịch sử giao dịch
                  </span>
                </button>
              </div>
            </div>

            
          </div>

          {recentRequest && (
            <div className="flex flex-col gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 sm:flex-row sm:items-center">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                <Clock3 className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold">Yêu cầu đang chờ duyệt</p>
                  <Badge className="bg-amber-500/10 text-amber-700">
                    PENDING
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatCurrency(Number(recentRequest.amount))} ·{" "}
                  {recentRequest.bankName || "Ngân hàng trong hồ sơ"} ·{" "}
                  {new Date(recentRequest.createdAt).toLocaleString("vi-VN")}
                </p>
              </div>
              <CheckCircle2 className="size-5 text-amber-600" />
            </div>
          )}
        </>
      )}

      {activeSection === "wallet" && showWalletHistory && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <History className="size-5 text-primary" />
                Lịch sử giao dịch ví
              </h2>
            </div>
            <Badge variant="outline" className="rounded-full">
              {transactions?.total ?? 0} giao dịch
            </Badge>
          </div>

          {/* Date filter */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[140px]">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setTxPage(1);
                }}
                className="h-9 rounded-full pl-9 text-sm"
                aria-label="Từ ngày"
              />
            </div>
            <div className="relative flex-1 min-w-[140px]">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setTxPage(1);
                }}
                className="h-9 rounded-full pl-9 text-sm"
                aria-label="Đến ngày"
              />
            </div>
            {hasFilter && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 rounded-full px-3 text-muted-foreground"
                onClick={resetFilter}
              >
                <X className="size-4" />
                Xóa
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {transactionsLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-20 rounded-2xl" />
              ))
            ) : transactions?.items.length ? (
              transactions.items.map((transaction) => (
                <TransactionRow
                  key={transaction.id}
                  transaction={transaction}
                  onClick={() => setSelectedTransaction(transaction)}
                />
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-12 text-center">
                <CreditCard className="mx-auto size-9 text-muted-foreground/50" />
                <p className="mt-3 font-bold">
                  {hasFilter
                    ? "Không có giao dịch trong khoảng này"
                    : "Chưa có giao dịch"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {hasFilter
                    ? "Thử chọn khoảng ngày khác."
                    : "Biến động số dư sẽ xuất hiện tại đây."}
                </p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                disabled={txPage <= 1}
                onClick={() => setTxPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-4" />
                Trước
              </Button>
              <span className="text-sm text-muted-foreground">
                Trang {txPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                disabled={txPage >= totalPages}
                onClick={() => setTxPage((p) => Math.min(totalPages, p + 1))}
              >
                Tiếp
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
        </section>
      )}

      {/* Ký quỹ đã bỏ (gộp vào ví) — chỉ hiện khi tài khoản còn lịch sử cũ. */}
      {activeSection === "wallet" &&
        showWalletHistory &&
        !depositTransactionsLoading &&
        !!depositTransactions?.length && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold">
                  <ShieldCheck className="size-5 text-amber-600" />
                  Lịch sử ký quỹ (cũ)
                </h2>
                <p className="text-xs text-muted-foreground">
                  Ký quỹ đã được gộp vào ví — mục này chỉ để tra cứu.
                </p>
              </div>
              <Badge variant="outline" className="rounded-full">
                {depositTransactions.length} giao dịch
              </Badge>
            </div>

            <div className="space-y-2">
              {depositTransactions.map((transaction) => (
                <DepositTransactionRow
                  key={transaction.id}
                  transaction={transaction}
                />
              ))}
            </div>
          </section>
        )}

      <TransactionDetailDialog
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
      />

      <TaskerTopupDialog open={topupOpen} onClose={() => setTopupOpen(false)} />

      <CompletedBookingsDialog
        open={completedOpen}
        total={earningsSummary?.completedBookings ?? 0}
        onClose={() => setCompletedOpen(false)}
      />

      {wallet && (
        <WithdrawalDialog
          open={withdrawalOpen}
          balance={Number(wallet.withdrawableBalance ?? wallet.balance)}
          onClose={() => setWithdrawalOpen(false)}
          onCreated={(request) => {
            setRecentRequest(request);
            setWithdrawalOpen(false);
          }}
        />
      )}
    </div>
  );
}

function IncomeMetricCard({
  label,
  value,
  loading,
  selected = false,
  onClick,
}: {
  label: string;
  value?: number;
  loading: boolean;
  selected?: boolean;
  onClick?: () => void;
}) {
  const content = (
    <>
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <CircleDollarSign className="size-4 text-primary" />
        {label}
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-7 w-28" />
      ) : (
        <p className="mt-3 text-lg font-black tracking-tight sm:text-xl">
          {formatCurrency(value)}
        </p>
      )}
      {onClick && (
        <p className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-primary">
          Xem thêm <ChevronRight className="size-3" />
        </p>
      )}
    </>
  );

  if (!onClick) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-4 text-left shadow-sm">
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`rounded-2xl border bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/50 hover:bg-primary/5 ${
        selected ? "border-primary ring-2 ring-primary/10" : "border-border/60"
      }`}
    >
      {content}
    </button>
  );
}

function CompletedBookingsDialog({
  open,
  total,
  onClose,
}: {
  open: boolean;
  total: number;
  onClose: () => void;
}) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useTaskerCompletedBookings(page, 8, open);
  const totalPages = data?.totalPages ?? 1;

  const close = () => {
    setPage(1);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-2xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Đơn đã hoàn tất</DialogTitle>
          <DialogDescription>
            Tổng cộng {total} đơn đã được hoàn thành.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-24 rounded-2xl" />
            ))
          ) : data?.items.length ? (
            data.items.map((booking) => (
              <Link
                key={booking.id}
                href={`/tasker/jobs/${booking.id}`}
                onClick={close}
                className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                  <CheckCircle2 className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">
                    {booking.service.name}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {booking.bookingCode} ·{" "}
                    {booking.schedule.scheduledStartDate ?? "—"}{" "}
                    {booking.schedule.scheduledStartTime
                      ? `· ${booking.schedule.scheduledStartTime.slice(0, 5)}`
                      : ""}
                  </p>
                  {booking.completedAt && (
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Hoàn tất{" "}
                      {new Date(booking.completedAt).toLocaleString("vi-VN")}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[10px] text-muted-foreground">
                    Giá trị đơn
                  </p>
                  <p className="text-sm font-black text-primary">
                    {formatCurrency(booking.totalPrice)}
                  </p>
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center">
              <ListChecks className="mx-auto size-9 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">
                Chưa có đơn nào đã hoàn tất.
              </p>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border pt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <ChevronLeft className="size-4" /> Trước
            </Button>
            <span className="text-xs text-muted-foreground">
              Trang {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
            >
              Tiếp <ChevronRight className="size-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DepositTransactionRow({
  transaction,
}: {
  transaction: TaskerDepositTransaction;
}) {
  const isCredit =
    Number(transaction.balanceAfter) >= Number(transaction.balanceBefore);
  const Icon = isCredit ? ArrowDownLeft : ArrowUpRight;
  const label =
    transaction.type === "CASH_COMMISSION_DEDUCT"
      ? "Phí nền tảng từ ký quỹ"
      : transaction.type === "TERMINATION_REFUND"
        ? "Hoàn ký quỹ khi nghỉ việc"
        : transaction.type === "TOP_UP"
          ? "Nạp bổ sung ký quỹ"
          : "Khấu trừ ký quỹ";

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-card p-4">
      <div
        className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${
          isCredit
            ? "bg-emerald-500/10 text-emerald-600"
            : "bg-amber-500/10 text-amber-600"
        }`}
      >
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{label}</p>
        <p className="truncate text-xs text-muted-foreground">
          {transaction.description || "Biến động số dư ký quỹ"}
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          {new Date(transaction.createdAt).toLocaleString("vi-VN")}
        </p>
      </div>
      <div className="text-right">
        <p
          className={`font-black ${
            isCredit ? "text-emerald-600" : "text-amber-600"
          }`}
        >
          {isCredit ? "+" : "-"}
          {formatCurrency(Math.abs(Number(transaction.amount)))}
        </p>
        <p className="text-[10px] text-muted-foreground">
          Cọc còn {formatCurrency(Number(transaction.balanceAfter))}
        </p>
      </div>
    </div>
  );
}

function TransactionRow({
  transaction,
  onClick,
}: {
  transaction: TaskerWalletTransaction;
  onClick: () => void;
}) {
  const isCredit =
    Number(transaction.balanceAfter) >= Number(transaction.balanceBefore);
  const Icon = isCredit ? ArrowDownLeft : ArrowUpRight;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-border/40 bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/30"
    >
      <div
        className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${
          isCredit
            ? "bg-emerald-500/10 text-emerald-600"
            : "bg-red-500/10 text-red-600"
        }`}
      >
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">
          {TRANSACTION_LABELS[transaction.type] ?? transaction.type}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {transaction.description || "Không có mô tả"}
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          {new Date(transaction.createdAt).toLocaleString("vi-VN")}
        </p>
      </div>
      <div className="text-right">
        <p
          className={`font-black ${
            isCredit ? "text-emerald-600" : "text-red-600"
          }`}
        >
          {isCredit ? "+" : "-"}
          {formatCurrency(Math.abs(Number(transaction.amount)))}
        </p>
        <p className="text-[10px] text-muted-foreground">
          Còn {formatCurrency(Number(transaction.balanceAfter))}
        </p>
      </div>
    </button>
  );
}

/**
 * Ledger chỉ ghi MỘT bút toán cho mỗi đơn: đơn ví ghi thu nhập đã trừ ngầm
 * chiết khấu, đơn tiền mặt ghi mỗi khoản khấu trừ — nên phần đối soát phải suy
 * ra: tổng công = khách trả + voucher nền tảng chịu; chiết khấu = tổng công −
 * thực nhận.
 */
function getSettlement(transaction: TaskerWalletTransaction): {
  customerPaid: number;
  voucherCovered: number;
  subtotal: number;
  fee: number;
  netEarning: number;
  isCash: boolean;
} | null {
  const booking = transaction.booking;
  if (!booking) return null;
  if (
    transaction.type !== "TASKER_EARNING" &&
    transaction.type !== "PLATFORM_FEE"
  ) {
    return null;
  }

  const customerPaid = Number(booking.totalPrice);
  const voucherCovered = Number(booking.discountAmount ?? 0);
  const subtotal = customerPaid + voucherCovered;
  const amount = Math.abs(Number(transaction.amount));
  const isCash = transaction.type === "PLATFORM_FEE";
  const fee = isCash ? amount : Math.max(subtotal - amount, 0);
  const netEarning = isCash ? Math.max(subtotal - fee, 0) : amount;

  return { customerPaid, voucherCovered, subtotal, fee, netEarning, isCash };
}

function BreakdownRow({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold ${className}`}>{value}</span>
    </div>
  );
}

function TransactionDetailDialog({
  transaction,
  onClose,
}: {
  transaction: TaskerWalletTransaction | null;
  onClose: () => void;
}) {
  if (!transaction) return null;

  const isCredit =
    Number(transaction.balanceAfter) >= Number(transaction.balanceBefore);
  const settlement = getSettlement(transaction);

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {TRANSACTION_LABELS[transaction.type] ?? transaction.type}
          </DialogTitle>
          <DialogDescription>
            {new Date(transaction.createdAt).toLocaleString("vi-VN")}
            {transaction.booking?.bookingCode
              ? ` · Đơn ${transaction.booking.bookingCode}`
              : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div
            className={`rounded-2xl p-4 text-center ${
              isCredit
                ? "bg-emerald-500/10 text-emerald-600"
                : "bg-red-500/10 text-red-600"
            }`}
          >
            <p className="text-2xl font-black">
              {isCredit ? "+" : "-"}
              {formatCurrency(Math.abs(Number(transaction.amount)))}
            </p>
            <p className="mt-1 text-xs opacity-80">
              Số dư: {formatCurrency(Number(transaction.balanceBefore))} →{" "}
              {formatCurrency(Number(transaction.balanceAfter))}
            </p>
          </div>

          {settlement && (
            <div className="space-y-2 rounded-2xl border border-border/50 p-4">
              <p className="text-sm font-bold">Đối soát đơn</p>
              <BreakdownRow
                label="Khách trả"
                value={formatCurrency(settlement.customerPaid)}
              />
              {settlement.voucherCovered > 0 && (
                <BreakdownRow
                  label="Khuyến mãi"
                  value={`+${formatCurrency(settlement.voucherCovered)}`}
                />
              )}
              <BreakdownRow
                label="Tổng công"
                value={formatCurrency(settlement.subtotal)}
                className="font-black"
              />
              <BreakdownRow
                label="Chiết khấu nền tảng"
                value={`-${formatCurrency(settlement.fee)}`}
                className="text-red-600"
              />
              <BreakdownRow
                label="Thực nhận"
                value={formatCurrency(settlement.netEarning)}
                className="font-black text-emerald-600"
              />
              {settlement.isCash && (
                <p className="pt-1 text-xs text-muted-foreground">
                  Đơn tiền mặt: bạn đã thu{" "}
                  {formatCurrency(settlement.customerPaid)} trực tiếp từ khách,
                  chiết khấu được khấu trừ vào ví.
                </p>
              )}
            </div>
          )}

          {transaction.description && (
            <p className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
              {transaction.description}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WithdrawalDialog({
  open,
  balance,
  onClose,
  onCreated,
}: {
  open: boolean;
  balance: number;
  onClose: () => void;
  onCreated: (request: TaskerWithdrawalRequest) => void;
}) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const mutation = useCreateTaskerWithdrawal();

  const submit = () => {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      toast.error("Vui lòng nhập số tiền hợp lệ");
      return;
    }
    if (numericAmount > balance) {
      toast.error("Số tiền vượt quá số dư ví");
      return;
    }

    mutation.mutate(
      {
        amount: numericAmount,
        note: note.trim() || undefined,
      },
      {
        onSuccess: (request) => {
          setAmount("");
          setNote("");
          onCreated(request);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BanknoteArrowDown className="size-5 text-primary" />
            Gửi yêu cầu rút tiền
          </DialogTitle>
          <DialogDescription>
            Số dư khả dụng: {formatCurrency(balance)}. Tiền sẽ được chuyển đến
            tài khoản ngân hàng đã xác minh trong hồ sơ Tasker.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">
              Số tiền cần rút
            </label>
            <div className="relative">
              <Input
                type="number"
                min={1}
                max={balance}
                step={1000}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="Nhập số tiền"
                className="rounded-xl pr-14"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                VND
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto rounded-full px-2 py-1 text-xs text-primary"
              onClick={() => setAmount(String(balance))}
            >
              Rút toàn bộ
            </Button>
          </div>

          <div className="rounded-xl border border-primary/15 bg-primary/5 p-3 text-sm text-foreground/80">
            Thông tin ngân hàng được lấy tự động từ hồ sơ. Nếu cần thay đổi, hãy
            cập nhật hồ sơ Tasker trước khi gửi yêu cầu.
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">
              Ghi chú
            </label>
            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Nội dung bổ sung nếu có..."
              className="rounded-xl"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" className="rounded-full" onClick={onClose}>
            Hủy
          </Button>
          <Button
            className="rounded-full"
            onClick={submit}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Đang gửi..." : "Gửi yêu cầu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
