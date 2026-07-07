"use client";

import { useState } from "react";
import { ArrowUpRight, Landmark } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  useCustomerWallet,
  useCustomerWithdrawals,
  useCreateCustomerWithdrawal,
} from "../hooks/useCustomerWallet";
import type { WithdrawalStatus } from "../types/customer-wallet.types";

const fmtVnd = (n: number) => `${(n ?? 0).toLocaleString("vi-VN")}đ`;
const fmt = (d: string) => new Date(d).toLocaleString("vi-VN");

const STATUS: Record<WithdrawalStatus, { label: string; cls: string }> = {
  PENDING: { label: "Chờ duyệt", cls: "bg-amber-100 text-amber-700" },
  APPROVED: { label: "Đã duyệt", cls: "bg-emerald-100 text-emerald-700" },
  PROCESSED: { label: "Đã chi", cls: "bg-emerald-100 text-emerald-700" },
  REJECTED: { label: "Từ chối", cls: "bg-red-100 text-red-700" },
};

export function WithdrawalSection() {
  const { data: wallet } = useCustomerWallet();
  const { data: withdrawals } = useCustomerWithdrawals();
  const create = useCreateCustomerWithdrawal();

  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [note, setNote] = useState("");

  const balance = wallet?.balance ?? 0;
  const amt = Number(amount);
  const invalid =
    !Number.isFinite(amt) ||
    amt < 10000 ||
    amt > balance ||
    !bankName.trim() ||
    !bankAccount.trim();

  const submit = () =>
    create.mutate(
      {
        amount: amt,
        bankName: bankName.trim(),
        bankAccount: bankAccount.trim(),
        note: note.trim() || undefined,
      },
      {
        onSuccess: () => {
          setAmount("");
          setNote("");
        },
      },
    );

  return (
    <section className="rounded-2xl border border-border/50 bg-card p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <ArrowUpRight className="size-4 text-primary" />
        <h3 className="text-sm font-bold">Rút tiền về ngân hàng</h3>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Số dư có thể rút: <b>{fmtVnd(balance)}</b>. Tối thiểu 10.000đ. Yêu cầu sẽ được CleanZ duyệt trước khi chuyển khoản.
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          type="number"
          min={10000}
          max={balance}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Số tiền (VND)"
        />
        <div className="relative">
          <Landmark className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            placeholder="Tên ngân hàng (VD: Vietcombank)"
            className="pl-9"
          />
        </div>
        <Input
          value={bankAccount}
          onChange={(e) => setBankAccount(e.target.value)}
          placeholder="Số tài khoản"
          className="sm:col-span-2"
        />
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Ghi chú (tuỳ chọn)"
          className="resize-none sm:col-span-2"
        />
      </div>
      {amt > balance && amount !== "" && (
        <p className="mt-1 text-xs text-red-600">Vượt quá số dư có thể rút.</p>
      )}
      <Button
        onClick={submit}
        disabled={invalid || create.isPending}
        className="mt-3 w-full gap-1.5"
      >
        <ArrowUpRight className="size-4" />
        {create.isPending ? "Đang gửi..." : "Gửi yêu cầu rút"}
      </Button>

      {(withdrawals?.length ?? 0) > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Lịch sử rút tiền
          </p>
          <div className="space-y-2">
            {withdrawals!.map((w) => {
              const s = STATUS[w.status];
              return (
                <div
                  key={w.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-border/40 bg-muted/30 p-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{fmtVnd(w.amount)}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {w.bankName} · {w.bankAccount} · {fmt(w.createdAt)}
                    </p>
                    {w.status === "REJECTED" && w.adminNote && (
                      <p className="text-[11px] text-red-600">Lý do: {w.adminNote}</p>
                    )}
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.cls}`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
