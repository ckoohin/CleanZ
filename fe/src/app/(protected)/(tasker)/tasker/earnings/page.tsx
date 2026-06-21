"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BanknoteArrowDown,
  CheckCircle2,
  Clock3,
  CreditCard,
  History,
  LockKeyhole,
  ShieldCheck,
  WalletCards,
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

export default function TaskerEarningsPage() {
  const [withdrawalOpen, setWithdrawalOpen] = useState(false);
  const [recentRequest, setRecentRequest] =
    useState<TaskerWithdrawalRequest | null>(null);
  const { data: wallet, isLoading: walletLoading } = useTaskerWallet();
  const { data: transactions, isLoading: transactionsLoading } =
    useTaskerWalletTransactions();
  const { data: depositTransactions, isLoading: depositTransactionsLoading } =
    useTaskerDepositTransactions();

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
            Quản lý ví thu nhập, ký quỹ và yêu cầu rút tiền.
          </p>
        </div>
        <Button
          className="rounded-full"
          onClick={() => setWithdrawalOpen(true)}
          disabled={!wallet || Number(wallet.balance) <= 0}
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
                <p className="text-sm font-bold">Ký quỹ hoạt động</p>
                <p className="text-xs text-muted-foreground">
                  Không thuộc số dư có thể rút
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
                {formatCurrency(Number(wallet?.currentDepositBalance ?? 0))}
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-amber-500"
                  style={{
                    width: `${Math.min(
                      100,
                      (Number(wallet?.currentDepositBalance ?? 0) /
                        Math.max(Number(wallet?.requiredDeposit ?? 1), 1)) *
                        100,
                    )}%`,
                  }}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span>Mức yêu cầu</span>
                <span>
                  {formatCurrency(Number(wallet?.requiredDeposit ?? 0))}
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
            <p className="text-xs text-muted-foreground">
              Tối đa 50 giao dịch gần nhất từ hệ thống.
            </p>
          </div>
          <Badge variant="outline" className="rounded-full">
            {transactions?.total ?? 0} giao dịch
          </Badge>
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
              <p className="mt-3 font-bold">Chưa có giao dịch</p>
              <p className="text-sm text-muted-foreground">
                Thu nhập từ các booking online sẽ xuất hiện tại đây.
              </p>
            </div>
          )}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <ShieldCheck className="size-5 text-amber-600" />
              Lịch sử ký quỹ
            </h2>
            <p className="text-xs text-muted-foreground">
              Bao gồm phần phí nền tảng được khấu trừ khi ví thu nhập không đủ.
            </p>
          </div>
          <Badge variant="outline" className="rounded-full">
            {depositTransactions?.length ?? 0} giao dịch
          </Badge>
        </div>

        <div className="space-y-2">
          {depositTransactionsLoading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-20 rounded-2xl" />
            ))
          ) : depositTransactions?.length ? (
            depositTransactions.map((transaction) => (
              <DepositTransactionRow
                key={transaction.id}
                transaction={transaction}
              />
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center">
              <ShieldCheck className="mx-auto size-8 text-muted-foreground/50" />
              <p className="mt-3 font-bold">Ký quỹ chưa có biến động</p>
            </div>
          )}
        </div>
      </section>

      {wallet && (
        <WithdrawalDialog
          open={withdrawalOpen}
          balance={Number(wallet.balance)}
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
