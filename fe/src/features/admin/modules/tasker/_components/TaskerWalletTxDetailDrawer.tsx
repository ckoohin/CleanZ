"use client";

import React, { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/lib/toast";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Copy,
  Check,
  Calendar,
  Wallet,
  Receipt,
  FileText,
  CheckCircle2,
  Clock,
  ExternalLink,
} from "lucide-react";
import type { TaskerWalletTransaction } from "../types/admin-tasker.types";

interface TaskerWalletTxDetailDrawerProps {
  transaction: TaskerWalletTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectBookingId?: (bookingId: string) => void;
}

function fmtPrice(n: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(n);
}

function fmtDateTime(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("vi-VN", {
    dateStyle: "medium",
    timeStyle: "medium",
  });
}

function extractBookingCode(label: string): string | null {
  const match = label.match(/booking\s+([A-Z0-9]+)/i) || label.match(/\b(BK[A-Z0-9]+)\b/);
  return match ? match[1] : null;
}

export function TaskerWalletTxDetailDrawer({
  transaction,
  open,
  onOpenChange,
  onSelectBookingId,
}: TaskerWalletTxDetailDrawerProps) {
  const [copied, setCopied] = useState(false);

  if (!transaction) return null;

  const handleCopyId = () => {
    navigator.clipboard.writeText(transaction.id);
    setCopied(true);
    toast.success("Đã sao chép mã giao dịch!");
    setTimeout(() => setCopied(false), 2000);
  };

  const bookingCode = extractBookingCode(transaction.label || "");
  const prevBalance = transaction.isPositive
    ? transaction.balance - transaction.amount
    : transaction.balance + transaction.amount;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md w-full overflow-y-auto custom-scrollbar p-6">
        <SheetHeader className="pb-4 border-b border-[var(--c-line)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[var(--c-primary-soft)] text-[var(--c-primary-strong)]">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <SheetTitle className="text-base font-bold text-[var(--c-ink)]">
                Chi tiết Giao dịch Ví
              </SheetTitle>
              <SheetDescription className="text-xs text-[var(--c-muted)]">
                Đối soát chi tiết biến động số dư ví Tasker
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="py-5 space-y-5">
          {/* Main Amount Card */}
          <div
            className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center relative overflow-hidden ${
              transaction.isPositive
                ? "bg-[#0E9F6E]/10 border-[#0E9F6E]/20 text-[#0E9F6E]"
                : "bg-[#E11D48]/10 border-[#E11D48]/20 text-[#E11D48]"
            }`}
          >
            <div className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
              {transaction.isPositive ? (
                <>
                  <ArrowDownLeft className="w-4 h-4" />
                  <span>Dòng Tiền Cộng (+)</span>
                </>
              ) : (
                <>
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Dòng Tiền Trừ (-)</span>
                </>
              )}
            </div>
            <div className="text-3xl font-black tabular-nums tracking-tight my-1">
              {transaction.isPositive ? "+" : "-"}
              {fmtPrice(transaction.amount)}
            </div>
            <p className="text-xs opacity-90 font-medium max-w-[280px]">
              {transaction.label || transaction.type}
            </p>
          </div>

          {/* Transaction ID & Status */}
          <div className="p-3.5 rounded-2xl bg-[var(--c-card-2)] border border-[var(--c-line)] space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--c-muted)] font-medium">Mã giao dịch:</span>
              <button
                type="button"
                onClick={handleCopyId}
                className="inline-flex items-center gap-1 font-mono font-bold text-[var(--c-ink)] hover:text-[var(--c-primary-strong)] transition-colors text-[11px]"
                title="Bấm để sao chép"
              >
                <span>{transaction.id.substring(0, 18)}...</span>
                {copied ? <Check className="w-3 h-3 text-[#0E9F6E]" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>

            <div className="flex items-center justify-between text-xs border-t border-[var(--c-line)] pt-2.5">
              <span className="text-[var(--c-muted)] font-medium">Trạng thái xử lý:</span>
              {transaction.status === "SUCCESS" ? (
                <Badge variant="outline" className="bg-[#0E9F6E]/10 text-[#0E9F6E] border-none font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Thành công
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-[#D97706]/10 text-[#D97706] border-none font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Đang xử lý
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between text-xs border-t border-[var(--c-line)] pt-2.5">
              <span className="text-[var(--c-muted)] font-medium">Loại phân loại:</span>
              <Badge variant="outline" className="bg-[var(--c-card)] border-[var(--c-line)] font-mono text-[10px] text-[var(--c-ink)] uppercase">
                {transaction.type}
              </Badge>
            </div>
          </div>

          {/* Balance Change Details */}
          <div className="p-4 rounded-2xl bg-[var(--c-card-2)] border border-[var(--c-line)] space-y-3">
            <h4 className="text-xs font-bold text-[var(--c-ink)] uppercase tracking-wider flex items-center gap-1.5 border-b border-[var(--c-line)] pb-2">
              <Wallet className="w-4 h-4 text-[var(--c-primary-strong)]" />
              <span>Biến động dư ví</span>
            </h4>

            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--c-muted)]">Số dư trước biến động:</span>
              <span className="font-semibold text-[var(--c-ink)] tabular-nums">
                {fmtPrice(Math.max(0, prevBalance))}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--c-muted)]">Số tiền biến động:</span>
              <span className={`font-bold tabular-nums ${transaction.isPositive ? "text-[#0E9F6E]" : "text-[#E11D48]"}`}>
                {transaction.isPositive ? "+" : "-"}{fmtPrice(transaction.amount)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs border-t border-[var(--c-line)] pt-2 font-bold">
              <span className="text-[var(--c-ink)]">Số dư cuối sau biến động:</span>
              <span className="text-base text-[var(--c-primary-strong)] tabular-nums">
                {fmtPrice(transaction.balance)}
              </span>
            </div>
          </div>

          {/* Related Info */}
          <div className="p-4 rounded-2xl bg-[var(--c-card-2)] border border-[var(--c-line)] space-y-3">
            <h4 className="text-xs font-bold text-[var(--c-ink)] uppercase tracking-wider flex items-center gap-1.5 border-b border-[var(--c-line)] pb-2">
              <FileText className="w-4 h-4 text-[var(--c-primary-strong)]" />
              <span>Thông tin tham chiếu</span>
            </h4>

            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--c-muted)]">Thời gian ghi nhận:</span>
              <span className="font-semibold text-[var(--c-ink)] tabular-nums flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[var(--c-muted)]" />
                {fmtDateTime(transaction.date)}
              </span>
            </div>

            {bookingCode && (
              <div className="flex items-center justify-between text-xs border-t border-[var(--c-line)] pt-2">
                <span className="text-[var(--c-muted)]">Mã đơn liên quan:</span>
                <button
                  type="button"
                  onClick={() => {
                    if (onSelectBookingId && bookingCode) {
                      onSelectBookingId(bookingCode);
                    }
                  }}
                  className="font-bold text-[var(--c-primary-strong)] hover:underline inline-flex items-center gap-1"
                >
                  <span>{bookingCode}</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
