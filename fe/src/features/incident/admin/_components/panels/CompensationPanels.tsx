"use client";

import React, { useState } from "react";
import { AdminButton } from "@/components/admin";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useRef } from "react";
import {
  Banknote,
  AlertTriangle,
  Undo2,
  Eraser,
  QrCode,
  ImagePlus,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  useCompensate,
  useCompensateManual,
  useCorrectManualPayout,
  useReverseCompensation,
  useUploadTransferProof,
  useWithdrawDecision,
  useWriteOffDebt,
} from "../../hooks/useAdminIncident";
import {
  BLOCKED_REASON_LABEL,
  formatVnd,
} from "@/features/incident/shared/incident.labels";
import type {
  IncidentAdminView,
  PayoutPreview,
} from "@/features/incident/shared/incident.types";
import { toast } from "@/lib/toast";
import {
  EVIDENCE_MAX_BYTES,
  EVIDENCE_MIME,
} from "@/features/incident/shared/incident.enums";

/** Đọc mã lỗi có cấu trúc từ BE thay vì so khớp chuỗi tiếng Việt (message có thể đổi). */
function errorCode(e: unknown): string | undefined {
  const data = (
    e as { response?: { data?: { code?: string; message?: unknown } } }
  )?.response?.data;
  if (typeof data?.code === "string") return data.code;
  const nested = data?.message as { code?: string } | undefined;
  return typeof nested?.code === "string" ? nested.code : undefined;
}

/**
 * Chi trả bồi thường — CHUYỂN TIỀN THẬT qua ví.
 *
 * Số hiển thị lấy từ `payoutPreview` do BE tính bằng ĐÚNG công thức lúc ghi sổ, không suy
 * từ taskerBorne/platformBorne: phần Tasker thực trừ bị giới hạn bởi số dư ví, phần thiếu
 * quỹ phải ứng — nếu hiển thị theo tỷ lệ đã chia thì admin sẽ hiểu sai khoản quỹ thực chi.
 */
export function CompensatePanel({
  id,
  code,
  amount,
  preview,
  blockedReason,
}: {
  id: string;
  code?: string | null;
  amount: number | null;
  preview?: PayoutPreview | null;
  blockedReason?: string;
}) {
  const compensate = useCompensate(id);
  const [open, setOpen] = useState(false);
  const [showManual, setShowManual] = useState(false);

  return (
    <section className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--c-muted)]">
        Chi trả bồi thường
      </p>
      {blockedReason ? (
        <p className="flex items-start gap-1 rounded-lg bg-[rgba(217,119,6,0.14)] border border-[var(--c-line)] p-2.5 text-xs text-[#D97706]">
          <AlertTriangle className="mt-px size-3.5 shrink-0" /> {blockedReason}
        </p>
      ) : (
        <>
          {preview && (
            <div className="space-y-1 rounded-lg border border-[var(--c-line)] bg-[var(--c-card-2)] p-2.5 text-[11px]">
              <p className="font-bold uppercase text-[var(--c-muted)]">
                Tiền sẽ đi như sau
              </p>
              <div className="flex justify-between">
                <span className="text-[var(--c-muted)]">Hoàn vào ví khách</span>
                <b>{formatVnd(preview.customerRefund)}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--c-muted)]">
                  Trừ ví Tasker (số dư {formatVnd(preview.taskerWalletBalance)})
                </span>
                <b>{formatVnd(preview.recoverableFromTasker)}</b>
              </div>
              {preview.uncoveredFromTasker > 0 && (
                <div className="flex justify-between text-[#B45309]">
                  <span>Tasker không đủ tiền → ghi thành nợ</span>
                  <b>{formatVnd(preview.uncoveredFromTasker)}</b>
                </div>
              )}
              <div className="flex justify-between border-t border-[var(--c-line)] pt-1">
                <span className="text-[var(--c-muted)]">
                  Quỹ nền tảng chi bù
                </span>
                <b>{formatVnd(preview.platformPayout)}</b>
              </div>
            </div>
          )}
          <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
              <AdminButton
                variant="primary"
                size="sm"
                className="w-full rounded-lg gap-1.5"
                disabled={compensate.isPending}
              >
                <Banknote className="size-3.5" /> Chi trả bồi thường{" "}
                {formatVnd(amount)}
              </AdminButton>
            </AlertDialogTrigger>
            <AlertDialogContent className="cz-admin rounded-2xl bg-[var(--c-card)] text-[var(--c-ink)]">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-[var(--c-ink)]">
                  Xác nhận chi trả bồi thường?
                </AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-2 text-[var(--c-muted)]">
                    <p>
                      Thao tác này{" "}
                      <b className="text-[#DC2626]">chuyển tiền THẬT</b>:
                    </p>
                    <ul className="list-disc space-y-0.5 pl-4 text-xs">
                      <li>
                        Hoàn{" "}
                        <b>{formatVnd(preview?.customerRefund ?? amount)}</b>{" "}
                        vào ví Khách hàng.
                      </li>
                      <li>
                        Trừ <b>{formatVnd(preview?.recoverableFromTasker)}</b>{" "}
                        từ ví Tasker.
                      </li>
                      <li>
                        Quỹ nền tảng chi{" "}
                        <b>{formatVnd(preview?.platformPayout)}</b>.
                      </li>
                      {(preview?.uncoveredFromTasker ?? 0) > 0 && (
                        <li>
                          Tasker còn thiếu{" "}
                          <b>{formatVnd(preview?.uncoveredFromTasker)}</b> — ghi
                          thành <b>nợ</b>, trừ dần vào thu nhập và tạm khoá rút
                          tiền tới khi trả hết.
                        </li>
                      )}
                    </ul>
                    <p className="text-[11px]">
                      Có thể hoàn tác trong <b>72 giờ</b>, miễn là khách chưa
                      tiêu khoản tiền đã hoàn.
                    </p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Huỷ</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() =>
                    compensate.mutate(undefined, {
                      onSuccess: () => setOpen(false),
                      onError: (e) => {
                        setOpen(false);
                        if (errorCode(e) === "PLATFORM_FUND_INSUFFICIENT") {
                          setShowManual(true);
                        }
                      },
                    })
                  }
                  disabled={compensate.isPending}
                >
                  {compensate.isPending ? "Đang xử lý..." : "Xác nhận chi trả"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <button
            type="button"
            onClick={() => setShowManual((v) => !v)}
            className="text-[11px] underline text-[var(--c-muted)]"
          >
            {showManual ? "Ẩn" : "Quỹ nền tảng không đủ? Chuyển khoản thủ công"}
          </button>
          {showManual && (
            <ManualCompensatePanel id={id} code={code} amount={amount} />
          )}
        </>
      )}
    </section>
  );
}

/**
 * Chi trả THỦ CÔNG khi quỹ nền tảng không đủ: admin chuyển khoản ngoài cho khách rồi upload
 * ảnh minh chứng. BE thu phần Tasker chịu về quỹ, KHÔNG hoàn ví khách (khách đã nhận tiền)
 * và KHÔNG trừ ví quỹ (luồng này chạy đúng lúc quỹ đang cạn).
 */
export function ManualCompensatePanel({
  id,
  code,
  amount,
}: {
  id: string;
  code?: string | null;
  amount: number | null;
}) {
  const upload = useUploadTransferProof();
  const manual = useCompensateManual(id);
  const fileRef = useRef<HTMLInputElement>(null);
  const [bankCode, setBankCode] = useState("");
  const [account, setAccount] = useState("");
  const [proofId, setProofId] = useState<string | null>(null);
  const [proofName, setProofName] = useState("");
  const busy = upload.isPending || manual.isPending;

  // KHÔNG dựng QR qua dịch vụ ảnh bên ngoài: URL đó mang số tài khoản + số tiền của khách
  // sang bên thứ ba trên mỗi lần render. Hiển thị nội dung chuyển khoản để copy vào app ngân hàng.
  const transferMemo = `CLEANZ BOI THUONG ${code ?? ""}`.trim();

  /**
   * Khoản này rời khỏi hệ thống bằng chuyển khoản ngoài ví, nên nơi nhận phải
   * được ghi vào sổ cùng lúc — ảnh minh chứng không tra cứu hay đối soát được.
   */
  const recipient =
    bankCode.trim() && account.trim()
      ? `Chuyển khoản ${bankCode.trim().toUpperCase()} · STK ${account.trim()} · ND ${transferMemo}`
      : "";

  const pickProof = async (f: File | undefined) => {
    if (!f) return;
    if (!EVIDENCE_MIME.includes(f.type)) {
      toast.error("Chỉ nhận ảnh JPEG hoặc PNG.");
      return;
    }
    if (f.size > EVIDENCE_MAX_BYTES) {
      toast.error("Ảnh vượt quá 5MB. Hãy chụp lại hoặc giảm dung lượng.");
      return;
    }
    try {
      const ev = await upload.mutateAsync(f);
      setProofId(ev.id);
      setProofName(f.name);
    } catch {
      // Hook upload đã hiện lỗi; bắt ở đây để lời hứa không văng ra ngoài.
    }
  };

  return (
    <div className="space-y-2 rounded-lg border border-[#D97706]/40 bg-[#D97706]/5 p-3">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase text-[var(--c-muted)]">
        <QrCode className="size-3.5" /> Chuyển khoản thủ công cho khách
      </p>
      <p className="text-[11px] leading-snug text-[var(--c-muted)]">
        Quỹ nền tảng không đủ để chi tự động. Hãy chuyển khoản{" "}
        <b>{formatVnd(amount)}</b> cho khách bằng app ngân hàng, sau đó tải ảnh
        chuyển khoản lên làm bằng chứng và bấm xác nhận. Phần Tasker chịu vẫn
        được trừ tự động.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Input
          value={bankCode}
          onChange={(e) => setBankCode(e.target.value)}
          placeholder="Ngân hàng của khách (VCB, TCB…)"
          maxLength={50}
          aria-label="Ngân hàng của khách"
          className="h-8 rounded-lg text-sm"
        />
        <Input
          value={account}
          onChange={(e) => setAccount(e.target.value)}
          placeholder="Số tài khoản khách"
          maxLength={50}
          aria-label="Số tài khoản khách"
          className="h-8 rounded-lg text-sm"
        />
      </div>
      {bankCode.trim() && account.trim() && (
        <div className="space-y-1 rounded-lg border border-[var(--c-line)] bg-[var(--c-card)] p-2.5 text-[11px]">
          <p className="font-bold uppercase text-[var(--c-muted)]">
            Nội dung chuyển khoản
          </p>
          <div className="flex justify-between gap-2">
            <span className="text-[var(--c-muted)]">Ngân hàng</span>
            <b className="truncate">{bankCode.trim().toUpperCase()}</b>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[var(--c-muted)]">Số tài khoản</span>
            <b className="truncate">{account.trim()}</b>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[var(--c-muted)]">Số tiền</span>
            <b>{formatVnd(amount)}</b>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[var(--c-muted)]">Nội dung</span>
            <b className="truncate">{transferMemo}</b>
          </div>
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          // Xoá giá trị ngay để chọn LẠI đúng file đó vẫn kích hoạt onChange —
          // sau một lần upload lỗi, đây là thao tác đầu tiên người dùng thử.
          e.target.value = "";
          void pickProof(file);
        }}
      />
      <div className="flex items-center gap-2">
        <AdminButton
          size="sm"
          variant="secondary"
          className="rounded-lg gap-1.5"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          <ImagePlus className="size-3.5" />{" "}
          {proofId ? "Đổi ảnh minh chứng" : "Tải ảnh minh chứng"}
        </AdminButton>
        {proofId && (
          <span className="truncate text-[11px] text-[#047857]">
            ✓ {proofName}
          </span>
        )}
      </div>
      <AdminButton
        size="sm"
        variant="primary"
        className="w-full rounded-lg gap-1.5"
        disabled={busy || !proofId || !recipient}
        onClick={() =>
          proofId &&
          recipient &&
          manual.mutate({ proofEvidenceId: proofId, note: recipient })
        }
      >
        <Banknote className="size-3.5" />
        {manual.isPending
          ? "Đang xử lý..."
          : "Xác nhận đã chuyển khoản thủ công"}
      </AdminButton>
      {!recipient && (
        <p className="text-[11px] text-[#D97706]">
          Nhập ngân hàng và số tài khoản đã chuyển — thông tin này được ghi vào
          sổ chi để đối soát sau.
        </p>
      )}
    </div>
  );
}

/**
 * Sổ chi ngoài + sửa sai — chỉ hiện với khoản đã chi bằng chuyển khoản thủ công.
 *
 * Vì sao cần: khoản này không có bút toán ví nào, nên nút "Hoàn tác chi trả" không đảo
 * được (BE chặn thẳng). Không có ô sửa thì một lần chuyển nhầm số tiền hoặc nhầm người sẽ
 * nằm sai vĩnh viễn trong con số DUY NHẤT ghi nhận tiền đã rời ngân hàng công ty.
 *
 * Hai ô tách nhau có chủ đích: "khách thực nhận" là nghĩa vụ với khách (còn thiếu thì hồ
 * sơ vẫn báo đỏ), "thất thoát" là tiền công ty mất — gộp lại thì một khoản chuyển nhầm sẽ
 * trông như đã trả khách xong.
 */
export function ManualPayoutLedgerPanel({
  id,
  approved,
  ledger,
}: {
  id: string;
  approved: number | null;
  ledger: NonNullable<IncidentAdminView["externalPayout"]>;
}) {
  const upload = useUploadTransferProof();
  const correct = useCorrectManualPayout(id);
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [delivered, setDelivered] = useState(String(ledger.amount));
  const [loss, setLoss] = useState(String(ledger.lossAmount));
  const [reason, setReason] = useState("");
  const [proofId, setProofId] = useState<string | null>(null);
  const [proofName, setProofName] = useState("");

  const deliveredNum = Number(delivered);
  const lossNum = Number(loss);
  const busy = upload.isPending || correct.isPending;
  const invalidNumbers =
    !Number.isInteger(deliveredNum) ||
    deliveredNum < 0 ||
    !Number.isInteger(lossNum) ||
    lossNum < 0 ||
    (approved != null && deliveredNum > approved);
  const unchanged =
    deliveredNum === ledger.amount && lossNum === ledger.lossAmount;
  const tooShort = reason.trim().length < 10;

  const pickProof = async (f: File | undefined) => {
    if (!f) return;
    if (!EVIDENCE_MIME.includes(f.type)) {
      toast.error("Chỉ nhận ảnh JPEG hoặc PNG.");
      return;
    }
    if (f.size > EVIDENCE_MAX_BYTES) {
      toast.error("Ảnh vượt quá 5MB. Hãy chụp lại hoặc giảm dung lượng.");
      return;
    }
    try {
      const ev = await upload.mutateAsync(f);
      setProofId(ev.id);
      setProofName(f.name);
    } catch {
      // Hook upload đã báo lỗi.
    }
  };

  return (
    <section className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--c-muted)]">
        Sổ chi ngoài (chuyển khoản thủ công)
      </p>
      <div className="space-y-1 rounded-lg border border-[var(--c-line)] bg-[var(--c-card-2)] p-3 text-[11px]">
        <div className="flex justify-between gap-2">
          <span className="text-[var(--c-muted)]">Khách đã thực nhận</span>
          <b>{formatVnd(ledger.amount)}</b>
        </div>
        {ledger.shortfallAmount > 0 && (
          <div className="flex justify-between gap-2 text-[#DC2626]">
            <span>Còn thiếu, phải chuyển bù</span>
            <b>{formatVnd(ledger.shortfallAmount)}</b>
          </div>
        )}
        {ledger.lossAmount > 0 && (
          <div className="flex justify-between gap-2 text-[#D97706]">
            <span>Thất thoát (không đến tay khách)</span>
            <b>{formatVnd(ledger.lossAmount)}</b>
          </div>
        )}
        {ledger.note && (
          <p className="pt-1 text-[var(--c-muted)]">{ledger.note}</p>
        )}
        {ledger.correctedAt && (
          <p className="text-[var(--c-muted)]">
            Đã điều chỉnh lúc{" "}
            {new Date(ledger.correctedAt).toLocaleString("vi-VN")}
          </p>
        )}
      </div>

      <p className="text-[11px] leading-snug text-[var(--c-muted)]">
        Chuyển nhầm số tiền hoặc nhầm người? Khoản này đi ngoài ví nên{" "}
        <b>không hoàn tác tự động được</b> — hãy chuyển bù/thu hồi bằng ngân
        hàng rồi khai lại số thật ở đây. Thao tác này
        <b> không đụng đến ví</b> của bất kỳ ai và không đổi phần Tasker chịu.
      </p>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label
            htmlFor={`delivered-${id}`}
            className="text-[11px] text-[var(--c-muted)]"
          >
            Khách thực nhận (VND)
          </label>
          <Input
            id={`delivered-${id}`}
            value={delivered}
            inputMode="numeric"
            onChange={(e) => setDelivered(e.target.value.replace(/\D/g, ""))}
            className="h-8 rounded-lg text-sm"
          />
        </div>
        <div className="space-y-1">
          <label
            htmlFor={`loss-${id}`}
            className="text-[11px] text-[var(--c-muted)]"
          >
            Thất thoát (VND)
          </label>
          <Input
            id={`loss-${id}`}
            value={loss}
            inputMode="numeric"
            onChange={(e) => setLoss(e.target.value.replace(/\D/g, ""))}
            className="h-8 rounded-lg text-sm"
          />
        </div>
      </div>
      {approved != null && deliveredNum > approved && (
        <p className="text-[11px] text-[#DC2626]">
          Không vượt quá số đã duyệt ({formatVnd(approved)}) — phần chuyển thừa
          hãy khai vào ô thất thoát.
        </p>
      )}

      <Textarea
        value={reason}
        maxLength={2000}
        rows={2}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Điều gì đã xảy ra và đã xử lý thế nào? (tối thiểu 10 ký tự)"
        className="resize-none rounded-lg text-sm"
      />

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          void pickProof(file);
        }}
      />
      <div className="flex items-center gap-2">
        <AdminButton
          size="sm"
          variant="secondary"
          className="rounded-lg gap-1.5"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          <ImagePlus className="size-3.5" />
          {proofId ? "Đổi biên lai bổ sung" : "Thêm biên lai (tuỳ chọn)"}
        </AdminButton>
        {proofId && (
          <span className="truncate text-[11px] text-[#047857]">
            ✓ {proofName}
          </span>
        )}
      </div>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <AdminButton
            variant="secondary"
            size="sm"
            className="w-full rounded-lg gap-1.5"
            disabled={busy || tooShort || invalidNumbers || unchanged}
          >
            <Banknote className="size-3.5" /> Điều chỉnh sổ chi ngoài
          </AdminButton>
        </AlertDialogTrigger>
        <AlertDialogContent className="cz-admin rounded-2xl bg-[var(--c-card)] text-[var(--c-ink)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[var(--c-ink)]">
              Cập nhật sổ chi ngoài?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[var(--c-muted)]">
              Ghi nhận khách thực nhận <b>{formatVnd(deliveredNum)}</b> và thất
              thoát <b>{formatVnd(lossNum)}</b>. Không có khoản tiền nào trong
              hệ thống bị thay đổi — đây là ghi lại sự thật của khoản đã chuyển
              ngoài.
              {approved != null && deliveredNum < approved && (
                <>
                  {" "}
                  Hồ sơ sẽ tiếp tục được báo là{" "}
                  <b>còn thiếu {formatVnd(approved - deliveredNum)}</b> cho tới
                  khi bạn chuyển bù và khai lại.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                correct.mutate(
                  {
                    deliveredAmount: deliveredNum,
                    lossAmount: lossNum,
                    proofEvidenceId: proofId ?? undefined,
                    reason: reason.trim(),
                  },
                  {
                    onSuccess: () => {
                      setOpen(false);
                      setReason("");
                      setProofId(null);
                      setProofName("");
                    },
                  },
                )
              }
              disabled={correct.isPending}
            >
              {correct.isPending ? "Đang xử lý..." : "Xác nhận điều chỉnh"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

/**
 * Xoá nợ không đòi được — lối ra cho hồ sơ mắc kẹt vì auto-close cố tình bỏ qua sự cố
 * còn nợ. Không chuyển tiền: quỹ đã chi từ lúc bồi thường, đây là ghi nhận nền tảng chịu mất.
 */
export function WriteOffDebtPanel({
  id,
  outstanding,
  canWriteOff,
  writeOff,
}: {
  id: string;
  outstanding: number;
  canWriteOff: boolean;
  writeOff: {
    at: string;
    reason: string | null;
    byAdminName: string | null;
  } | null;
}) {
  const mutation = useWriteOffDebt(id);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const tooShort = reason.trim().length < 10;

  if (writeOff) {
    return (
      <section className="space-y-1 rounded-lg border border-[var(--c-line)] bg-[var(--c-card-2)] p-2.5 text-[11px]">
        <p className="font-bold uppercase text-[var(--c-muted)]">Đã xoá nợ</p>
        <p className="text-[var(--c-muted)]">
          {new Date(writeOff.at).toLocaleString("vi-VN")}
          {writeOff.byAdminName ? ` · ${writeOff.byAdminName}` : ""}
        </p>
        {writeOff.reason && (
          <p className="text-[var(--c-ink)]">{writeOff.reason}</p>
        )}
      </section>
    );
  }

  if (outstanding <= 0) return null;

  return (
    <section className="space-y-2 rounded-lg border border-[#D97706]/40 bg-[#D97706]/5 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--c-muted)]">
        Nợ chưa đòi được: {formatVnd(outstanding)}
      </p>
      {!canWriteOff ? (
        <p className="text-[11px] leading-snug text-[var(--c-muted)]">
          Hệ thống vẫn đang tự động trừ dần khoản này mỗi khi Tasker có thu
          nhập, và Tasker bị tạm khoá rút tiền. Chỉ nên xoá nợ sau khi đã để cơ
          chế thu hồi chạy đủ lâu.
        </p>
      ) : (
        <>
          <p className="text-[11px] leading-snug text-[var(--c-muted)]">
            Đã quá thời hạn mà không đòi được. Xoá nợ nghĩa là{" "}
            <b>nền tảng chịu mất</b> khoản này: Tasker được rút tiền trở lại và
            hồ sơ đủ điều kiện đóng. Không hoàn tác được.
          </p>
          <Textarea
            value={reason}
            maxLength={2000}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Lý do không thu hồi được (≥ 10 ký tự)"
            className="resize-none rounded-lg text-sm"
          />
          <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
              <AdminButton
                variant="danger"
                size="sm"
                className="w-full rounded-lg gap-1.5"
                disabled={mutation.isPending || tooShort}
              >
                <Eraser className="size-3.5" /> Xoá nợ {formatVnd(outstanding)}
              </AdminButton>
            </AlertDialogTrigger>
            <AlertDialogContent className="cz-admin rounded-2xl bg-[var(--c-card)] text-[var(--c-ink)]">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-[var(--c-ink)]">
                  Xác nhận xoá nợ {formatVnd(outstanding)}?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-[var(--c-muted)]">
                  Nền tảng sẽ <b className="text-[#DC2626]">ghi nhận mất</b>{" "}
                  khoản này và ngừng đòi. Thao tác được lưu vĩnh viễn kèm lý do
                  và gửi cảnh báo cho đội vận hành.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Huỷ</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() =>
                    mutation.mutate(reason.trim(), {
                      onSuccess: () => setOpen(false),
                    })
                  }
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? "Đang xử lý..." : "Xác nhận xoá nợ"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </section>
  );
}

/** Thu hồi/đảo bồi thường đã chi (sửa sai) — trong 72h, có lý do; reopen sự cố để soạn lại. */
/**
 * Đường lui RẺ: chưa đồng nào rời ví nên chỉ cần gỡ dấu "đã chốt", không phải đảo giao dịch.
 * Trước đây không có nút này, chốt nhầm thì phải chi tiền sai đi rồi mới đảo lại được.
 */
export function WithdrawDecisionPanel({
  id,
  decisionVersion,
}: {
  id: string;
  decisionVersion: number;
}) {
  const withdraw = useWithdrawDecision(id);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const tooShort = reason.trim().length < 10;

  return (
    <section className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--c-muted)]">
        Thu hồi quyết định (chưa chi trả)
      </p>
      <p className="text-[11px] leading-snug text-[var(--c-muted)]">
        Gỡ dấu &quot;đã chốt&quot; để sửa lại quyết định.{" "}
        <b>Không có giao dịch tiền nào bị đảo</b> vì chưa chi trả. Hồ sơ quay về
        đúng bước trước khi chốt — phản hồi của Tasker ở phiên bản này vẫn còn
        hiệu lực nếu bạn không sửa nội dung.
      </p>
      <Textarea
        value={reason}
        maxLength={1000}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        placeholder="Lý do thu hồi quyết định (≥ 10 ký tự)"
        className="resize-none rounded-lg text-sm"
      />
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <AdminButton
            variant="ghost"
            size="sm"
            className="w-full rounded-lg gap-1.5"
            disabled={withdraw.isPending || tooShort}
          >
            <Undo2 className="size-3.5" /> Thu hồi quyết định
          </AdminButton>
        </AlertDialogTrigger>
        <AlertDialogContent className="cz-admin rounded-2xl bg-[var(--c-card)] text-[var(--c-ink)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[var(--c-ink)]">
              Thu hồi quyết định đã chốt?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[var(--c-muted)]">
              Khách và Tasker đã nhận thông báo &quot;quyết định đã chốt&quot;
              nên cả hai sẽ được báo là hồ sơ đang được xem xét lại. Chưa có
              khoản tiền nào bị ảnh hưởng.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                withdraw.mutate(
                  {
                    expectedDecisionVersion: decisionVersion,
                    reason: reason.trim(),
                  },
                  { onSuccess: () => setOpen(false) },
                )
              }
              disabled={withdraw.isPending}
            >
              {withdraw.isPending ? "Đang xử lý..." : "Xác nhận thu hồi"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

export function ReverseCompensationPanel({
  id,
  decisionVersion,
  blockedReasons = [],
}: {
  id: string;
  /**
   * Version Admin đang NHÌN THẤY. Gửi kèm để BE từ chối nếu hồ sơ đã bị đảo/chi lại trong
   * lúc họ soạn lý do — lệnh đảo là lệnh chuyển tiền, không được chạy trên dữ liệu cũ.
   */
  decisionVersion: number;
  /** Lý do BE đã biết trước là không đảo được. Rỗng = đảo được. */
  blockedReasons?: string[];
}) {
  const reverse = useReverseCompensation(id);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const tooShort = reason.trim().length < 10;
  const blocked = blockedReasons.length > 0;

  if (blocked) {
    return (
      <section className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--c-muted)]">
          Hoàn tác chi trả
        </p>
        <div className="space-y-1 rounded-lg border border-[var(--c-line)] bg-[var(--c-card-2)] p-3">
          {blockedReasons.map((code) => (
            <p
              key={code}
              className="text-[11px] leading-snug text-[var(--c-muted)]"
            >
              <AlertTriangle className="mr-1 inline size-3.5" />
              {BLOCKED_REASON_LABEL[code] ?? code}
            </p>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--c-muted)]">
        Hoàn tác chi trả (sửa sai)
      </p>
      <p className="text-[11px] leading-snug text-[var(--c-muted)]">
        Đảo ngược toàn bộ giao dịch đã chi (đòi lại từ ví khách, trả lại ví
        Tasker, hoàn tiền về quỹ) và mở lại sự cố để soạn quyết định mới. Chỉ
        làm được trong <b>72 giờ</b> kể từ lúc chi, khi{" "}
        <b>chưa bắt đầu thu nợ</b> và ví khách còn đủ tiền để đòi lại.
      </p>
      <Textarea
        value={reason}
        maxLength={2000}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        placeholder="Vì sao phải hoàn tác? (tối thiểu 10 ký tự)"
        className="resize-none rounded-lg text-sm"
      />
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <AdminButton
            variant="danger"
            size="sm"
            className="w-full rounded-lg gap-1.5"
            disabled={reverse.isPending || tooShort}
          >
            <Undo2 className="size-3.5" /> Hoàn tác chi trả
          </AdminButton>
        </AlertDialogTrigger>
        <AlertDialogContent className="cz-admin rounded-2xl bg-[var(--c-card)] text-[var(--c-ink)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[var(--c-ink)]">
              Xác nhận hoàn tác chi trả?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[var(--c-muted)]">
              Thao tác này{" "}
              <b className="text-[#DC2626]">đảo ngược toàn bộ giao dịch tiền</b>{" "}
              và mở lại sự cố ở phiên bản quyết định mới. Không làm được nếu
              khách đã tiêu khoản tiền hoàn, hoặc đã bắt đầu thu nợ.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                reverse.mutate(
                  {
                    expectedDecisionVersion: decisionVersion,
                    reason: reason.trim(),
                  },
                  { onSuccess: () => setOpen(false) },
                )
              }
              disabled={reverse.isPending}
            >
              {reverse.isPending ? "Đang xử lý..." : "Xác nhận hoàn tác"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
