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
import { Banknote, AlertTriangle, Undo2, QrCode, ImagePlus } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  useCompensate,
  useCompensateManual,
  useReverseCompensation,
  useUploadTransferProof,
} from "../../hooks/useAdminIncident";
import { getErrorMessage } from "@/features/auth/hooks/auth.hooks";
import { formatVnd } from "@/features/incident/shared/incident.labels";

/** Chi trả bồi thường — CHUYỂN TIỀN THẬT qua ví (trừ Tasker, hoàn ví Khách, chi quỹ nền tảng).
 *  Confirm mạnh vì không hoàn tác dễ; idempotent + rollback nguyên tử ở BE. */
export function CompensatePanel({
  id,
  code,
  amount,
  taskerBorne,
  platformBorne,
  blockedReason,
}: {
  id: string;
  code?: string | null;
  amount: number | null;
  taskerBorne?: number | null;
  platformBorne?: number | null;
  blockedReason?: string;
}) {
  const compensate = useCompensate(id);
  const [open, setOpen] = useState(false);
  // P0.4 — mở luồng thủ công khi BE báo quỹ nền tảng không đủ.
  const [showManual, setShowManual] = useState(false);

  return (
    <section className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--c-muted)]">Chi trả bồi thường</p>
      {blockedReason ? (
        <p className="flex items-start gap-1 rounded-lg bg-[rgba(217,119,6,0.14)] border border-[var(--c-line)] p-2.5 text-xs text-[#D97706]">
          <AlertTriangle className="mt-px size-3.5 shrink-0" /> {blockedReason}
        </p>
      ) : (
        <>
          <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
              <AdminButton variant="primary" size="sm" className="w-full rounded-lg gap-1.5" disabled={compensate.isPending}>
                <Banknote className="size-3.5" /> Chi trả bồi thường {formatVnd(amount)}
              </AdminButton>
            </AlertDialogTrigger>
            <AlertDialogContent className="cz-admin rounded-2xl bg-[var(--c-card)] text-[var(--c-ink)]">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-[var(--c-ink)]">Xác nhận chi trả bồi thường?</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-2 text-[var(--c-muted)]">
                    <p>
                      Thao tác này <b className="text-[#DC2626]">chuyển tiền THẬT</b> và khó hoàn tác:
                    </p>
                    <ul className="list-disc space-y-0.5 pl-4 text-xs">
                      <li>Hoàn <b>{formatVnd(amount)}</b> vào ví Khách hàng.</li>
                      <li>Trừ <b>{formatVnd(taskerBorne)}</b> từ ví/cọc Tasker (phần Tasker chịu).</li>
                      <li>Quỹ nền tảng chi <b>{formatVnd(platformBorne)}</b> (+ phần Tasker chưa đủ).</li>
                    </ul>
                    <p className="text-[11px]">
                      Nếu ví/cọc Tasker không đủ, phần thiếu ghi thành <b>nợ</b> và Tasker bị tạm khóa nhận đơn tới khi nạp bù.
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
                        if (/quỹ nền tảng không đủ/i.test(getErrorMessage(e))) {
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
          <p className="text-[11px] text-[var(--c-muted)]">
            Nếu báo <b>quỹ nền tảng không đủ</b>: nạp quỹ hệ thống rồi thử lại, hoặc dùng <b>chuyển khoản thủ công</b> bên dưới.
          </p>
          {showManual && <ManualCompensatePanel id={id} code={code} amount={amount} />}
        </>
      )}
    </section>
  );
}

/**
 * P0.4 — Chi trả THỦ CÔNG khi quỹ SYSTEM không đủ: admin nhập ngân hàng khách → quét QR
 * (VietQR) chuyển khoản toàn bộ số duyệt → upload ảnh minh chứng → xác nhận.
 * BE sẽ trừ phần Tasker chịu về quỹ, KHÔNG hoàn ví khách (khách đã nhận chuyển khoản).
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

  const qrUrl =
    bankCode.trim() && account.trim() && amount
      ? `https://img.vietqr.io/image/${encodeURIComponent(bankCode.trim())}-${encodeURIComponent(account.trim())}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(`CLEANZ BOI THUONG ${code ?? ""}`.trim())}`
      : null;

  const pickProof = async (f: File | undefined) => {
    if (!f) return;
    const ev = await upload.mutateAsync(f);
    setProofId(ev.id);
    setProofName(f.name);
  };

  return (
    <div className="space-y-2 rounded-lg border border-[#D97706]/40 bg-[#D97706]/5 p-3">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase text-[var(--c-muted)]">
        <QrCode className="size-3.5" /> Chuyển khoản thủ công cho khách
      </p>
      <p className="text-[11px] leading-snug text-[var(--c-muted)]">
        Quỹ nền tảng không đủ để chi tự động. Nhập ngân hàng của khách để tạo QR, chuyển khoản{" "}
        <b>{formatVnd(amount)}</b>, sau đó tải ảnh chuyển khoản làm minh chứng và xác nhận.
        Phần Tasker chịu vẫn được trừ tự động về quỹ.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Input
          value={bankCode}
          onChange={(e) => setBankCode(e.target.value)}
          placeholder="Mã ngân hàng (VCB, TCB…)"
          className="h-8 rounded-lg text-sm"
        />
        <Input
          value={account}
          onChange={(e) => setAccount(e.target.value)}
          placeholder="Số tài khoản khách"
          className="h-8 rounded-lg text-sm"
        />
      </div>
      {qrUrl && (
        <div className="flex justify-center rounded-lg border border-[var(--c-line)] bg-white p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrUrl} alt="VietQR chuyển khoản" className="h-52 w-auto" />
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={(e) => void pickProof(e.target.files?.[0])}
      />
      <div className="flex items-center gap-2">
        <AdminButton
          size="sm"
          variant="secondary"
          className="rounded-lg gap-1.5"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          <ImagePlus className="size-3.5" /> {proofId ? "Đổi ảnh minh chứng" : "Tải ảnh minh chứng"}
        </AdminButton>
        {proofId && (
          <span className="truncate text-[11px] text-[#047857]">✓ {proofName}</span>
        )}
      </div>
      <AdminButton
        size="sm"
        variant="primary"
        className="w-full rounded-lg gap-1.5"
        disabled={busy || !proofId}
        onClick={() => proofId && manual.mutate({ proofEvidenceId: proofId })}
      >
        <Banknote className="size-3.5" />
        {manual.isPending ? "Đang xử lý..." : "Xác nhận đã chuyển khoản thủ công"}
      </AdminButton>
    </div>
  );
}

/** Thu hồi/đảo bồi thường đã chi (sửa sai) — Admin #2, có lý do; reopen sự cố để soạn lại. */
export function ReverseCompensationPanel({ id }: { id: string }) {
  const reverse = useReverseCompensation(id);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const tooShort = reason.trim().length < 10;

  return (
    <section className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--c-muted)]">Thu hồi bồi thường (sửa sai)</p>
      <p className="text-[11px] leading-snug text-[var(--c-muted)]">
        Đảo toàn bộ giao dịch đã chi (đòi lại ví Khách, trả ví Tasker, hoàn quỹ) và mở lại sự cố để soạn quyết định mới.
        Phải do <b>một Admin khác</b> người đã chốt; chỉ được khi <b>chưa thu hồi nợ</b> và ví Khách còn đủ để đòi lại.
      </p>
      <Textarea
        value={reason}
        maxLength={2000}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        placeholder="Lý do thu hồi (≥ 10 ký tự)"
        className="resize-none rounded-lg text-sm"
      />
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <AdminButton variant="danger" size="sm" className="w-full rounded-lg gap-1.5" disabled={reverse.isPending || tooShort}>
            <Undo2 className="size-3.5" /> Thu hồi bồi thường
          </AdminButton>
        </AlertDialogTrigger>
        <AlertDialogContent className="cz-admin rounded-2xl bg-[var(--c-card)] text-[var(--c-ink)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[var(--c-ink)]">Xác nhận thu hồi bồi thường?</AlertDialogTitle>
            <AlertDialogDescription className="text-[var(--c-muted)]">
              Thao tác này <b className="text-[#DC2626]">đảo toàn bộ giao dịch tiền</b> và mở lại sự cố ở phiên bản quyết định mới.
              Không thực hiện được nếu Khách đã tiêu khoản hoàn hoặc đã bắt đầu thu hồi nợ.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => reverse.mutate(reason.trim(), { onSuccess: () => setOpen(false) })}
              disabled={reverse.isPending}
            >
              {reverse.isPending ? "Đang xử lý..." : "Xác nhận thu hồi"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
