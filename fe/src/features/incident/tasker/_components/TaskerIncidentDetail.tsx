"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, Wallet } from "lucide-react";
import { useTaskerIncidentDetail } from "../hooks/useTaskerIncident";
import { StatementComposer } from "./StatementComposer";
import { DecisionResponseComposer } from "./DecisionResponseComposer";
import {
  IncidentStatusBadge,
  SeverityBadge,
} from "@/features/incident/shared/_components/badges";
import { StatementThread } from "@/features/incident/shared/_components/StatementThread";
import { formatVnd } from "@/features/incident/shared/incident.labels";

function fmt(d: string | null | undefined) {
  return d ? new Date(d).toLocaleString("vi-VN") : "—";
}

export function TaskerIncidentDetail({ incidentId }: { incidentId: string }) {
  const router = useRouter();
  const { data: inc, isLoading } = useTaskerIncidentDetail(incidentId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="h-40 animate-pulse rounded-2xl border border-border/50 bg-card" />
      </div>
    );
  }
  if (!inc) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
        <p className="text-sm text-muted-foreground">Không tìm thấy sự cố này</p>
        <button onClick={() => router.back()} className="text-sm font-semibold text-primary">← Quay lại</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border/50 bg-card px-4 py-3 shadow-sm">
        <button onClick={() => router.back()} className="rounded-full p-1.5 hover:bg-muted" aria-label="Quay lại">
          <ArrowLeft className="size-5" />
        </button>
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-primary">{inc.incidentCode ?? "SỰ CỐ"}</p>
          <h1 className="line-clamp-1 text-sm font-bold">{inc.title}</h1>
        </div>
      </header>

      <div className="mx-auto max-w-lg space-y-5 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <IncidentStatusBadge status={inc.status} audience="tasker" />
          <SeverityBadge severity={inc.severity} />
          {inc.statementDueAt && (
            <span className="flex items-center gap-1 text-xs text-amber-600">
              <Clock className="size-3.5" /> Hạn gửi ý kiến: {fmt(inc.statementDueAt)}
            </span>
          )}
        </div>

        {/* Khách phản ánh chuyện gì */}
        <div className="rounded-2xl border border-border/40 bg-muted/30 p-3 text-sm">
          <p className="mb-1 text-xs font-bold text-muted-foreground">Khách phản ánh</p>
          {inc.description}
        </div>

        {/* Damage items (claimed/verified/approved) */}
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Các khoản khách yêu cầu đền</p>
          {inc.damageItems.map((it) => (
            <div key={it.id} className="rounded-xl border border-border/50 p-3 text-sm">
              <p className="font-medium">{it.description}</p>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                <span>Yêu cầu: <b className="text-foreground/80">{formatVnd(it.claimedAmount)}</b></span>
                {it.approvedAmount != null && <span className="text-emerald-600">Duyệt: <b>{formatVnd(it.approvedAmount)}</b></span>}
              </div>
            </div>
          ))}
        </div>

        {/* Tiền của chính Tasker này — không lộ số của người khác */}
        <div className="grid grid-cols-2 gap-3 rounded-2xl border border-border/40 p-3 text-sm">
          <div className="flex items-center gap-1.5">
            <Wallet className="size-4 text-muted-foreground" />
            <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Phần bạn phải trả</p>
              <p className="font-semibold text-red-600">
                {inc.myBorneAmount == null ? "—" : formatVnd(inc.myBorneAmount)}
              </p>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Ví đang bị giữ</p>
            <p className="font-semibold">
              {inc.myWalletHold == null ? "—" : formatVnd(inc.myWalletHold)}
            </p>
          </div>
          {inc.myWalletDeducted != null && (
            <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Đã trừ khỏi ví</p>
              <p className="font-semibold">{formatVnd(inc.myWalletDeducted)}</p>
            </div>
          )}
          {(inc.myOutstandingDebt ?? 0) > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Còn nợ CleanZ</p>
              <p className="font-semibold text-amber-600">{formatVnd(inc.myOutstandingDebt)}</p>
            </div>
          )}
        </div>
        {(inc.myOutstandingDebt ?? 0) > 0 && (
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs leading-snug text-amber-700 dark:text-amber-400">
            CleanZ đã trả cho khách thay bạn <b>{formatVnd(inc.myOutstandingDebt)}</b>. Khoản này
            sẽ được trừ dần vào thu nhập các đơn sau, và bạn tạm thời chưa rút tiền được cho tới khi trả xong.
          </p>
        )}

        {/* Nơi Tasker nói lại ý kiến của mình */}
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Ý kiến của bạn</p>
          <DecisionResponseComposer incident={inc} />
          <StatementThread statements={inc.statements} />
          <StatementComposer incidentId={incidentId} canSubmit={inc.canSubmitStatement} />
        </div>
      </div>
    </div>
  );
}
