"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useCreditTaskerWallet } from "../hooks/admin-tasker.hooks";

interface TaskerCreditWalletDialogProps {
  isOpen: boolean;
  onClose: () => void;
  taskerId: string;
  taskerName?: string | null;
  /** Số dư ví hiện tại (VND) — hiển thị để đối chiếu. */
  currentBalance?: number;
}

const MIN_AMOUNT = 1000;
const MAX_AMOUNT = 2_000_000; // trùng giới hạn BE: 2.000.000đ/lần
const QUICK_AMOUNTS = [50_000, 100_000, 400_000, 500_000];

const formatVND = (v: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    v
  );

/**
 * Admin ghi nhận tasker nộp TIỀN MẶT tại trụ sở → cộng thẳng vào ví.
 * Bắt buộc nhập lý do; số phiếu thu tùy chọn. Giới hạn 2.000.000đ/lần (khớp BE).
 */
export const TaskerCreditWalletDialog: React.FC<
  TaskerCreditWalletDialogProps
> = ({ isOpen, onClose, taskerId, taskerName, currentBalance }) => {
  const [amount, setAmount] = useState<string>("");
  const [reason, setReason] = useState("");
  const [referenceCode, setReferenceCode] = useState("");
  const credit = useCreditTaskerWallet();

  // Đóng dialog kèm reset form (mọi lối đóng đều đi qua đây → lần mở sau luôn sạch).
  const resetAndClose = () => {
    setAmount("");
    setReason("");
    setReferenceCode("");
    onClose();
  };

  const amountNum = Number(amount);
  const amountValid =
    Number.isInteger(amountNum) &&
    amountNum >= MIN_AMOUNT &&
    amountNum <= MAX_AMOUNT;
  const reasonValid = reason.trim().length >= 3;
  const canSubmit = amountValid && reasonValid && !credit.isPending;

  const handleSubmit = () => {
    if (!canSubmit) return;
    credit.mutate(
      {
        taskerId,
        payload: {
          amount: amountNum,
          reason: reason.trim(),
          referenceCode: referenceCode.trim() || undefined,
        },
      },
      { onSuccess: () => resetAndClose() }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && resetAndClose()}>
      <DialogContent className="sm:max-w-md rounded-[20px]">
        <DialogHeader>
          <DialogTitle>Ghi nhận nộp tiền mặt</DialogTitle>
          <DialogDescription className="pt-1 text-sm text-muted-foreground">
            Cộng thẳng vào ví của{" "}
            <strong>{taskerName || "đối tác này"}</strong> khi họ nộp tiền mặt
            tại trụ sở. Mỗi lần được ghi lại đầy đủ (ai, khi nào, lý do).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {typeof currentBalance === "number" && (
            <div className="flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Số dư ví hiện tại</span>
              <span className="font-semibold">{formatVND(currentBalance)}</span>
            </div>
          )}

          {/* Số tiền */}
          <div className="space-y-1.5">
            <Label htmlFor="credit-amount">Số tiền (VND)</Label>
            <Input
              id="credit-amount"
              type="number"
              inputMode="numeric"
              min={MIN_AMOUNT}
              max={MAX_AMOUNT}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="VD: 400000"
            />
            <div className="flex flex-wrap gap-2 pt-1">
              {QUICK_AMOUNTS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAmount(String(v))}
                  className="rounded-full border px-3 py-1 text-xs text-muted-foreground transition hover:bg-muted"
                >
                  {v.toLocaleString("vi-VN")}
                </button>
              ))}
            </div>
            {amount !== "" && !amountValid && (
              <p className="text-xs text-destructive">
                Số tiền phải là số nguyên từ {MIN_AMOUNT.toLocaleString("vi-VN")}{" "}
                đến {MAX_AMOUNT.toLocaleString("vi-VN")}đ/lần.
              </p>
            )}
            {amountValid && (
              <p className="text-xs text-muted-foreground">
                Sẽ cộng <strong>{formatVND(amountNum)}</strong>
                {typeof currentBalance === "number" && (
                  <> → số dư mới {formatVND(currentBalance + amountNum)}</>
                )}
                .
              </p>
            )}
          </div>

          {/* Lý do (bắt buộc) */}
          <div className="space-y-1.5">
            <Label htmlFor="credit-reason">Lý do (bắt buộc)</Label>
            <Textarea
              id="credit-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="VD: Nộp cọc tiền mặt tại trụ sở"
              rows={2}
              maxLength={255}
            />
          </div>

          {/* Số phiếu thu (tùy chọn) */}
          <div className="space-y-1.5">
            <Label htmlFor="credit-ref">Số phiếu thu (tùy chọn)</Label>
            <Input
              id="credit-ref"
              value={referenceCode}
              onChange={(e) => setReferenceCode(e.target.value)}
              placeholder="VD: PT-2026-000123"
              maxLength={64}
            />
          </div>
        </div>

        <DialogFooter className="mt-2 gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={resetAndClose}
            disabled={credit.isPending}
            className="rounded-full"
          >
            Hủy
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="rounded-full"
          >
            {credit.isPending ? "Đang xử lý..." : "Cộng tiền vào ví"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
