"use client";

import React from "react";
import { Gavel, Scale, Split, User } from "lucide-react";
import {
  formatVnd,
  OUTCOME_LABEL,
  RESPONSIBILITY_LABEL_FOR_TASKER,
} from "@/features/incident/shared/incident.labels";
import type { IncidentTaskerView } from "@/features/incident/shared/incident.types";

function Reason({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-0.5">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3" /> {label}
      </p>
      <p className="whitespace-pre-wrap text-sm leading-snug">{children}</p>
    </div>
  );
}

/**
 * Nội dung quyết định CleanZ đưa ra và CĂN CỨ của nó.
 *
 * Backend bắt buộc Admin nhập "lý do gửi Tasker" khi Tasker phải chịu tiền, và cả quy
 * trình phản biện được dựng lên quanh giả định Tasker đã đọc nó. Trước đây màn hình này
 * chỉ hiện con số phải trả, nên Tasker được hỏi Đồng ý/Không đồng ý với một khoản tiền mà
 * không biết vì sao — quyền phản biện trên giấy, không có thật.
 *
 * Chỉ render khi quyết định ĐÃ được gửi (`incident.decision != null`, do BE gác), nên
 * component này không cần và không được tự suy ra trạng thái nào.
 */
export function DecisionBrief({ incident }: { incident: IncidentTaskerView }) {
  const decision = incident.decision;
  if (!decision) return null;

  const borne = incident.myBorneAmount ?? 0;

  return (
    <section className="space-y-3 rounded-2xl border border-border/60 bg-card p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          <Gavel className="size-3.5" /> CleanZ kết luận
        </p>
        <span className="text-[10px] text-muted-foreground">
          Bản v{decision.version}
        </span>
      </div>

      {decision.outcome && (
        <p className="text-sm font-semibold">
          {OUTCOME_LABEL[decision.outcome]}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/40 p-2.5">
        <div>
          <p className="text-[10px] font-bold uppercase text-muted-foreground">
            CleanZ đền khách
          </p>
          <p className="text-sm font-semibold">
            {formatVnd(decision.approvedAmount)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase text-muted-foreground">
            Trong đó bạn chịu
          </p>
          <p className="text-sm font-semibold text-red-600">
            {formatVnd(borne)}
          </p>
        </div>
      </div>

      {decision.responsibilityParty && (
        <Reason icon={User} label="Ai chịu trách nhiệm">
          <b>{RESPONSIBILITY_LABEL_FOR_TASKER[decision.responsibilityParty]}</b>
          {decision.responsibilityReason ? (
            <>
              {" — "}
              {decision.responsibilityReason}
            </>
          ) : null}
        </Reason>
      )}

      {/* Lý do soạn RIÊNG cho Tasker: đặt cuối và nổi bật nhất vì đây chính là thứ họ
          được mời phản biện. */}
      {decision.reasonForTasker && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-2.5">
          <Reason icon={Scale} label="CleanZ giải thích với bạn">
            {decision.reasonForTasker}
          </Reason>
        </div>
      )}

      {decision.allocationReason && (
        <Reason icon={Split} label="Vì sao chia tiền như vậy">
          {decision.allocationReason}
        </Reason>
      )}

      {borne > 0 && !decision.finalizedAt && (
        <p className="text-xs leading-snug text-muted-foreground">
          Đây là kết luận <b>dự kiến</b>. Bạn được nêu ý kiến trước khi CleanZ
          chốt và trừ tiền.
        </p>
      )}
    </section>
  );
}
