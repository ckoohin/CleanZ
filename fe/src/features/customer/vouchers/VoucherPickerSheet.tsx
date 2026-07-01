"use client";

import React, { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ChevronRight, TicketPercent, Clock, AlertCircle, CheckCircle2, Loader2, Tag } from "lucide-react";
import { useCustomerVouchers, type AvailableVoucher } from "./useCustomerVouchers";
import { cn } from "@/lib/utils";

function fmtCurrency(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

function formatEndDate(dateStr?: string | null) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return `HSD: ${d.toLocaleDateString("vi-VN")}`;
}

function getDisabledLabel(reason: AvailableVoucher["disabledReason"]): string {
  switch (reason) {
    case "NOT_STARTED": return "Chưa đến ngày áp dụng";
    case "EXHAUSTED": return "Đã hết lượt dùng";
    case "PER_LIMIT_REACHED": return "Bạn đã dùng hết lượt";
    default: return "";
  }
}

function VoucherCard({
  voucher,
  selected,
  onSelect,
}: {
  voucher: AvailableVoucher;
  selected: boolean;
  onSelect: () => void;
}) {
  const disabled = !voucher.canUse;

  const discountLabel =
    voucher.type === "PERCENT"
      ? `Giảm ${voucher.value}%${voucher.maxDiscount ? ` (tối đa ${fmtCurrency(voucher.maxDiscount)})` : ""}`
      : `Giảm ${fmtCurrency(voucher.value)}`;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "w-full text-left flex items-stretch gap-0 rounded-2xl border overflow-hidden transition-all",
        selected
          ? "border-primary bg-primary/5"
          : disabled
          ? "border-border/40 bg-muted/30 opacity-60"
          : "border-border/60 bg-card hover:border-primary/40 hover:bg-primary/[0.02]",
        disabled && "cursor-not-allowed",
      )}
    >
      {/* Accent bar */}
      <div
        className={cn(
          "w-1.5 shrink-0",
          selected ? "bg-primary" : disabled ? "bg-border" : "bg-primary/30",
        )}
      />

      <div className="flex-1 p-3.5 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <TicketPercent
              className={cn(
                "size-3.5 shrink-0",
                selected ? "text-primary" : disabled ? "text-muted-foreground" : "text-primary/70",
              )}
            />
            <span
              className={cn(
                "font-mono text-xs font-bold tracking-wide truncate",
                selected ? "text-primary" : disabled ? "text-muted-foreground" : "text-primary",
              )}
            >
              {voucher.code}
            </span>
            {voucher.source === "ISSUED" && (
              <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                Của bạn
              </span>
            )}
          </div>
          {selected && <CheckCircle2 className="size-4 text-primary shrink-0" />}
        </div>

        <p
          className={cn(
            "text-sm font-semibold leading-tight",
            disabled ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {voucher.name}
        </p>

        <p
          className={cn(
            "text-xs font-medium",
            selected ? "text-primary" : disabled ? "text-muted-foreground" : "text-emerald-600",
          )}
        >
          {discountLabel}
        </p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {voucher.minOrderAmount > 0 && (
            <span className="text-[11px] text-muted-foreground">
              Đơn tối thiểu: {fmtCurrency(voucher.minOrderAmount)}
            </span>
          )}
          {voucher.endDate && (
            <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
              <Clock className="size-3" />
              {formatEndDate(voucher.endDate)}
            </span>
          )}
          {voucher.remainingUses !== null && voucher.remainingUses !== undefined && (
            <span className="text-[11px] text-muted-foreground">
              Còn {voucher.remainingUses} lượt
            </span>
          )}
        </div>

        {disabled && voucher.disabledReason && (
          <div className="flex items-center gap-1 rounded-lg bg-muted/60 px-2 py-1">
            <AlertCircle className="size-3 text-muted-foreground shrink-0" />
            <span className="text-[11px] text-muted-foreground font-medium">
              {getDisabledLabel(voucher.disabledReason)}
            </span>
          </div>
        )}
      </div>
    </button>
  );
}

interface VoucherPickerSheetProps {
  packageId?: string;
  selectedCode: string;
  onSelect: (code: string) => void;
}

export function VoucherPickerSheet({
  packageId,
  selectedCode,
  onSelect,
}: VoucherPickerSheetProps) {
  const [open, setOpen] = useState(false);
  const { data: vouchers = [], isLoading } = useCustomerVouchers(
    open ? packageId : undefined,
  );

  const handleSelect = (code: string) => {
    onSelect(selectedCode === code ? "" : code);
    setOpen(false);
  };

  const usableCount = vouchers.filter((v) => v.canUse).length;
  const selectedVoucher = vouchers.find((v) => v.code === selectedCode);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className={cn(
            "w-full flex items-center justify-between gap-3 rounded-xl border px-4 py-3.5 text-sm transition-all",
            selectedCode
              ? "border-primary bg-primary/5 text-foreground"
              : "border-border/60 bg-background text-muted-foreground hover:border-primary/40",
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Tag className={cn("size-4 shrink-0", selectedCode ? "text-primary" : "text-muted-foreground")} />
            {selectedVoucher ? (
              <div className="text-left min-w-0">
                <p className="font-semibold text-foreground truncate">{selectedVoucher.name}</p>
                <p className="text-xs text-emerald-600 font-medium">
                  {selectedVoucher.type === "PERCENT"
                    ? `Giảm ${selectedVoucher.value}%`
                    : `Giảm ${fmtCurrency(selectedVoucher.value)}`}
                </p>
              </div>
            ) : (
              <span>Chọn hoặc nhập mã voucher</span>
            )}
          </div>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </SheetTrigger>

      <SheetContent side="bottom" className="max-h-[85dvh] rounded-t-2xl p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-3 border-b shrink-0">
          <SheetTitle className="text-base font-bold">
            Chọn voucher
            {usableCount > 0 && (
              <span className="ml-2 text-sm font-medium text-primary">
                ({usableCount} khả dụng)
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
          {isLoading && (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              <span className="text-sm">Đang tải voucher...</span>
            </div>
          )}

          {!isLoading && vouchers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
              <TicketPercent className="size-10 opacity-30" />
              <p className="text-sm font-medium">Không có voucher nào</p>
              <p className="text-xs text-center">
                Nhập mã voucher thủ công hoặc đặt đơn không dùng voucher
              </p>
            </div>
          )}

          {!isLoading && vouchers.length > 0 && (
            <>
              {/* Voucher khả dụng */}
              {vouchers.filter((v) => v.canUse).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-0.5">
                    Có thể sử dụng
                  </p>
                  {vouchers
                    .filter((v) => v.canUse)
                    .map((v) => (
                      <VoucherCard
                        key={v.id}
                        voucher={v}
                        selected={selectedCode === v.code}
                        onSelect={() => handleSelect(v.code)}
                      />
                    ))}
                </div>
              )}

              {/* Voucher chưa dùng được */}
              {vouchers.filter((v) => !v.canUse).length > 0 && (
                <div className="space-y-2 mt-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-0.5">
                    Chưa thể sử dụng
                  </p>
                  {vouchers
                    .filter((v) => !v.canUse)
                    .map((v) => (
                      <VoucherCard
                        key={v.id}
                        voucher={v}
                        selected={false}
                        onSelect={() => {}}
                      />
                    ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Nhập mã thủ công */}
        <div className="px-4 py-3 border-t bg-background shrink-0">
          <ManualCodeInput
            value={selectedCode}
            onApply={(code) => {
              onSelect(code);
              setOpen(false);
            }}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ManualCodeInput({
  value,
  onApply,
}: {
  value: string;
  onApply: (code: string) => void;
}) {
  const [input, setInput] = React.useState(value);

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value.toUpperCase())}
        placeholder="Nhập mã voucher..."
        className="flex-1 bg-muted/40 border border-border rounded-xl px-3 py-2.5 text-sm font-mono text-foreground focus:ring-2 focus:ring-primary/30 outline-none"
      />
      <button
        type="button"
        onClick={() => onApply(input.trim())}
        disabled={!input.trim()}
        className="shrink-0 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-40"
      >
        Áp dụng
      </button>
    </div>
  );
}
