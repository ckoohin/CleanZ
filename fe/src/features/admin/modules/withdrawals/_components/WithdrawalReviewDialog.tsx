"use client";

import { useRef, useState } from "react";
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
  AlertTriangle,
  Banknote,
  Building2,
  Camera,
  CheckCircle2,
  Clock3,
  Copy,
  ImageIcon,
  Landmark,
  Loader2,
  Maximize2,
  QrCode,
  UserRound,
  WalletCards,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  useAdminWithdrawalDetail,
  useReviewWithdrawal,
} from "../hooks/useAdminWithdrawals";
import { WithdrawalStatusBadge } from "./WithdrawalStatusBadge";
import { uploadApi } from "@/lib/api/upload.service";

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
  VIETCOMBANK: "VCB", VCB: "VCB",
  TECHCOMBANK: "TCB", TCB: "TCB",
  MB: "MB", MBBANK: "MB",
  BIDV: "BIDV",
  VIETINBANK: "ICB", ICB: "ICB",
  AGRIBANK: "VBA",
  ACB: "ACB",
  SACOMBANK: "STB", STB: "STB",
  VPBANK: "VPB", VPB: "VPB",
  TPBANK: "TPB", TPB: "TPB",
  VIB: "VIB", SHB: "SHB", OCB: "OCB", MSB: "MSB",
  SEABANK: "SEAB",
  EXIMBANK: "EIB", EIB: "EIB",
  HDBANK: "HDB", HDB: "HDB",
};

const normalizeBankCode = (bankName: string) => {
  const normalized = bankName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
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
  const [adminNote, setAdminNote] = useState("");
  const [proofImageUrl, setProofImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: withdrawal, isLoading } = useAdminWithdrawalDetail(withdrawalId);
  const reviewMutation = useReviewWithdrawal(withdrawalId);

  const copy = async (value: string | null | undefined) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    toast.success("Đã sao chép");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await uploadApi.uploadImage(file);
      setProofImageUrl(url);
      toast.success("Tải ảnh lên thành công");
    } catch {
      toast.error("Tải ảnh thất bại, vui lòng thử lại");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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
      {
        status: mode,
        note: note.trim() || undefined,
        adminNote: adminNote.trim() || undefined,
        proofImageUrl: proofImageUrl ?? undefined,
      },
      { onSuccess: onClose },
    );
  };

  const isPending = withdrawal?.status === "PENDING";

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="cz-admin max-h-[90vh] overflow-y-auto rounded-2xl bg-(--c-card) p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-(--c-line) px-6 py-5">
          <DialogTitle className="flex items-center gap-2 text-base text-(--c-ink)">
            <WalletCards className="size-5 text-(--c-primary-strong)" />
            Chi tiết yêu cầu rút tiền
          </DialogTitle>
          <DialogDescription className="text-(--c-muted)">
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
            {/* Amount + Status */}
            <div className="flex items-center justify-between rounded-2xl border border-primary/15 bg-primary/5 p-4">
              <div>
                <p className="text-xs font-medium text-(--c-muted)">
                  Số tiền yêu cầu
                </p>
                <p className="mt-1 text-2xl font-black tracking-tight text-(--c-primary-strong)">
                  {formatCurrency(withdrawal.amount)}
                </p>
              </div>
              <WithdrawalStatusBadge status={withdrawal.status} />
            </div>

            {/* Info grid */}
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

            {/* Timeline + notes */}
            <div className="rounded-2xl border border-border/50 bg-muted/20 p-4 space-y-3">
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

              {/* Tasker note */}
              {withdrawal.note && (
                <div className="border-t border-border/40 pt-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    Ghi chú của Tasker
                  </p>
                  <p className="mt-1 text-sm text-(--c-ink-soft)">
                    {withdrawal.note}
                  </p>
                </div>
              )}

              {/* Admin note (view mode — already reviewed) */}
              {!isPending && withdrawal.adminNote && (
                <div className="border-t border-border/40 pt-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-primary">
                    Ghi chú Admin
                  </p>
                  <p className="mt-1 text-sm text-foreground/80">
                    {withdrawal.adminNote}
                  </p>
                </div>
              )}

              {/* Proof image (view mode) */}
              {!isPending && withdrawal.proofImageUrl && (
                <div className="border-t border-border/40 pt-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-600 mb-2">
                    Minh chứng chuyển tiền
                  </p>
                  <button
                    type="button"
                    onClick={() => setLightboxUrl(withdrawal.proofImageUrl)}
                    className="group relative block w-fit"
                    aria-label="Xem minh chứng"
                  >
                    <Image
                      src={withdrawal.proofImageUrl}
                      alt="Minh chứng chuyển tiền"
                      width={240}
                      height={160}
                      unoptimized
                      className="rounded-xl border border-border object-cover transition-opacity group-hover:opacity-75"
                    />
                    <div className="absolute inset-0 flex items-center justify-center rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="rounded-full bg-black/60 p-2">
                        <Maximize2 className="size-5 text-white" />
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Review section (PENDING only) */}
            {isPending && (
              <div className="space-y-4 rounded-2xl border border-border/50 p-4">
                {/* Mode selector */}
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
                  <div className="space-y-4">
                    {/* QR transfer */}
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

                    {/* Proof image upload (chỉ khi APPROVED) */}
                    {mode === "APPROVED" && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground">
                          Ảnh minh chứng chuyển tiền{" "}
                          <span className="font-normal">(Không bắt buộc)</span>
                        </p>

                        {proofImageUrl ? (
                          <div className="relative w-fit">
                            <button
                              type="button"
                              onClick={() => setLightboxUrl(proofImageUrl)}
                              className="group relative block"
                              aria-label="Xem minh chứng"
                            >
                              <Image
                                src={proofImageUrl}
                                alt="Minh chứng"
                                width={200}
                                height={140}
                                unoptimized
                                className="rounded-xl border border-border object-cover transition-opacity group-hover:opacity-75"
                              />
                              <div className="absolute inset-0 flex items-center justify-center rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="rounded-full bg-black/60 p-2">
                                  <Maximize2 className="size-5 text-white" />
                                </div>
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => setProofImageUrl(null)}
                              className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-white shadow hover:bg-destructive/80"
                            >
                              <XCircle className="size-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="flex h-24 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-50"
                          >
                            {isUploading ? (
                              <>
                                <Loader2 className="size-5 animate-spin" />
                                Đang tải ảnh...
                              </>
                            ) : (
                              <>
                                <Camera className="size-5" />
                                Tải lên ảnh chụp màn hình / biên lai
                              </>
                            )}
                          </button>
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/jpg"
                          className="hidden"
                          onChange={handleImageUpload}
                        />
                      </div>
                    )}

                    {/* Note / Admin note */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-(--c-muted)">
                        {mode === "REJECTED"
                          ? "Lý do từ chối *"
                          : "Ghi chú Admin"}
                      </label>
                      <Textarea
                        value={mode === "REJECTED" ? note : adminNote}
                        onChange={(e) =>
                          mode === "REJECTED"
                            ? setNote(e.target.value)
                            : setAdminNote(e.target.value)
                        }
                        maxLength={500}
                        rows={3}
                        placeholder={
                          mode === "REJECTED"
                            ? "Nhập lý do để Tasker biết cần điều chỉnh gì..."
                            : "Ghi chú nội bộ sau khi đã chuyển khoản..."
                        }
                        className="rounded-xl border-(--c-line-strong) bg-(--c-card-2) focus:border-(--c-primary)/50"
                      />
                      <p className="text-right text-[11px] text-muted-foreground">
                        {(mode === "REJECTED" ? note : adminNote).length}/500
                      </p>
                    </div>

                    {/* Proof notice */}
                    {mode === "APPROVED" && !proofImageUrl && (
                      <div className="flex gap-2 rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-xs text-blue-700 dark:text-blue-400">
                        <ImageIcon className="mt-0.5 size-4 shrink-0" />
                        Khuyến nghị tải ảnh biên lai chuyển khoản để lưu minh
                        chứng và Tasker có thể xem lại.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="px-6 py-10 text-center text-sm text-(--c-muted)">
            Không tìm thấy yêu cầu rút tiền.
          </div>
        )}

        {/* Lightbox */}
        {lightboxUrl && (
          <div
            className="fixed inset-0 z-100 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setLightboxUrl(null)}
          >
            <button
              type="button"
              onClick={() => setLightboxUrl(null)}
              className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              aria-label="Đóng ảnh"
            >
              <X className="size-6" />
            </button>
            <Image
              src={lightboxUrl}
              alt="Minh chứng chuyển tiền"
              width={900}
              height={700}
              unoptimized
              className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        <DialogFooter className="border-t border-border/40 px-6 py-4">
          <Button variant="outline" className="rounded-full" onClick={onClose}>
            Đóng
          </Button>
          {isPending && mode && (
            <Button
              variant={mode === "REJECTED" ? "destructive" : "default"}
              className="rounded-full"
              onClick={submit}
              disabled={
                reviewMutation.isPending ||
                isUploading ||
                (mode === "APPROVED" &&
                  (!withdrawal?.bankName || !withdrawal.bankAccount))
              }
            >
              {reviewMutation.isPending || isUploading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : mode === "APPROVED" ? (
                "Xác nhận phê duyệt"
              ) : (
                "Xác nhận từ chối"
              )}
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
  const qrUrl = buildVietQrUrl({ bankName, bankAccount, amount });

  return (
    <div className="rounded-2xl border border-(--c-primary)/20 bg-(--c-primary-soft) p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="rounded-lg bg-(--c-primary-soft) p-2 text-(--c-primary-strong)">
          <QrCode className="size-4" />
        </div>
        <p className="text-sm font-bold">Quét QR để chuyển khoản</p>
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

      <p className="mt-3 text-center text-[11px] text-(--c-muted)">
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
      <p className="text-[10px] font-bold uppercase tracking-wide text-(--c-muted)">
        {label}
      </p>
      <div className="mt-0.5 flex items-center gap-1">
        <p className="min-w-0 flex-1 break-all font-bold text-(--c-ink)">
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
    <div className="rounded-2xl border border-(--c-line) bg-(--c-card) p-3.5">
      <div className="flex items-center gap-2 text-(--c-muted)">
        <Icon className="size-4 text-(--c-primary-strong)" />
        <span className="text-[11px] font-bold uppercase tracking-wide">
          {label}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="truncate text-sm font-bold text-(--c-ink)">
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
      <Icon className="mt-0.5 size-4 text-(--c-primary-strong)" />
      <div>
        <p className="font-semibold text-(--c-muted)">{label}</p>
        <p className="mt-0.5 font-medium text-(--c-ink)">{value}</p>
      </div>
    </div>
  );
}
