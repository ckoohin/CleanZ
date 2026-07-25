"use client";

import { useState } from "react";
import { Loader2, Wallet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast";
import { useCreateTopup, useTopupConfig } from "../hooks/useCustomerWallet";

const QUICK_AMOUNTS = [100_000, 200_000, 500_000, 1_000_000];

const formatVnd = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

interface TopupDialogProps {
  open: boolean;
  onClose: () => void;
  /** Nạp để trả cho một booking cụ thể (luồng thiếu số dư). */
  bookingId?: string;
  /** Điền sẵn số tiền, ví dụ đúng phần còn thiếu của đơn đang đặt. */
  defaultAmountVnd?: number;
}

export const TopupDialog = ({
  open,
  onClose,
  bookingId,
  defaultAmountVnd,
}: TopupDialogProps) => {
  const [amount, setAmount] = useState(
    defaultAmountVnd ? String(defaultAmountVnd) : "",
  );
  const { data: config, isLoading: configLoading } = useTopupConfig();
  const createTopup = useCreateTopup();

  const amountVnd = Number(amount);
  const isValidNumber = Number.isInteger(amountVnd) && amountVnd > 0;

  const belowMin = Boolean(config && isValidNumber && amountVnd < config.minVnd);
  const aboveMax = Boolean(config && isValidNumber && amountVnd > config.maxVnd);
  const canSubmit = isValidNumber && !belowMin && !aboveMax && !!config;

  // PayPal sandbox thu bằng USD nên quy đổi theo tỷ giá admin cấu hình.
  const amountUsd =
    config && isValidNumber
      ? Math.max(0.01, Math.round((amountVnd / config.fxRate) * 100) / 100)
      : 0;

  const handleSubmit = () => {
    if (!canSubmit) return;

    createTopup.mutate(
      { amountVnd, ...(bookingId && { bookingId }) },
      {
        onSuccess: (result) => {
          if (!result.approveUrl) {
            toast.error("PayPal không trả về link thanh toán, vui lòng thử lại");
            return;
          }
          // Rời app sang PayPal; sau khi duyệt, PayPal đá về trang /topup/return.
          window.location.href = result.approveUrl;
        },
      },
    );
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && !createTopup.isPending) {
      setAmount(defaultAmountVnd ? String(defaultAmountVnd) : "");
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            Nạp tiền vào ví
          </DialogTitle>
          <DialogDescription>
            {bookingId
              ? "Số dư ví chưa đủ để thanh toán đơn này. Nạp thêm để tiếp tục."
              : "Thanh toán qua PayPal, tiền vào ví ngay sau khi duyệt."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-2">
            {QUICK_AMOUNTS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setAmount(String(value))}
                className={`rounded-xl border px-2 py-2 text-xs font-bold transition-colors ${
                  amount === String(value)
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                {value / 1000}k
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="topup-amount">Số tiền (VNĐ)</Label>
            <Input
              id="topup-amount"
              type="number"
              inputMode="numeric"
              placeholder="Ví dụ: 200000"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="font-mono"
            />

            {configLoading ? (
              <p className="text-xs text-muted-foreground">
                Đang tải hạn mức...
              </p>
            ) : config ? (
              <p className="text-xs text-muted-foreground">
                Nạp từ {formatVnd(config.minVnd)} đến {formatVnd(config.maxVnd)}.
                Tỷ giá {formatVnd(config.fxRate)} / 1 USD.
              </p>
            ) : null}

            {belowMin && config && (
              <p className="text-xs font-semibold text-destructive">
                Số tiền nạp tối thiểu là {formatVnd(config.minVnd)}
              </p>
            )}
            {aboveMax && config && (
              <p className="text-xs font-semibold text-destructive">
                Số tiền nạp tối đa là {formatVnd(config.maxVnd)}
              </p>
            )}
          </div>

          {canSubmit && (
            <div className="rounded-xl border border-border bg-muted/40 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">PayPal sẽ thu</span>
                <span className="font-mono font-bold">
                  ${amountUsd.toFixed(2)}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-muted-foreground">Ví được cộng</span>
                <span className="font-bold text-green-600">
                  {formatVnd(amountVnd)}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={createTopup.isPending}
          >
            Hủy
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || createTopup.isPending}
          >
            {createTopup.isPending && (
              <Loader2 className="w-4 h-4 animate-spin" />
            )}
            Thanh toán qua PayPal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
