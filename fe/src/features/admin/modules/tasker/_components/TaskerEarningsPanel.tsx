"use client";

import React from "react";
import { Wallet, Percent, Receipt, FileText } from "lucide-react";
import { AdminCard } from "@/components/admin";
import { cn } from "@/lib/utils";
import {
  useAdminTaskerEarnings,
  useAdminTaskerEarningsDetails,
} from "../hooks/admin-tasker.hooks";
import { rangeOf } from "../../../lib/date-ranges";

const PERIOD_OPTIONS: { key: "today" | "thisWeek" | "thisMonth"; label: string }[] = [
  { key: "today", label: "Hôm nay" },
  { key: "thisWeek", label: "Tuần này" },
  { key: "thisMonth", label: "Tháng này" },
];

function fmtMoney(value: number): string {
  return `${value.toLocaleString("vi-VN")} đ`;
}

function fmtDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const EarningStat: React.FC<{
  icon: React.ElementType;
  value: string;
  label: string;
  tone: "emerald" | "amber" | "blue";
}> = ({ icon: Icon, value, label, tone }) => {
  const tones = {
    emerald: "bg-[rgba(14,159,110,0.12)] text-[#0E9F6E]",
    amber: "bg-[var(--c-primary-soft)] text-[var(--c-primary-strong)]",
    blue: "bg-[rgba(37,99,235,0.12)] text-[#2563EB]",
  };
  return (
    <AdminCard className="p-5 flex items-center gap-4">
      <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", tones[tone])}>
        <Icon className="w-5 h-5" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-black leading-none text-[var(--c-ink)] tabular-nums">{value}</p>
        <p className="text-xs font-medium text-[var(--c-muted)] mt-1.5">{label}</p>
      </div>
    </AdminCard>
  );
};

const EarningsDetailsTable: React.FC<{ taskerId: string; range: ReturnType<typeof rangeOf> }> = ({
  taskerId,
  range,
}) => {
  const { data, isLoading } = useAdminTaskerEarningsDetails(taskerId, range);

  return (
    <AdminCard className="overflow-hidden">
      <div className="flex items-center gap-2 px-5 pt-4 pb-3">
        <FileText className="w-4 h-4 text-[var(--c-primary-strong)]" aria-hidden="true" />
        <h3 className="text-sm font-bold text-[var(--c-ink)]">Phiếu lương chi tiết theo đơn</h3>
      </div>

      {isLoading ? (
        <div className="px-5 pb-5 space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-9 rounded-lg bg-[var(--c-card-2)] animate-pulse" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <p className="px-5 pb-6 pt-1 text-center text-sm text-[var(--c-muted)]">
          Không có đơn nào tính lương trong kỳ này
        </p>
      ) : (
        <div className="max-h-[420px] overflow-y-auto">
          <table className="w-full text-left text-[13.5px]">
            <thead className="sticky top-0 bg-[var(--c-card)]">
              <tr>
                <th className="pb-2.5 pt-1 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] px-5">Mã đơn</th>
                <th className="pb-2.5 pt-1 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] px-2.5">Hoàn thành</th>
                <th className="pb-2.5 pt-1 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] px-2.5 text-right">Tasker nhận</th>
                <th className="pb-2.5 pt-1 font-semibold uppercase tracking-wider text-[var(--c-muted)] text-[11px] px-5 text-right">Chiết khấu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--c-line)]">
              {data.map((row) => (
                <tr key={row.bookingId} className="hover:bg-[var(--c-card-2)] transition-colors">
                  <td className="py-2.5 px-5 font-semibold text-[var(--c-ink)] tabular-nums">{row.bookingCode}</td>
                  <td className="py-2.5 px-2.5 text-[var(--c-muted)]">{fmtDateTime(row.completedAt)}</td>
                  <td className="py-2.5 px-2.5 text-right font-medium text-[#0E9F6E] tabular-nums">
                    {fmtMoney(row.taskerEarning)}
                  </td>
                  <td className="py-2.5 px-5 text-right font-medium text-[var(--c-primary-strong)] tabular-nums">
                    {fmtMoney(row.platformCommission)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminCard>
  );
};

export const TaskerEarningsPanel: React.FC<{ taskerId: string }> = ({ taskerId }) => {
  const [period, setPeriod] = React.useState<(typeof PERIOD_OPTIONS)[number]["key"]>("today");
  const range = React.useMemo(() => rangeOf(period), [period]);
  const { data, isLoading } = useAdminTaskerEarnings(taskerId, range);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-sm font-bold flex items-center gap-2 text-[var(--c-ink)]">
          <Wallet className="w-4 h-4 text-[var(--c-primary-strong)]" aria-hidden="true" />
          Tiền của tasker theo kỳ
        </h3>
        <div className="inline-flex items-center gap-1 rounded-xl border border-[var(--c-line)] bg-[var(--c-card)] p-1">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setPeriod(opt.key)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors",
                period === opt.key
                  ? "bg-[var(--c-primary)] text-white"
                  : "text-[var(--c-muted)] hover:bg-[var(--c-card-2)] hover:text-[var(--c-ink)]"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-[92px] rounded-2xl bg-[var(--c-card-2)] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <EarningStat
            icon={Wallet}
            tone="emerald"
            value={fmtMoney(data?.taskerEarnings ?? 0)}
            label="Tasker đã kiếm được"
          />
          <EarningStat
            icon={Percent}
            tone="amber"
            value={fmtMoney(data?.platformCommission ?? 0)}
            label="Chiết khấu đã thu từ tasker"
          />
          <EarningStat
            icon={Receipt}
            tone="blue"
            value={String(data?.completedBookings ?? 0)}
            label="Số đơn tính vào kỳ này"
          />
        </div>
      )}

      <EarningsDetailsTable taskerId={taskerId} range={range} />
    </div>
  );
};
