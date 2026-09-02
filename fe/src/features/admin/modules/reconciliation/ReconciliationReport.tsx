"use client";

import {
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { AdminButton } from "@/components/admin";
import {
  useReconciliation,
  type ReconciliationSeverity,
} from "./reconciliation";
import { BankStatementPanel } from "./BankStatementPanel";

const fmtVnd = (n: number | null) =>
  n == null ? "—" : `${n.toLocaleString("vi-VN")}đ`;

const KIND_LABEL: Record<string, string> = {
  ALLOCATION_MISMATCH: "Phân bổ sai (taskerBorne + platformBorne ≠ approved)",
  RECOVERABLE_MISMATCH: "recoverable + uncovered ≠ taskerBorne",
  RECOVERED_OVERFLOW: "Thu hồi vượt nợ",
  CUSTOMER_REFUND_MISSING: "Thiếu hoàn tiền khách & không có minh chứng",
  CUSTOMER_REFUND_MISMATCH: "Hoàn ví khách lệch số duyệt",
  DUPLICATE_REFUND: "Hoàn tiền trùng",
  SYSTEM_LEDGER_MISMATCH: "Bút toán quỹ SYSTEM lệch",
  TASKER_DEDUCT_OVERFLOW: "Trừ ví Tasker vượt recoverable",
  EXTERNAL_PAYOUT_MISMATCH: "Sổ chi ngoài lệch số đã duyệt",
  EXTERNAL_PAYOUT_UNEXPECTED: "Đã hoàn qua ví nhưng vẫn ghi sổ chi ngoài",
  EXTERNAL_PAYOUT_LOSS: "Có khoản chuyển khoản không đến tay khách",
  EXTERNAL_PAYOUT_UNVERIFIED: "Chưa đối chiếu sao kê ngân hàng",
  EXTERNAL_PAYOUT_BANK_MISMATCH: "Sao kê ngân hàng lệch số đã khai",
};

const sevChip = (s: ReconciliationSeverity) =>
  s === "CRITICAL" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700";

export function ReconciliationReport() {
  const { data, isLoading, isFetching, refetch } = useReconciliation();
  const clean = data && data.discrepancyCount === 0;

  return (
    <div className="cz-admin space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {clean ? (
            <ShieldCheck className="size-5 text-[#047857]" />
          ) : (
            <ShieldAlert className="size-5 text-[#DC2626]" />
          )}
          <h1 className="text-lg font-bold text-[var(--c-ink)]">
            Đối soát bồi thường
          </h1>
        </div>
        <AdminButton
          size="sm"
          variant="secondary"
          className="rounded-lg gap-1.5"
          disabled={isFetching}
          onClick={() => void refetch()}
        >
          <RefreshCw
            className={`size-3.5 ${isFetching ? "animate-spin" : ""}`}
          />
          Chạy lại
        </AdminButton>
      </div>

      <p className="text-xs text-[var(--c-muted)]">
        Đối chiếu số liệu phân bổ trên sự cố với bút toán ví thực tế (theo tác
        động số dư) cho mọi sự cố đã chi trả. Phát hiện lệch tiền để audit — chỉ
        đọc, không sửa dữ liệu.
      </p>

      {isLoading ? (
        <p className="py-8 text-center text-sm text-[var(--c-muted)]">
          Đang đối soát...
        </p>
      ) : !data ? null : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Đã kiểm tra" value={data.checkedCount} />
            <Stat
              label="Chênh lệch"
              value={data.discrepancyCount}
              tone={data.discrepancyCount > 0 ? "warn" : "ok"}
            />
            <Stat
              label="Nghiêm trọng"
              value={data.criticalCount}
              tone={data.criticalCount > 0 ? "crit" : "ok"}
            />
          </div>

          {clean ? (
            <div className="flex items-center gap-2 rounded-xl border border-[#047857]/30 bg-[#047857]/5 p-4 text-sm text-[#047857]">
              <CheckCircle2 className="size-4" /> Toàn bộ sự cố đã chi trả khớp
              bút toán ví. Không có chênh lệch.
            </div>
          ) : (
            <div className="space-y-2">
              {data.discrepancies.map((d, i) => (
                <div
                  key={`${d.incidentId}-${d.kind}-${i}`}
                  className="rounded-xl border border-[var(--c-line)] bg-[var(--c-card)] p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[var(--c-ink)]">
                        {d.incidentCode ?? d.incidentId}{" "}
                        <span className="text-[11px] font-normal text-[var(--c-muted)]">
                          · v{d.decisionVersion} · {d.settlementMode}
                        </span>
                      </p>
                      <p className="text-xs text-[var(--c-ink)]">
                        {KIND_LABEL[d.kind] ?? d.kind}
                      </p>
                      <p className="text-[11px] text-[var(--c-muted)]">
                        {d.detail}
                      </p>
                      {(d.expected != null || d.actual != null) && (
                        <p className="mt-0.5 text-[11px]">
                          <span className="text-[var(--c-muted)]">
                            Kỳ vọng{" "}
                          </span>
                          <b className="text-[var(--c-ink)]">
                            {fmtVnd(d.expected)}
                          </b>
                          <span className="text-[var(--c-muted)]">
                            {" "}
                            · Thực tế{" "}
                          </span>
                          <b className="text-[#DC2626]">{fmtVnd(d.actual)}</b>
                        </p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${sevChip(d.severity)}`}
                    >
                      {d.severity === "CRITICAL" ? "Nghiêm trọng" : "Cảnh báo"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-[11px] text-[var(--c-muted)]">
            Cập nhật lúc {new Date(data.checkedAt).toLocaleString("vi-VN")}.
          </p>

          <div className="space-y-3 border-t border-[var(--c-line)] pt-4">
            {data.bankVerification.manualCount > 0 && (
              <p className="text-xs text-[var(--c-muted)]">
                Chi trả bằng chuyển khoản ngoài:{" "}
                <b className="text-[var(--c-ink)]">
                  {data.bankVerification.verifiedCount}/
                  {data.bankVerification.manualCount}
                </b>{" "}
                khoản đã được sao kê ngân hàng xác nhận. Tổng tiền đã rời ngân
                hàng:{" "}
                <b className="text-[var(--c-ink)]">
                  {fmtVnd(data.platformOutlay.external)}
                </b>
                .
              </p>
            )}
            <BankStatementPanel />
          </div>
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "ok",
}: {
  label: string;
  value: number;
  tone?: "ok" | "warn" | "crit";
}) {
  const color =
    tone === "crit"
      ? "text-[#DC2626]"
      : tone === "warn"
        ? "text-[#D97706]"
        : "text-[var(--c-ink)]";
  return (
    <div className="rounded-xl border border-[var(--c-line)] bg-[var(--c-card)] p-3 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-[11px] text-[var(--c-muted)]">{label}</p>
    </div>
  );
}
