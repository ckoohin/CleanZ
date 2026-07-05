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
  Loader2,
  PlusCircle,
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
  useCreateTaskerTopup,
  useCreateTaskerWithdrawal,
  useTaskerWallet,
  useTaskerWalletTransactions,
} from "@/features/tasker/hooks/useTaskerWallet";
import type {
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
  DEPOSIT_RELEASE: "Hoàn giữ tiền",
  DEPOSIT_DEDUCT: "Khấu trừ",
  CANCELLATION_FEE: "Phí hủy",
  ADJUSTMENT: "Điều chỉnh",
};

const TOPUP_MIN = 10_000;
const TOPUP_QUICK = [50_000, 100_000, 200_000, 500_000];
const WITHDRAW_MIN = 1_000;

const formatCurrency = (value: number | undefined) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value ?? 0);

const TX_LIMIT = 10;

export default function TaskerEarningsPage() {
  const [withdrawalOpen, setWithdrawalOpen] = useState(false);
  const [topupOpen, setTopupOpen] = useState(false);
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
    useTaskerWalletTransactions();

  const balance = Number(wallet?.balance ?? 0);

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
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-5 md:p-8">
      <div>
        <h1
          className="text-3xl font-light"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Ví <span className="italic text-primary">của tôi</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Nạp tiền để nhận đơn, rút thu nhập và xem lịch sử giao dịch.
        </p>
      </div>

      {/* Thẻ số dư */}
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-800 to-slate-950 p-6 text-white shadow-xl">
        <div className="absolute -right-12 -top-16 size-48 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-white/70">
              <WalletCards className="size-5" />
              Số dư ví
            </div>
            <Badge className="border-white/15 bg-white/10 text-white">
              Khả dụng
            </Badge>
          </div>
          {walletLoading ? (
            <Skeleton className="mt-6 h-11 w-52 bg-white/15" />
          ) : (
            <p className="mt-6 text-4xl font-black tracking-tight">
              {formatCurrency(balance)}
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

      {/* Hành động: Nạp / Rút — mobile-first, 2 nút chia đôi */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          size="lg"
          className="h-14 rounded-2xl text-base"
          onClick={() => setTopupOpen(true)}
        >
          <PlusCircle className="size-5" />
          Nạp tiền
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="h-14 rounded-2xl text-base"
          onClick={() => setWithdrawalOpen(true)}
          disabled={balance <= 0}
        >
          <BanknoteArrowDown className="size-5" />
          Rút tiền
        </Button>
      </div>

      {recentRequest && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 sm:flex-row sm:items-center">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
            <Clock3 className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-bold">Yêu cầu rút đang chờ duyệt</p>
              <Badge className="bg-amber-500/10 text-amber-700">PENDING</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatCurrency(Number(recentRequest.amount))} ·{" "}
              {recentRequest.bankName || "Ngân hàng trong hồ sơ"} ·{" "}
              {new Date(recentRequest.createdAt).toLocaleString("vi-VN")}
            </p>
          </div>
          <CheckCircle2 className="size-5 shrink-0 text-amber-600" />
        </div>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <History className="size-5 text-primary" />
              Lịch sử giao dịch
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
              <TransactionRow key={transaction.id} transaction={transaction} />
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-12 text-center">
              <CreditCard className="mx-auto size-9 text-muted-foreground/50" />
              <p className="mt-3 font-bold">
                {hasFilter ? "Không có giao dịch trong khoảng này" : "Chưa có giao dịch"}
              </p>
              <p className="text-sm text-muted-foreground">
                Nạp tiền hoặc thu nhập từ booking sẽ xuất hiện tại đây.
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

      <TopupDialog open={topupOpen} onClose={() => setTopupOpen(false)} />

      {wallet && (
        <WithdrawalDialog
          open={withdrawalOpen}
          balance={balance}
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

function TransactionRow({
  transaction,
}: {
  transaction: TaskerWalletTransaction;
}) {
  const isCredit =
    Number(transaction.balanceAfter) >= Number(transaction.balanceBefore);
  const Icon = isCredit ? ArrowDownLeft : ArrowUpRight;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/40 bg-card p-4">
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
    </div>
  );
}

function TopupDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState("");
  const mutation = useCreateTaskerTopup();

  const amountNum = Number(amount);
  const valid = Number.isInteger(amountNum) && amountNum >= TOPUP_MIN;

  const submit = () => {
    if (!valid) {
      toast.error(`Số tiền nạp tối thiểu ${formatCurrency(TOPUP_MIN)}`);
      return;
    }
    mutation.mutate(
      { amountVnd: amountNum },
      {
        onSuccess: (result) => {
          if (result.approveUrl) {
            // Chuyển sang PayPal để thanh toán.
            window.location.href = result.approveUrl;
          } else {
            toast.error("Không lấy được link thanh toán, thử lại sau");
          }
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="size-5 text-primary" />
            Nạp tiền vào ví
          </DialogTitle>
          <DialogDescription>
            Thanh toán an toàn qua PayPal. Sau khi thanh toán xong, số dư ví sẽ
            được cộng tự động.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">
              Số tiền cần nạp
            </label>
            <div className="relative">
              <Input
                type="number"
                inputMode="numeric"
                min={TOPUP_MIN}
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
            <div className="flex flex-wrap gap-2 pt-1">
              {TOPUP_QUICK.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAmount(String(value))}
                  className="rounded-full border px-3 py-1 text-xs text-muted-foreground transition hover:bg-muted"
                >
                  {value.toLocaleString("vi-VN")}
                </button>
              ))}
            </div>
            {amount !== "" && !valid && (
              <p className="text-xs text-destructive">
                Số tiền phải là số nguyên, tối thiểu{" "}
                {TOPUP_MIN.toLocaleString("vi-VN")}đ.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-primary/15 bg-primary/5 p-3 text-sm text-foreground/80">
            PayPal tính bằng USD nên số tiền sẽ được quy đổi theo tỷ giá hệ
            thống. Bạn sẽ được chuyển sang trang PayPal để hoàn tất.
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            Hủy
          </Button>
          <Button
            className="rounded-full"
            onClick={submit}
            disabled={mutation.isPending || !valid}
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Đang chuyển...
              </>
            ) : (
              "Tiếp tục với PayPal"
            )}
          </Button>
        </DialogFooter>
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
    if (!Number.isFinite(numericAmount) || numericAmount < WITHDRAW_MIN) {
      toast.error(`Số tiền rút tối thiểu ${formatCurrency(WITHDRAW_MIN)}`);
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
