"use client";

import React, { useState } from "react";
import { AdminButton } from "@/components/admin";
import { Textarea } from "@/components/ui/textarea";
import {
  Landmark,
  Link2,
  Unlink,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import {
  useBankSuggestions,
  useIncidentBankEntries,
  useMatchBankEntry,
  useUnmatchBankEntry,
  type BankStatementEntry,
} from "@/features/admin/modules/reconciliation/bank-statement";
import { formatVnd } from "@/features/incident/shared/incident.labels";

const dt = (s: string) => new Date(s).toLocaleString("vi-VN");

function EntryLine({ e }: { e: BankStatementEntry }) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-baseline justify-between gap-2">
        <b className="truncate text-[11px]">{e.bankRef}</b>
        <b className="shrink-0">{formatVnd(e.amount)}</b>
      </div>
      <p className="text-[11px] text-[var(--c-muted)]">
        {dt(e.txnAt)}
        {e.counterpartyName ? ` · ${e.counterpartyName}` : ""}
      </p>
      {e.description && (
        <p className="truncate text-[11px] text-[var(--c-muted)]">
          {e.description}
        </p>
      )}
    </div>
  );
}

/**
 * Đối chiếu khoản chi ngoài với SAO KÊ NGÂN HÀNG.
 *
 * Ảnh minh chứng và con số trên sổ đều do chính người chi tiền tạo ra; sao kê là dữ liệu
 * duy nhất không đến từ thao tác của họ. Panel này nói thẳng một khoản chi đang ở trạng
 * thái nào: "ngân hàng đã xác nhận" hay "mới chỉ có lời khai".
 */
export function BankReconcilePanel({
  incidentId,
  declaredOutflow,
}: {
  incidentId: string;
  /** Tổng tiền admin khai đã rời ngân hàng = khách thực nhận + thất thoát. */
  declaredOutflow: number;
}) {
  const matched = useIncidentBankEntries(incidentId, true);
  const suggestions = useBankSuggestions(incidentId, true);
  const match = useMatchBankEntry();
  const unmatch = useUnmatchBankEntry();

  const [unmatchingId, setUnmatchingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const entries = matched.data ?? [];
  const total = entries.reduce((sum, e) => sum + e.amount, 0);
  const verified = entries.length > 0 && total === declaredOutflow;
  const diff = total - declaredOutflow;

  return (
    <section className="space-y-2">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--c-muted)]">
        <Landmark className="size-3.5" /> Đối chiếu sao kê ngân hàng
      </p>

      <div
        className={`flex items-start gap-2 rounded-lg border p-2.5 text-[11px] ${
          verified
            ? "border-[#047857]/40 bg-[#047857]/5 text-[#047857]"
            : "border-[#D97706]/40 bg-[#D97706]/5 text-[#B45309]"
        }`}
      >
        {verified ? (
          <ShieldCheck className="mt-px size-3.5 shrink-0" />
        ) : (
          <ShieldAlert className="mt-px size-3.5 shrink-0" />
        )}
        <div className="space-y-0.5">
          {verified ? (
            <p>
              Ngân hàng đã xác nhận đủ <b>{formatVnd(total)}</b> cho khoản chi
              này.
            </p>
          ) : entries.length === 0 ? (
            <p>
              Chưa đối chiếu dòng sao kê nào — khoản{" "}
              <b>{formatVnd(declaredOutflow)}</b> này hiện mới chỉ có lời khai
              của admin và ảnh minh chứng.
            </p>
          ) : (
            <p>
              Sao kê đã khớp <b>{formatVnd(total)}</b>, lệch{" "}
              <b>
                {diff > 0 ? "+" : ""}
                {formatVnd(diff)}
              </b>{" "}
              so với số đã khai <b>{formatVnd(declaredOutflow)}</b>.
            </p>
          )}
          <p className="text-[var(--c-muted)]">
            Chưa thấy dòng nào? Nhập sao kê ở trang Đối soát rồi quay lại.
          </p>
        </div>
      </div>

      {entries.length > 0 && (
        <div className="space-y-1.5">
          {entries.map((e) => (
            <div
              key={e.id}
              className="space-y-1.5 rounded-lg border border-[var(--c-line)] bg-[var(--c-card-2)] p-2.5"
            >
              <EntryLine e={e} />
              {unmatchingId === e.id ? (
                <div className="space-y-1.5">
                  <Textarea
                    value={reason}
                    maxLength={1000}
                    rows={2}
                    onChange={(ev) => setReason(ev.target.value)}
                    placeholder="Vì sao gỡ đối chiếu? (tối thiểu 10 ký tự)"
                    className="resize-none rounded-lg text-sm"
                  />
                  <div className="flex gap-1.5">
                    <AdminButton
                      size="sm"
                      variant="danger"
                      className="rounded-lg"
                      disabled={reason.trim().length < 10 || unmatch.isPending}
                      onClick={() =>
                        unmatch.mutate(
                          { entryId: e.id, reason: reason.trim() },
                          {
                            onSuccess: () => {
                              setUnmatchingId(null);
                              setReason("");
                            },
                          },
                        )
                      }
                    >
                      Xác nhận gỡ
                    </AdminButton>
                    <AdminButton
                      size="sm"
                      variant="ghost"
                      className="rounded-lg"
                      onClick={() => setUnmatchingId(null)}
                    >
                      Huỷ
                    </AdminButton>
                  </div>
                </div>
              ) : (
                <AdminButton
                  size="sm"
                  variant="ghost"
                  className="rounded-lg gap-1.5"
                  onClick={() => {
                    setUnmatchingId(e.id);
                    setReason("");
                  }}
                >
                  <Unlink className="size-3.5" /> Gỡ đối chiếu
                </AdminButton>
              )}
            </div>
          ))}
        </div>
      )}

      {(suggestions.data?.length ?? 0) > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-bold uppercase text-[var(--c-muted)]">
            Dòng sao kê có thể là khoản này
          </p>
          {suggestions.data?.map((s) => (
            <div
              key={s.id}
              className="space-y-1.5 rounded-lg border border-dashed border-[var(--c-line)] p-2.5"
            >
              <EntryLine e={s} />
              <ul className="list-disc pl-4 text-[11px] text-[var(--c-muted)]">
                {s.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              <AdminButton
                size="sm"
                variant="secondary"
                className="rounded-lg gap-1.5"
                disabled={match.isPending}
                onClick={() => match.mutate({ entryId: s.id, incidentId })}
              >
                <Link2 className="size-3.5" /> Đây đúng là khoản đã chuyển
              </AdminButton>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
