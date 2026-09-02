"use client";

import React from "react";
import { CheckCircle2, MessageSquareQuote, XCircle } from "lucide-react";
import { RESPONSE_TYPE_LABEL } from "@/features/incident/shared/incident.labels";
import type { DecisionResponseView } from "@/features/incident/shared/incident.types";

function fmt(d: string | null | undefined) {
  return d ? new Date(d).toLocaleString("vi-VN") : "—";
}

/**
 * Những gì chính Tasker đã gửi. Backend lưu đủ theo (version, revision) từ đầu, nhưng
 * màn hình cũ không đọc tới — gửi xong form trắng lại và không còn dấu vết nào, nên
 * người dùng không biết ý kiến của mình đã tới nơi hay chưa, càng không nhớ đã nói gì
 * ở bản quyết định trước.
 *
 * `reviewedAt` được hiện tường minh: một bản Admin đã đọc thì không sửa được nữa, và đó
 * là lý do nút sửa biến mất — nói ra thì không ai phải đoán.
 */
export function MyResponseHistory({
  responses,
  currentVersion,
}: {
  responses: DecisionResponseView[];
  currentVersion: number;
}) {
  if (responses.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        <MessageSquareQuote className="size-3.5" /> Ý kiến bạn đã gửi (
        {responses.length})
      </p>
      {responses.map((r) => {
        const agree = r.responseType === "AGREE";
        return (
          <div
            key={r.id}
            className="space-y-1.5 rounded-xl border border-border/50 p-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  agree
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "bg-red-500/10 text-red-600"
                }`}
              >
                {agree ? (
                  <CheckCircle2 className="size-3" />
                ) : (
                  <XCircle className="size-3" />
                )}
                {RESPONSE_TYPE_LABEL[r.responseType]}
              </span>
              <span className="text-[10px] text-muted-foreground">
                Về kết luận v{r.decisionVersion}
                {r.decisionVersion !== currentVersion && " (bản cũ)"}
                {r.responseRevision > 1 &&
                  ` · sửa lần ${r.responseRevision - 1}`}
              </span>
              <span className="ml-auto text-[10px] text-muted-foreground">
                {fmt(r.submittedAt)}
              </span>
            </div>

            {r.content && (
              <p className="whitespace-pre-wrap text-sm leading-snug">
                {r.content}
              </p>
            )}

            {r.evidences.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {r.evidences.map((ev) => (
                  <a key={ev.id} href={ev.url} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ev.url}
                      alt="ảnh bạn gửi kèm"
                      className="size-14 rounded-lg border border-border/50 object-cover transition hover:opacity-80"
                    />
                  </a>
                ))}
              </div>
            )}

            {r.reviewedAt && (
              <p className="text-[11px] text-muted-foreground">
                CleanZ đã xem ý kiến này lúc {fmt(r.reviewedAt)} — không sửa lại
                được nữa.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
