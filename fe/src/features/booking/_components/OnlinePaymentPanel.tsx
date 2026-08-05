"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { Loader2, Copy, CheckCheck } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type { BookingPayment } from "@/features/booking/types/booking.types";
import { customerBookingApi } from "@/features/booking/services/booking.service";
import { toast } from "@/lib/toast";
import { useQueryClient } from "@tanstack/react-query";

const POLL_INTERVAL_MS = 5_000;

interface OnlinePaymentPanelProps {
  /** Đơn nháp đang chờ tiền — booking chỉ được tạo sau khi PayOS báo PAID. */
  draftId: string;
  payment: BookingPayment;
  totalPrice: number;
  /** Hạn quét QR (ISO). Hết hạn thì ngừng poll và báo khách đặt lại. */
  expiresAt?: string | null;
  /** Gọi khi booking đã được tạo xong từ đơn nháp. */
  onPaid: (bookingId: string) => void;
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
        <span className="text-sm font-bold text-foreground truncate">
          {value}
        </span>
        {copyable && <CopyButton text={value} />}
      </div>
    </div>
  );
}

function formatCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor(total / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function OnlinePaymentPanel({
  draftId,
  payment,
  totalPrice,
  expiresAt,
  onPaid,
}: OnlinePaymentPanelProps) {
  const queryClient = useQueryClient();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const paidRef = useRef(false);
  // Giá trị thật được tính trong effect đếm ngược bên dưới — không gọi Date.now()
  // khi render để component giữ tính thuần khiết.
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const isExpired = remainingMs != null && remainingMs <= 0;

  const { payosAccountNumber, payosAccountName, payosQrCode, payosDescription } =
    payment;
  const isFailed = payment.status === "FAILED";

  // Dùng thẳng chuỗi VietQR do PayOS trả về. Trước đây FE tự ghép URL
  // img.vietqr.io với addInfo tự chế, nên nội dung CK trong QR không khớp nội dung
  // PayOS đã ký: khách chuyển tiền xong mà cổng không nhận ra giao dịch, đơn nháp
  // hết hạn và tiền đã đi mà không có booking nào.
  const transferContent = payosDescription ?? null;

  const checkPayment = useCallback(async () => {
    if (paidRef.current) return;
    try {
      const { paid, bookingId } =
        await customerBookingApi.verifyDraftPayment(draftId);
      if (paid && bookingId) {
        paidRef.current = true;
        if (intervalRef.current) clearInterval(intervalRef.current);
        toast.success("Thanh toán thành công! Đang tìm Tasker...");
        void queryClient.invalidateQueries({
          queryKey: ["booking", "my-active"],
        });
        onPaid(bookingId);
      }
    } catch {
      // silent — sẽ retry ở lần poll tiếp theo
    }
  }, [draftId, onPaid, queryClient]);

  useEffect(() => {
    if (isExpired) return;
    intervalRef.current = setInterval(checkPayment, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [checkPayment, isExpired]);

  // Đếm ngược hạn thanh toán để khách biết còn bao lâu phải chuyển khoản.
  useEffect(() => {
    if (!expiresAt) return;
    const deadline = new Date(expiresAt).getTime();
    const tick = () => setRemainingMs(deadline - Date.now());
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  return (
    <div
      className={`border rounded-3xl p-5 shadow-sm space-y-4 animate-in fade-in duration-300 ${
        isFailed || isExpired
          ? "bg-gradient-to-br from-red-500/5 to-orange-500/5 border-red-500/20"
          : "bg-gradient-to-br from-primary/5 to-orange-500/5 border-primary/20"
      }`}
    >
      {/* Header */}
      <div>
        <h3 className="font-extrabold text-sm text-foreground">
          {isExpired
            ? "Hết hạn thanh toán"
            : isFailed
              ? "Giao dịch thất bại — chuyển khoản lại"
              : "Chuyển khoản để hoàn tất đặt lịch"}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isExpired
            ? "Yêu cầu thanh toán đã hết hạn và đơn chưa được tạo. Vui lòng đặt lại."
            : "Đơn chỉ được tạo sau khi CleanZ nhận được tiền. Mở app ngân hàng và chuyển khoản theo thông tin bên dưới."}
        </p>
      </div>

      {remainingMs != null && !isExpired && (
        <div className="flex items-center justify-center gap-2 text-xs font-bold text-primary">
          <span>Còn lại {formatCountdown(remainingMs)}</span>
        </div>
      )}

      {/* VietQR — chuỗi do PayOS ký, render tại chỗ */}
      {isExpired ? null : payosQrCode ? (
        <div className="flex flex-col items-center gap-2">
          <p className="text-[11px] text-muted-foreground">
            Quét mã từ app ngân hàng (tính năng &ldquo;QR từ ảnh&rdquo;)
          </p>
          <div className="rounded-2xl border border-border/30 bg-white p-3">
            <QRCodeSVG value={payosQrCode} size={192} level="M" />
          </div>
        </div>
      ) : (
        <div className="flex justify-center py-2">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* Thông tin chuyển khoản */}
      {!isExpired && payosAccountNumber && (
        <div className="bg-card rounded-2xl border border-border/40 px-4 divide-y divide-border/30">
          {payosAccountName && (
            <InfoRow label="Chủ tài khoản" value={payosAccountName} />
          )}
          <InfoRow label="Số tài khoản" value={payosAccountNumber} copyable />
          <InfoRow label="Số tiền" value={fmtCurrency(totalPrice)} copyable />
          {transferContent && (
            <InfoRow label="Nội dung CK" value={transferContent} copyable />
          )}
        </div>
      )}

      {/* Trạng thái tự động kiểm tra */}
      {!isExpired && (
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Đơn sẽ được tạo ngay khi nhận được tiền</span>
        </div>
      )}

      {/* Fallback link PayOS */}
      {!isExpired && payment.payosCheckoutUrl && (
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
