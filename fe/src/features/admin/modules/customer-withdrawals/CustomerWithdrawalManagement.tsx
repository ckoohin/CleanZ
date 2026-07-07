"use client";

import { useState } from "react";
import { Check, X, Banknote } from "lucide-react";
import { AdminButton } from "@/components/admin";
import { Input } from "@/components/ui/input";
import {
  useAdminCustomerWithdrawals,
  useReviewCustomerWithdrawal,
} from "./hooks";
import type { WithdrawalStatus } from "./service";

const fmtVnd = (n: number) => `${(n ?? 0).toLocaleString("vi-VN")}đ`;
const fmt = (d: string) => new Date(d).toLocaleString("vi-VN");

const STATUS_TABS: { value: WithdrawalStatus | "ALL"; label: string }[] = [
  { value: "PENDING", label: "Chờ duyệt" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "REJECTED", label: "Từ chối" },
  { value: "ALL", label: "Tất cả" },
];

const STATUS_LABEL: Record<WithdrawalStatus, { label: string; cls: string }> = {
  PENDING: { label: "Chờ duyệt", cls: "bg-amber-100 text-amber-700" },
  APPROVED: { label: "Đã duyệt", cls: "bg-emerald-100 text-emerald-700" },
  PROCESSED: { label: "Đã chi", cls: "bg-emerald-100 text-emerald-700" },
  REJECTED: { label: "Từ chối", cls: "bg-red-100 text-red-700" },
};

export function CustomerWithdrawalManagement() {
  const [tab, setTab] = useState<WithdrawalStatus | "ALL">("PENDING");
  const { data, isLoading } = useAdminCustomerWithdrawals(
    tab === "ALL" ? undefined : tab,
  );
  const review = useReviewCustomerWithdrawal();
  const [noteById, setNoteById] = useState<Record<string, string>>({});

  return (
    <div className="cz-admin space-y-4 p-4 sm:p-6">
      <div className="flex items-center gap-2">
        <Banknote className="size-5 text-[var(--c-primary-strong)]" />
        <h1 className="text-lg font-bold text-[var(--c-ink)]">Rút tiền của Khách hàng</h1>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              tab === t.value
                ? "border-[var(--c-primary-strong)] bg-[var(--c-primary)]/10 text-[var(--c-primary-strong)]"
                : "border-[var(--c-line)] text-[var(--c-muted)] hover:text-[var(--c-ink)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="py-8 text-center text-sm text-[var(--c-muted)]">Đang tải...</p>
      ) : (data?.length ?? 0) === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--c-muted)]">Không có yêu cầu nào.</p>
      ) : (
        <div className="space-y-2">
          {data!.map((w) => {
            const s = STATUS_LABEL[w.status];
            return (
              <div key={w.id} className="rounded-xl border border-[var(--c-line)] bg-[var(--c-card)] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[var(--c-ink)]">{fmtVnd(w.amount)}</p>
                    <p className="truncate text-xs text-[var(--c-muted)]">
                      {w.customer?.user?.fullName ?? "Khách"} · {w.bankName} · {w.bankAccount}
                    </p>
                    <p className="text-[11px] text-[var(--c-muted)]">{fmt(w.createdAt)}{w.note ? ` · ${w.note}` : ""}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.cls}`}>{s.label}</span>
                </div>

                {w.status === "PENDING" && (
                  <div className="mt-2 space-y-2">
                    <Input
                      value={noteById[w.id] ?? ""}
                      onChange={(e) => setNoteById((p) => ({ ...p, [w.id]: e.target.value }))}
                      placeholder="Ghi chú admin (bắt buộc khi từ chối)"
                      className="h-8 text-sm"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <AdminButton
                        size="sm"
                        variant="primary"
                        className="rounded-lg gap-1.5"
                        disabled={review.isPending}
                        onClick={() =>
                          review.mutate({
                            id: w.id,
                            payload: { status: "APPROVED", adminNote: noteById[w.id]?.trim() || undefined },
                          })
                        }
                      >
                        <Check className="size-3.5" /> Duyệt & trừ ví
                      </AdminButton>
                      <AdminButton
                        size="sm"
                        variant="danger"
                        className="rounded-lg gap-1.5"
                        disabled={review.isPending || !(noteById[w.id]?.trim())}
                        onClick={() =>
                          review.mutate({
                            id: w.id,
                            payload: { status: "REJECTED", adminNote: noteById[w.id]?.trim() },
                          })
                        }
                      >
                        <X className="size-3.5" /> Từ chối
                      </AdminButton>
                    </div>
                  </div>
                )}
                {w.status !== "PENDING" && w.adminNote && (
                  <p className="mt-1 text-[11px] text-[var(--c-muted)]">Ghi chú admin: {w.adminNote}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
