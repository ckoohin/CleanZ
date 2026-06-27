"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Banknote,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock3,
  Copy,
  Landmark,
  QrCode,
  UserRound,
  WalletCards,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  useAdminWithdrawalDetail,
  useReviewWithdrawal,
} from "../hooks/useAdminWithdrawals";
import { WithdrawalStatusBadge } from "./WithdrawalStatusBadge";

type ReviewMode = "APPROVED" | "REJECTED" | null;

interface Props {
  withdrawalId: string;
  open: boolean;
  initialMode?: ReviewMode;
  onClose: () => void;
}

const formatCurrency = (value: number | string | undefined) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));

const formatDate = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleString("vi-VN") : "—";

const BANK_CODE_ALIASES: Record<string, string> = {
  VIETCOMBANK: "VCB",
  VCB: "VCB",
  TECHCOMBANK: "TCB",
  TCB: "TCB",
  MB: "MB",
  MBBANK: "MB",
  BIDV: "BIDV",
  VIETINBANK: "ICB",
  ICB: "ICB",
  AGRIBANK: "VBA",
  ACB: "ACB",
  SACOMBANK: "STB",
  STB: "STB",
  VPBANK: "VPB",
  VPB: "VPB",
  TPBANK: "TPB",
  TPB: "TPB",
  VIB: "VIB",
  SHB: "SHB",
  OCB: "OCB",
  MSB: "MSB",
  SEABANK: "SEAB",
  EXIMBANK: "EIB",
  EIB: "EIB",
  HDBANK: "HDB",
  HDB: "HDB",
};

const normalizeBankCode = (bankName: string) => {
  const normalized = bankName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
  return BANK_CODE_ALIASES[normalized] ?? normalized;
};

const buildVietQrUrl = ({
  bankName,
  bankAccount,
  amount,
}: {
  bankName: string;
  bankAccount: string;
  amount: number | string;
}) => {
  const bankCode = normalizeBankCode(bankName);
  const account = bankAccount.replace(/\s/g, "");
  const params = new URLSearchParams({
    amount: String(Math.round(Number(amount))),
    addInfo: ``,
  });

  return `https://img.vietqr.io/image/${encodeURIComponent(bankCode)}-${encodeURIComponent(account)}-compact2.png?${params.toString()}`;
};

export function WithdrawalReviewDialog({
  withdrawalId,
  open,
  initialMode = null,
  onClose,
}: Props) {
  const [mode, setMode] = useState<ReviewMode>(initialMode);
  const [note, setNote] = useState("");
  const { data: withdrawal, isLoading } =
    useAdminWithdrawalDetail(withdrawalId);
  const reviewMutation = useReviewWithdrawal(withdrawalId);

  const copy = async (value: string | null | undefined) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    toast.success("Đã sao chép");
  };

  const submit = () => {
    if (!mode) return;
    if (
      mode === "APPROVED" &&
      (!withdrawal?.bankName || !withdrawal.bankAccount)
    ) {
      toast.error("Yêu cầu chưa có đủ thông tin ngân hàng để chuyển khoản");
      return;
    }
    if (mode === "REJECTED" && !note.trim()) {
      toast.error("Vui lòng nhập lý do từ chối");
      return;
    }

    reviewMutation.mutate(
      { status: mode, note: note.trim() || undefined },
      { onSuccess: onClose },
    );
  };

  const isPending = withdrawal?.status === "PENDING";

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="cz-admin max-h-[90vh] overflow-y-auto rounded-2xl bg-[var(--c-card)] p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-[var(--c-line)] px-6 py-5">
          <DialogTitle className="flex items-center gap-2 text-base text-[var(--c-ink)]">
            <WalletCards className="size-5 text-[var(--c-primary-strong)]" />
            Chi tiết yêu cầu rút tiền
          </DialogTitle>
          <DialogDescription className="text-[var(--c-muted)]">
            Kiểm tra thông tin ví và tài khoản nhận tiền trước khi xét duyệt.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 px-6 py-5">
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        ) : withdrawal ? (
          <div className="space-y-4 px-6 py-5">
            <div className="flex items-center justify-between rounded-2xl border border-[var(--c-primary)]/20 bg-[var(--c-primary-soft)] p-4">
              <div>
                <p className="text-xs font-medium text-[var(--c-muted)]">
                  Số tiền yêu cầu
                </p>
                <p className="mt-1 text-2xl font-black tracking-tight text-[var(--c-primary-strong)]">
                  {formatCurrency(withdrawal.amount)}
                </p>
              </div>
              <WithdrawalStatusBadge status={withdrawal.status} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <InfoCard
                icon={UserRound}
                label="Tasker"
                value={withdrawal.tasker?.user?.fullName || "-"}
              />
              <InfoCard
                icon={WalletCards}
                label="Số dư ví hiện tại"
                value={formatCurrency(withdrawal.wallet?.balance)}
              />
              <InfoCard
                icon={Building2}
                label="Ngân hàng"
                value={withdrawal.bankName || "Chưa cung cấp"}
              />
              <InfoCard
                icon={Landmark}
                label="Số tài khoản"
                value={withdrawal.bankAccount || "Chưa cung cấp"}
                onCopy={
                  withdrawal.bankAccount
                    ? () => copy(withdrawal.bankAccount)
                    : undefined
                }
              />
            </div>

            <div className="rounded-2xl border border-[var(--c-line)] bg-[var(--c-card-2)] p-4">
              <div className="grid gap-3 text-xs sm:grid-cols-2">
                <TimelineItem
                  icon={Clock3}
                  label="Ngày yêu cầu"
                  value={formatDate(withdrawal.createdAt)}
                />
                <TimelineItem
                  icon={CheckCircle2}
                  label="Ngày xét duyệt"
                  value={formatDate(withdrawal.reviewedAt)}
                />
              </div>
              {withdrawal.note && (
                <div className="mt-4 border-t border-[var(--c-line)] pt-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--c-muted)]">
                    Ghi chú
                  </p>
                  <p className="mt-1 text-sm text-[var(--c-ink-soft)]">
                    {withdrawal.note}
                  </p>
                </div>
              )}
            </div>

            {isPending && (
              <div className="space-y-3 rounded-2xl border border-[var(--c-line)] p-4">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={mode === "APPROVED" ? "default" : "outline"}
                    className="flex-1 rounded-xl"
                    onClick={() => setMode("APPROVED")}
                  >
                    <CheckCircle2 className="size-4" />
                    Phê duyệt
                  </Button>
                  <Button
                    type="button"
                    variant={mode === "REJECTED" ? "destructive" : "outline"}
                    className="flex-1 rounded-xl"
                    onClick={() => setMode("REJECTED")}
                  >
                    <XCircle className="size-4" />
                    Từ chối
                  </Button>
                </div>

                {mode && (
                  <>
                    {mode === "APPROVED" &&
                      withdrawal.bankName &&
                      withdrawal.bankAccount && (
                        <TransferQr
                          bankName={withdrawal.bankName}
                          bankAccount={withdrawal.bankAccount}
                          amount={withdrawal.amount}
                          withdrawalId={withdrawal.id}
                          onCopy={copy}
                        />
                      )}
                    {mode === "APPROVED" &&
                      (!withdrawal.bankName || !withdrawal.bankAccount) && (
                        <div
                          className="flex gap-2 rounded-xl border p-3 text-sm"
                          style={{
                            borderColor: "rgba(217,119,6,0.3)",
                            background: "rgba(217,119,6,0.14)",
                            color: "#D97706",
                          }}
                        >
                          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                          Yêu cầu chưa có đủ ngân hàng hoặc số tài khoản nên
                          không thể tạo QR chuyển khoản.
                        </div>
                      )}

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-[var(--c-muted)]">
                        {mode === "REJECTED"
                          ? "Lý do từ chối *"
                          : "Ghi chú xét duyệt"}
                      </label>
                      <Textarea
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        maxLength={500}
                        rows={3}
                        placeholder={
                          mode === "REJECTED"
                            ? "Nhập lý do để Tasker biết cần điều chỉnh gì..."
                            : "Thêm ghi chú nội bộ nếu cần..."
                        }
                        className="rounded-xl border-[var(--c-line-strong)] bg-[var(--c-card-2)] focus:border-[var(--c-primary)]/50"
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="px-6 py-10 text-center text-sm text-[var(--c-muted)]">
            Không tìm thấy yêu cầu rút tiền.
          </div>
        )}

        <DialogFooter className="border-t border-[var(--c-line)] px-6 py-4">
          <Button
            variant="outline"
            className="rounded-full border-[var(--c-line-strong)] bg-[var(--c-card)] text-[var(--c-ink)] hover:bg-[var(--c-card-2)]"
            onClick={onClose}
          >
            Đóng
          </Button>
          {isPending && mode && (
            <Button
              variant={mode === "REJECTED" ? "destructive" : "default"}
              className="rounded-full"
              onClick={submit}
              disabled={
                reviewMutation.isPending ||
                (mode === "APPROVED" &&
                  (!withdrawal?.bankName || !withdrawal.bankAccount))
              }
            >
              {reviewMutation.isPending
                ? "Đang xử lý..."
                : mode === "APPROVED"
                  ? "Xác nhận phê duyệt"
                  : "Xác nhận từ chối"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TransferQr({
  bankName,
  bankAccount,
  amount,
  withdrawalId,
  onCopy,
}: {
  bankName: string;
  bankAccount: string;
  amount: number | string;
  withdrawalId: string;
  onCopy: (value: string) => Promise<void>;
}) {
  const transferContent = `CleanZ rut tien ${withdrawalId.slice(0, 8)}`;
  const qrUrl = buildVietQrUrl({
    bankName,
    bankAccount,
    amount,
  });

  return (
    <div className="rounded-2xl border border-[var(--c-primary)]/20 bg-[var(--c-primary-soft)] p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="rounded-lg bg-[var(--c-primary-soft)] p-2 text-[var(--c-primary-strong)]">
          <QrCode className="size-4" />
        </div>
        <div>
          <p className="text-sm font-bold text-[var(--c-ink)]">
            Quét QR để chuyển khoản
          </p>
        </div>
      </div>

      <div className="grid items-center gap-4 sm:grid-cols-[210px_1fr]">
        <div className="mx-auto overflow-hidden rounded-2xl border bg-white p-2 shadow-sm">
          <Image
            src={qrUrl}
            width={194}
            height={194}
            unoptimized
            alt={`QR chuyển khoản ${bankName} ${bankAccount}`}
            className="size-48.5 object-contain"
          />
        </div>

        <div className="space-y-3 text-sm">
          <TransferItem label="Ngân hàng" value={bankName} />
          <TransferItem
            label="Số tài khoản"
            value={bankAccount}
            onCopy={() => onCopy(bankAccount)}
          />
          <TransferItem
            label="Số tiền"
            value={formatCurrency(amount)}
            onCopy={() => onCopy(String(Math.round(Number(amount))))}
          />
          <TransferItem
            label="Nội dung"
            value={transferContent}
            onCopy={() => onCopy(transferContent)}
          />
        </div>
      </div>

      <p className="mt-3 text-center text-[11px] text-[var(--c-muted)]">
        Kiểm tra đúng tên người nhận trên ứng dụng ngân hàng trước khi chuyển.
      </p>
    </div>
  );
}

function TransferItem({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy?: () => void;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--c-muted)]">
        {label}
      </p>
      <div className="mt-0.5 flex items-center gap-1">
        <p className="min-w-0 flex-1 break-all font-bold text-[var(--c-ink)]">
          {value}
        </p>
        {onCopy && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 shrink-0 rounded-full"
            onClick={onCopy}
            aria-label={`Sao chép ${label}`}
          >
            <Copy className="size-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
  onCopy,
}: {
  icon: typeof Banknote;
  label: string;
  value: string;
  onCopy?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-[var(--c-line)] bg-[var(--c-card)] p-3.5">
      <div className="flex items-center gap-2 text-[var(--c-muted)]">
        <Icon className="size-4 text-[var(--c-primary-strong)]" />
        <span className="text-[11px] font-bold uppercase tracking-wide">
          {label}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="truncate text-sm font-bold text-[var(--c-ink)]">
          {value}
        </span>
        {onCopy && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 shrink-0 rounded-full"
            onClick={onCopy}
            aria-label={`Sao chép ${label}`}
          >
            <Copy className="size-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

function TimelineItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock3;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-2">
      <Icon className="mt-0.5 size-4 text-[var(--c-primary-strong)]" />
      <div>
        <p className="font-semibold text-[var(--c-muted)]">{label}</p>
        <p className="mt-0.5 font-medium text-[var(--c-ink)]">{value}</p>
      </div>
    </div>
  );
}
