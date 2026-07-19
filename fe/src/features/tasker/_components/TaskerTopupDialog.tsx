"use client";

import { useState } from "react";
import { Loader2, WalletCards } from "lucide-react";
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
import { toast } from "sonner";
import {
  useCreateTaskerTopup,
  useTaskerTopupConfig,
} from "@/features/tasker/hooks/useTaskerWallet";

const QUICK_AMOUNTS = [100_000, 200_000, 500_000, 1_000_000];

const formatVnd = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

export function TaskerTopupDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState("");
  const { data: config, isLoading: configLoading } = useTaskerTopupConfig(open);
  const createTopup = useCreateTaskerTopup();
  const amountVnd = Number(amount);
  const isValidNumber = Number.isInteger(amountVnd) && amountVnd > 0;
  const belowMin = Boolean(
    config && isValidNumber && amountVnd < config.minVnd,
  );
  const aboveMax = Boolean(
    config && isValidNumber && amountVnd > config.maxVnd,
  );
  const canSubmit = isValidNumber && !belowMin && !aboveMax && !!config;
  const amountUsd =
    config && isValidNumber
      ? Math.max(0.01, Math.round((amountVnd / config.fxRate) * 100) / 100)
      : 0;

  const close = () => {
    if (createTopup.isPending) return;
    setAmount("");
    onClose();
  };

  const submit = () => {
    if (!canSubmit) return;
    createTopup.mutate(
      { amountVnd },
      {
        onSuccess: (result) => {
          if (!result.approveUrl) {
            toast.error(
              "PayPal không trả về link thanh toán, vui lòng thử lại",
            );
            return;
          }
          window.location.href = result.approveUrl;
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <WalletCards className="size-5 text-primary" />
            Nạp tiền vào ví Tasker
          </DialogTitle>
          <DialogDescription>
            Thanh toán qua PayPal, số tiền được cộng vào ví sau khi giao dịch
            hoàn tất.
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
            <Label htmlFor="tasker-topup-amount">Số tiền (VNĐ)</Label>
            <Input
              id="tasker-topup-amount"
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
                Nạp từ {formatVnd(config.minVnd)} đến {formatVnd(config.maxVnd)}
                .
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
                <span className="font-bold text-emerald-600">
                  {formatVnd(amountVnd)}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={close}
            disabled={createTopup.isPending}
          >
            Hủy
          </Button>
          <Button
            onClick={submit}
            disabled={!canSubmit || createTopup.isPending}
          >
            {createTopup.isPending && (
              <Loader2 className="size-4 animate-spin" />
            )}
            Thanh toán qua PayPal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
