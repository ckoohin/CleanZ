"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  History,
  LockKeyhole,
  Mail,
  SlidersHorizontal,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  useAdjustWallet,
  useAdminWalletDetail,
  useWalletTransactions,
} from "../hooks/useAdminWallets";
import type {
  AdminWallet,
  WalletOwnerType,
  WalletTransaction,
} from "../types/wallet.types";

interface Props {
  walletId: string;
  open: boolean;
  onClose: () => void;
}

const OWNER_LABELS: Record<WalletOwnerType, string> = {
  CUSTOMER: "Khách hàng",
  TASKER: "Tasker",
  SYSTEM: "Hệ thống",
};

const TRANSACTION_LABELS: Record<string, string> = {
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

const formatCurrency = (value: number | string | undefined) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));

export function WalletDetailDrawer({
  walletId,
  open,
  onClose,
}: Props) {
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentNote, setAdjustmentNote] = useState("");
  const [txPage, setTxPage] = useState(1);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const hasFilter = Boolean(fromDate || toDate);

  const { data: wallet, isLoading } = useAdminWalletDetail(walletId);
  const { data: transactions, isLoading: isTransactionsLoading } =
    useWalletTransactions({
      walletId,
      page: txPage,
      limit: 10,
      ...(fromDate && { fromDate }),
      ...(toDate && { toDate }),
    });
  const adjustMutation = useAdjustWallet();

  const totalPages = transactions?.totalPages ?? 1;

  const owner = getOwner(wallet);

  const submitAdjustment = () => {
    const amount = Number(adjustmentAmount);
    if (!Number.isFinite(amount) || amount === 0) {
      toast.error("Số tiền điều chỉnh phải khác 0");
      return;
    }
    if (!adjustmentNote.trim()) {
      toast.error("Vui lòng nhập lý do điều chỉnh");
      return;
    }

    adjustMutation.mutate(
      {
        walletId,
        amount,
        type: "ADJUSTMENT",
        description: adjustmentNote.trim(),
      },
      {
        onSuccess: () => {
          setAdjustmentOpen(false);
          setAdjustmentAmount("");
          setAdjustmentNote("");
        },
      },
    );
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
        <SheetContent className="cz-admin flex w-full flex-col bg-[var(--c-card)] p-0 sm:max-w-xl">
        <SheetHeader className="border-b border-[var(--c-line)] px-6 py-5">
          <SheetTitle className="flex items-center gap-2 text-base text-[var(--c-ink)]">
            <WalletCards className="size-5 text-[var(--c-primary-strong)]" />
            Chi tiết ví
          </SheetTitle>

          <SheetDescription className="font-mono text-xs text-[var(--c-muted)]">
            {walletId}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              <Skeleton className="h-28 rounded-2xl" />
              <Skeleton className="h-24 rounded-2xl" />
              <Skeleton className="h-64 rounded-2xl" />
            </div>
          ) : wallet ? (
            <div className="space-y-5 p-6">
              <div className="rounded-[24px] bg-[var(--c-primary)] p-5 text-white shadow-lg shadow-[var(--c-primary)]/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold opacity-80">
                    <CreditCard className="size-4" />
                    Số dư khả dụng
                  </div>
                  <Badge className="border-white/20 bg-white/15 text-white">
                    {OWNER_LABELS[wallet.ownerType]}
                  </Badge>
                </div>
                <p className="mt-5 text-3xl font-black tracking-tight">
                  {formatCurrency(wallet.balance)}
                </p>
                <div className="mt-4 flex items-center gap-2 text-xs opacity-80">
                  <LockKeyhole className="size-3.5" />
                  Đang giữ: {formatCurrency(wallet.holdBalance)}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <InfoCard
                  icon={UserRound}
                  label="Chủ ví"
                  value={owner.name}
                />
                <InfoCard
                  icon={Mail}
                  label="Email"
                  value={owner.email}
                />
              </div>

              <Button
                variant="outline"
                className="w-full rounded-xl border-[var(--c-primary)]/30 bg-[var(--c-card)] text-[var(--c-primary-strong)] hover:bg-[var(--c-primary-soft)]"
                onClick={() => setAdjustmentOpen(true)}
              >
                <SlidersHorizontal className="size-4 cursor-pointer" />
                Điều chỉnh số dư
              </Button>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--c-ink)]">
                      <History className="size-4 text-[var(--c-primary-strong)]" />
                      Giao dịch gần đây
                    </h3>
                    <p className="mt-0.5 text-xs text-[var(--c-muted)]">
                      Tối đa 20 giao dịch mới nhất của ví.
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="rounded-full border-[var(--c-line)] text-[var(--c-muted)]"
                  >
                    {transactions?.total ?? 0} giao dịch
                  </Badge>
                </div>

                {/* Date filter */}
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-[120px]">
                    <CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="date"
                      value={fromDate}
                      onChange={(e) => { setFromDate(e.target.value); setTxPage(1); }}
                      className="h-8 rounded-lg pl-8 text-xs"
                      aria-label="Từ ngày"
                    />
                  </div>
                  <div className="relative flex-1 min-w-[120px]">
                    <CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="date"
                      value={toDate}
                      min={fromDate || undefined}
                      onChange={(e) => { setToDate(e.target.value); setTxPage(1); }}
                      className="h-8 rounded-lg pl-8 text-xs"
                      aria-label="Đến ngày"
                    />
                  </div>
                  {hasFilter && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 rounded-lg"
                      onClick={() => { setFromDate(""); setToDate(""); setTxPage(1); }}
                      aria-label="Xóa bộ lọc"
                    >
                      <X className="size-3.5" />
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  {isTransactionsLoading ? (
                    Array.from({ length: 4 }).map((_, index) => (
                      <Skeleton key={index} className="h-20 w-full rounded-2xl" />
                    ))
                  ) : transactions?.items.length ? (
                    transactions.items.map((transaction) => (
                      <TransactionItem key={transaction.id} transaction={transaction} />
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-[var(--c-line)] p-8 text-center">
                      <CircleDollarSign className="mx-auto size-8 text-[var(--c-muted)]" />
                      <p className="mt-2 text-sm font-semibold text-[var(--c-ink)]">
                        Chưa có giao dịch
                      </p>
                      <p className="text-xs text-[var(--c-muted)]">
                        Các biến động số dư sẽ xuất hiện tại đây.
                      </p>
                    </div>
                  )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-3 flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-lg px-2.5 text-xs"
                      disabled={txPage <= 1}
                      onClick={() => setTxPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="size-3.5" />
                      Trước
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {txPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-lg px-2.5 text-xs"
                      disabled={txPage >= totalPages}
                      onClick={() => setTxPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Tiếp
                      <ChevronRight className="size-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-10 text-center text-sm text-[var(--c-muted)]">
              Không tìm thấy ví.
            </div>
          )}
        </ScrollArea>
        </SheetContent>
      </Sheet>

      <Dialog open={adjustmentOpen} onOpenChange={setAdjustmentOpen}>
        <DialogContent className="cz-admin rounded-2xl bg-[var(--c-card)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[var(--c-ink)]">
              Điều chỉnh số dư ví
            </DialogTitle>
            <DialogDescription className="text-[var(--c-muted)]">
              Nhập số dương để cộng tiền, số âm để trừ tiền. Mọi thay đổi đều
              được ghi vào lịch sử giao dịch.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[var(--c-muted)]">
                Số tiền điều chỉnh
              </label>
              <Input
                type="number"
                step="1000"
                value={adjustmentAmount}
                onChange={(event) => setAdjustmentAmount(event.target.value)}
                placeholder="Ví dụ: 50000 hoặc -50000"
                className="h-10 rounded-xl border-[var(--c-line-strong)] bg-[var(--c-card-2)] focus:border-[var(--c-primary)]/50"
              />
              {wallet && (
                <p className="text-xs text-[var(--c-muted)]">
                  Số dư hiện tại: {formatCurrency(wallet.balance)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-[var(--c-muted)]">
                Lý do điều chỉnh
              </label>
              <Textarea
                value={adjustmentNote}
                onChange={(event) => setAdjustmentNote(event.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Mô tả rõ nguyên nhân để phục vụ đối soát..."
                className="rounded-xl border-[var(--c-line-strong)] bg-[var(--c-card-2)] focus:border-[var(--c-primary)]/50"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-full border-[var(--c-line-strong)] bg-[var(--c-card)] text-[var(--c-ink)] hover:bg-[var(--c-card-2)]"
              onClick={() => setAdjustmentOpen(false)}
            >
              Hủy
            </Button>
            <Button
              className="rounded-full bg-[var(--c-primary)] text-white hover:bg-[var(--c-primary-strong)]"
              onClick={submitAdjustment}
              disabled={adjustMutation.isPending}
            >
              {adjustMutation.isPending ? "Đang ghi nhận..." : "Xác nhận"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function getOwner(wallet?: AdminWallet) {
  if (!wallet) return { name: "—", email: "—" };
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

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--c-line)] bg-[var(--c-card)] p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-[var(--c-muted)]">
        <Icon className="size-4 text-[var(--c-primary-strong)]" />
        {label}
      </div>
      <p className="mt-2 truncate text-sm font-bold text-[var(--c-ink)]">
        {value}
      </p>
    </div>
  );
}

function TransactionItem({
  transaction,
}: {
  transaction: WalletTransaction;
}) {
  const amount = Number(transaction.amount);
  const balanceBefore = Number(transaction.balanceBefore);
  const balanceAfter = Number(transaction.balanceAfter);
  const isCredit = balanceAfter >= balanceBefore;
  const Icon = isCredit ? ArrowDownLeft : ArrowUpRight;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[var(--c-line)] bg-[var(--c-card)] p-3.5">
      <div
        className="flex size-10 shrink-0 items-center justify-center rounded-xl"
        style={{
          background: isCredit
            ? "rgba(14,159,110,0.12)"
            : "rgba(225,29,72,0.12)",
          color: isCredit ? "#0E9F6E" : "#E11D48",
        }}
      >
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-[var(--c-ink)]">
          {TRANSACTION_LABELS[transaction.type] ?? transaction.type}
        </p>
        <p className="truncate text-xs text-[var(--c-muted)]">
          {transaction.description || "Không có mô tả"}
        </p>
        <p className="mt-1 text-[10px] text-[var(--c-muted)]">
          {new Date(transaction.createdAt).toLocaleString("vi-VN")}
        </p>
      </div>
      <div className="text-right">
        <p
          className="text-sm font-black"
          style={{ color: isCredit ? "#0E9F6E" : "#E11D48" }}
        >
          {isCredit ? "+" : "-"}
          {formatCurrency(Math.abs(amount))}
        </p>
        <p className="text-[10px] text-[var(--c-muted)]">
          Còn {formatCurrency(balanceAfter)}
        </p>
      </div>
    </div>
  );
}
