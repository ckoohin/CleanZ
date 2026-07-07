"use client";

import React from "react";
import {
  RESPONSE_TYPE_LABEL,
  REVIEW_RESULT_LABEL,
} from "@/features/incident/shared/incident.labels";
import type { AdminDecisionResponse } from "@/features/incident/shared/incident.types";

function fmt(d: string | null | undefined) {
  return d ? new Date(d).toLocaleString("vi-VN") : "—";
}

/** Danh sách phản hồi quyết định của Tasker (đọc-only, giữ cả sau khi đã review). */
export function DecisionResponseHistory({
  responses,
}: {
  responses: AdminDecisionResponse[];
}) {
  if (responses.length === 0) {
    return (
      <p className="py-6 text-center text-xs text-[var(--c-muted)]">
        Chưa có phản hồi quyết định nào từ Tasker.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {responses.map((r) => (
        <div
          key={r.id}
          className="space-y-1.5 rounded-lg border border-[var(--c-line)] bg-[var(--c-card-2)] p-2.5"
        >
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-[var(--c-ink)]">
              Quyết định v{r.decisionVersion} · Lần {r.responseRevision}
              {r.submittedByName ? ` · ${r.submittedByName}` : ""}
            </span>
            <span className="text-[var(--c-muted)]">{fmt(r.submittedAt)}</span>
          </div>
          <p className="text-sm">
            <b>{RESPONSE_TYPE_LABEL[r.responseType] ?? r.responseType}</b>
            {r.content ? `: ${r.content}` : ""}
          </p>
          {(r.evidences?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {r.evidences?.map((ev) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={ev.id}
                  src={ev.url}
                  alt="bằng chứng phản hồi"
                  className="size-12 rounded border border-[var(--c-line)] object-cover"
                />
              ))}
            </div>
          )}
          {r.reviewedAt ? (
            <div className="rounded-md bg-[var(--c-card)] p-2 text-xs">
              <span className="font-semibold text-[var(--c-ink)]">
                Admin đã xem xét: {r.reviewResult ? REVIEW_RESULT_LABEL[r.reviewResult] : "-"}
              </span>
              {r.adminReviewNote && (
                <span className="text-[var(--c-muted)]"> — {r.adminReviewNote}</span>
              )}
              <span className="ml-1 text-[var(--c-muted)]">({fmt(r.reviewedAt)})</span>
            </div>
          ) : (
            <span className="inline-block rounded-full bg-[#F59E0B]/15 px-2 py-0.5 text-[11px] font-semibold text-[#B45309]">
              Chờ Admin xem xét
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
