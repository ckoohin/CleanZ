"use client";

import { useMemo, useState } from "react";
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
  History,
  LockKeyhole,
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
  useTaskerDepositTransactions,
  useTaskerWallet,
  useTaskerWalletTransactions,
} from "@/features/tasker/hooks/useTaskerWallet";
import type {
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
  const [withdrawalOpen, setWithdrawalOpen] = useState(false);
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
  const { data: transactions, isLoading: transactionsLoading } =
    useTaskerWalletTransactions(txQuery);
  const { data: depositTransactions, isLoading: depositTransactionsLoading } =
    useTaskerDepositTransactions();

  const totalPages = transactions?.totalPages ?? 1;
  const hasFilter = Boolean(fromDate || toDate);

  const resetFilter = () => {
    setFromDate("");
    setToDate("");
    setTxPage(1);
  };

  const totalIncome = useMemo(
    () =>
      transactions?.items
        .filter((transaction) => transaction.type === "TASKER_EARNING")
        .reduce(
          (total, transaction) => total + Number(transaction.amount),
          0,
        ) ?? 0,
    [transactions],
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-5 md:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1
            className="text-3xl font-light"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Thu <span className="italic text-primary">nhập</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Quản lý ví thu nhập và yêu cầu rút tiền.
          </p>
        </div>
        <Button
          className="rounded-full"
          onClick={() => setWithdrawalOpen(true)}
          disabled={
            !wallet ||
            Number(wallet.withdrawableBalance ?? wallet.balance) <= 0
          }
        >
          <BanknoteArrowDown className="size-4" />
          Yêu cầu rút tiền
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.45fr_1fr]">
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-800 to-slate-950 p-6 text-white shadow-xl">
          <div className="absolute -right-12 -top-16 size-48 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-white/70">
                <WalletCards className="size-5" />
                Ví thu nhập khả dụng
              </div>
              <Badge className="border-white/15 bg-white/10 text-white">
                Có thể rút
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
              <span>Tổng thu nhập ghi nhận</span>
              <span className="font-bold text-white">
                {formatCurrency(totalIncome)}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-border/50 bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-600">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <p className="text-sm font-bold">Số dư có thể rút</p>
                <p className="text-xs text-muted-foreground">
                  Phần giữ lại để tiếp tục nhận đơn
                </p>
              </div>
            </div>
            <LockKeyhole className="size-4 text-muted-foreground" />
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
                        Math.max(Number(wallet?.minAcceptBalance ?? 1), 1)) *
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
      </div>

      {recentRequest && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 sm:flex-row sm:items-center">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
            <Clock3 className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-bold">Yêu cầu đang chờ duyệt</p>
              <Badge className="bg-amber-500/10 text-amber-700">PENDING</Badge>
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

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <History className="size-5 text-primary" />
              Lịch sử ví thu nhập
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
              onChange={(e) => { setFromDate(e.target.value); setTxPage(1); }}
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
              onChange={(e) => { setToDate(e.target.value); setTxPage(1); }}
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
                {hasFilter ? "Không có giao dịch trong khoảng này" : "Chưa có giao dịch"}
              </p>
              <p className="text-sm text-muted-foreground">
                {hasFilter ? "Thử chọn khoảng ngày khác." : "Thu nhập từ các booking online sẽ xuất hiện tại đây."}
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

      {/* Ký quỹ đã bỏ (gộp vào ví) — chỉ hiện khi tài khoản còn lịch sử cũ. */}
      {!depositTransactionsLoading && !!depositTransactions?.length && (
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
                  label="Voucher nền tảng chịu"
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
                label="Bạn thực nhận"
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
