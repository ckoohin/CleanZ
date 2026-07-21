"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { Loader2, Copy, CheckCheck } from "lucide-react";
import type { BookingPayment } from "@/features/booking/types/booking.types";
import { customerBookingApi } from "@/features/booking/services/booking.service";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const POLL_INTERVAL_MS = 10_000;

type TerminalStatus = "CANCELLED" | "EXPIRED" | "COMPLETED";

interface OnlinePaymentPanelProps {
  bookingId: string;
  payment: BookingPayment;
  totalPrice: number;
  transferContent: string;
  /** Khi booking chuyển sang trạng thái kết thúc, dừng poll tự động. */
  bookingStatus?: string;
}

function fmtCurrency(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Không sao chép được, hãy copy thủ công.");
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="shrink-0 flex items-center gap-1 text-xs font-bold text-primary px-2 py-1 rounded-lg bg-primary/10 active:scale-95 transition-transform"
    >
      {copied ? (
        <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
      {copied ? "Đã copy" : "Copy"}
    </button>
  );
}

function InfoRow({
  label,
  value,
  copyable,
}: {
  label: string;
  value: string;
  copyable?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm font-bold text-foreground truncate">{value}</span>
        {copyable && <CopyButton text={value} />}
      </div>
    </div>
  );
}

const TERMINAL_STATUSES: TerminalStatus[] = ["CANCELLED", "EXPIRED", "COMPLETED"];

export function OnlinePaymentPanel({
  bookingId,
  payment,
  totalPrice,
  transferContent,
  bookingStatus,
}: OnlinePaymentPanelProps) {
  const queryClient = useQueryClient();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const paidRef = useRef(false);

  const { payosBin, payosAccountNumber, payosAccountName } = payment;
  const isFailed = payment.status === "FAILED";

  const vietQrUrl =
    payosBin && payosAccountNumber
      ? `https://img.vietqr.io/image/${payosBin}-${payosAccountNumber}-compact2.png` +
        `?amount=${totalPrice}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(payosAccountName ?? "")}`
      : null;

  const checkPayment = useCallback(async () => {
    if (paidRef.current) return;
    if (bookingStatus && TERMINAL_STATUSES.includes(bookingStatus as TerminalStatus)) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    try {
      const { paid } = await customerBookingApi.verifyPayment(bookingId);
      if (paid) {
        paidRef.current = true;
        if (intervalRef.current) clearInterval(intervalRef.current);
        toast.success("Thanh toán xác nhận thành công! Đang tìm Tasker...");
        void queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
        void queryClient.invalidateQueries({ queryKey: ["booking", "my-active"] });
      }
    } catch {
      // silent — sẽ retry ở lần poll tiếp theo
    }
  }, [bookingId, queryClient]);

  useEffect(() => {
    intervalRef.current = setInterval(checkPayment, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [checkPayment]);

  return (
    <div
      className={`border rounded-3xl p-5 shadow-sm space-y-4 animate-in fade-in duration-300 ${
        isFailed
          ? "bg-gradient-to-br from-red-500/5 to-orange-500/5 border-red-500/20"
          : "bg-gradient-to-br from-primary/5 to-orange-500/5 border-primary/20"
      }`}
    >
      {/* Header */}
      <div>
        <h3 className="font-extrabold text-sm text-foreground">
          {isFailed ? "Giao dịch thất bại — chuyển khoản lại" : "Chuyển khoản ngân hàng"}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isFailed
            ? "Mở app ngân hàng, chuyển khoản theo thông tin bên dưới."
            : "Mở app ngân hàng, chuyển khoản theo thông tin bên dưới. Hệ thống tự xác nhận khi nhận được tiền."}
        </p>
      </div>

      {/* VietQR */}
      {vietQrUrl ? (
        <div className="flex flex-col items-center gap-2">
          <p className="text-[11px] text-muted-foreground">
            Quét mã từ app ngân hàng (tính năng &ldquo;QR từ ảnh&rdquo;)
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={vietQrUrl}
            alt="VietQR thanh toán"
            className="w-52 h-52 rounded-2xl border border-border/30 bg-white object-contain p-2"
          />
        </div>
      ) : (
        <div className="flex justify-center py-2">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* Thông tin chuyển khoản */}
      {payosAccountNumber && (
        <div className="bg-card rounded-2xl border border-border/40 px-4 divide-y divide-border/30">
          {payosAccountName && (
            <InfoRow label="Chủ tài khoản" value={payosAccountName} />
          )}
          <InfoRow label="Số tài khoản" value={payosAccountNumber} copyable />
          <InfoRow label="Số tiền" value={fmtCurrency(totalPrice)} copyable />
          <InfoRow label="Nội dung CK" value={transferContent} copyable />
        </div>
      )}

      {/* Trạng thái tự động kiểm tra */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Tự động xác nhận sau khi nhận được tiền</span>
      </div>

      {/* Fallback link PayOS */}
      {payment.payosCheckoutUrl && (
        <p className="text-center text-xs text-muted-foreground">
          Hoặc{" "}
          <a
            href={payment.payosCheckoutUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-primary"
          >
            mở trang thanh toán PayOS
          </a>
        </p>
      )}
    </div>
  );
}
