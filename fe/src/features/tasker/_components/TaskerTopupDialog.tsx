"use client";

import { useState } from "react";
import { ArrowLeft, Loader2, WalletCards } from "lucide-react";
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
  useConfirmTaskerAdyenTopup,
  useCreateTaskerTopup,
  useTaskerTopupConfig,
} from "@/features/tasker/hooks/useTaskerWallet";
import { useAdyenDropin } from "@/features/wallet/hooks/useAdyenDropin";

const QUICK_AMOUNTS = [100_000, 200_000, 500_000, 1_000_000];

type Provider = "PAYPAL" | "ADYEN";

const formatVnd = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

interface AdyenSessionState {
  sessionId: string;
  sessionData: string;
  clientKey: string;
}

export function TaskerTopupDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [step, setStep] = useState<"select" | "pay">("select");
  const [amount, setAmount] = useState("");
  const [provider, setProvider] = useState<Provider>("ADYEN");
  const [adyenSession, setAdyenSession] = useState<AdyenSessionState | null>(
    null,
  );

  const { data: config, isLoading: configLoading } = useTaskerTopupConfig(open);
  const createTopup = useCreateTaskerTopup();
  const confirmAdyenTopup = useConfirmTaskerAdyenTopup();

  const dropinRef = useAdyenDropin({
    sessionId: adyenSession?.sessionId ?? "",
    sessionData: adyenSession?.sessionData ?? "",
    clientKey: adyenSession?.clientKey ?? "",
    environment: process.env.NEXT_PUBLIC_ADYEN_ENVIRONMENT,
    onCompleted: ({ sessionId, sessionResult }) => {
      confirmAdyenTopup.mutate(
        { sessionId, sessionResult },
        {
          onSuccess: () => {
            toast.success("Nạp tiền thành công");
            reset();
            onClose();
          },
        },
      );
    },
    onError: (message) => toast.error(message),
  });

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

  const reset = () => {
    setStep("select");
    setAdyenSession(null);
    setAmount("");
  };

  const close = () => {
    if (createTopup.isPending || confirmAdyenTopup.isPending) return;
    reset();
    onClose();
  };

  const submit = () => {
    if (!canSubmit) return;
    createTopup.mutate(
      { amountVnd, provider },
      {
        onSuccess: (result) => {
          if (provider === "ADYEN") {
            if (
              !result.adyenSessionId ||
              !result.adyenSessionData ||
              !result.adyenClientKey
            ) {
              toast.error("Không tạo được phiên thanh toán, vui lòng thử lại");
              return;
            }
            setAdyenSession({
              sessionId: result.adyenSessionId,
              sessionData: result.adyenSessionData,
              clientKey: result.adyenClientKey,
            });
            setStep("pay");
            return;
          }

          const payUrl = result.payUrl ?? result.approveUrl;
          if (!payUrl) {
            toast.error(
              "Cổng thanh toán không trả về link, vui lòng thử lại",
            );
            return;
          }
          window.location.href = payUrl;
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
            {step === "pay"
              ? "Nhập thông tin thẻ hoặc chọn thẻ đã lưu để hoàn tất thanh toán."
              : "Chọn cổng thanh toán, số tiền được cộng vào ví sau khi giao dịch hoàn tất."}
          </DialogDescription>
        </DialogHeader>

        {step === "pay" ? (
          <div className="space-y-4">
            <div ref={dropinRef} />
            {confirmAdyenTopup.isPending && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Đang xác nhận thanh toán...
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Chọn cổng thanh toán */}
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { value: "ADYEN", label: "Chuyển khoản / Thẻ", hint: "Adyen" },
                  { value: "PAYPAL", label: "PayPal", hint: "USD" },
                ] satisfies { value: Provider; label: string; hint: string }[]
              ).map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setProvider(m.value)}
                  className={`rounded-xl border p-3 text-left transition-colors ${
                    provider === m.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <p className="text-sm font-bold">{m.label}</p>
                  <p className="text-xs text-muted-foreground">{m.hint}</p>
                </button>
              ))}
            </div>

            {provider === "ADYEN" && (
              <p className="rounded-xl border border-dashed border-border bg-muted/20 p-3 text-xs text-muted-foreground">
                Bạn sẽ nhập thông tin thẻ ở bước tiếp theo (sandbox). Thẻ đã lưu
                từ lần nạp trước sẽ tự hiện để chọn nhanh.
              </p>
            )}

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
                  {provider === "PAYPAL" &&
                    ` Tỷ giá ${formatVnd(config.fxRate)} / 1 USD.`}
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
                  <span className="text-muted-foreground">
                    {provider === "PAYPAL" ? "PayPal sẽ thu" : "Adyen sẽ thu"}
                  </span>
                  <span className="font-mono font-bold">
                    {provider === "PAYPAL"
                      ? `$${amountUsd.toFixed(2)}`
                      : formatVnd(amountVnd)}
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
        )}

        <DialogFooter>
          {step === "pay" ? (
            <Button
              variant="outline"
              onClick={reset}
              disabled={confirmAdyenTopup.isPending}
            >
              <ArrowLeft className="size-4" />
              Quay lại
            </Button>
          ) : (
            <>
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
                {provider === "PAYPAL" ? "Thanh toán qua PayPal" : "Tiếp tục"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
