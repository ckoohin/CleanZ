"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EvidenceUploader } from "@/features/incident/shared/_components/EvidenceUploader";
import type { Evidence, IncidentTaskerView } from "@/features/incident/shared/incident.types";
import { useTaskerUploadEvidence, useUpsertDecisionResponse } from "../hooks/useTaskerIncident";
import { AlertTriangle, Lock, Send } from "lucide-react";

function fmt(d: string | null | undefined) {
  return d ? new Date(d).toLocaleString("vi-VN") : "-";
}

export function DecisionResponseComposer({ incident }: { incident: IncidentTaskerView }) {
  const submit = useUpsertDecisionResponse(incident.id);
  const uploadEvidence = useTaskerUploadEvidence();
  const [responseType, setResponseType] = useState<"AGREE" | "DISAGREE">("AGREE");
  const [content, setContent] = useState("");
  const [evidences, setEvidences] = useState<Evidence[]>([]);

  // Thời hạn phản hồi do BE tính (`canRespondToDecision`) — không so hạn ở render, vì đọc
  // đồng hồ trong lúc render là hàm không thuần và cho kết quả đổi theo mỗi lần re-render.
  const open = incident.canRespondToDecision;
  // Đóng vì HẾT HẠN khác đóng vì CHƯA MỞ. Gộp hai thứ vào một câu là nói ngược
  // sự thật với người sắp bị trừ tiền: họ đọc "chưa tới lúc" trong khi hạn đã trôi qua.
  const expired = !open && incident.status === "AWAITING_RESPONSE";

  if (expired) {
    return (
      <div className="space-y-1 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700">
        <p className="flex items-center gap-1.5 font-semibold">
          <AlertTriangle className="size-3.5" /> Đã quá hạn nêu ý kiến
        </p>
        <p>
          Hạn chót là {fmt(incident.taskerResponseDeadline)}. CleanZ có thể chốt
          kết luận mà không có ý kiến của bạn.
        </p>
      </div>
    );
  }

  if (!open) {
    return (
      <p className="flex items-center justify-center gap-1.5 rounded-xl border border-border/40 bg-muted/40 p-3 text-xs text-muted-foreground">
        <Lock className="size-3.5" /> Chưa tới lúc bạn nêu ý kiến về kết luận này.
      </p>
    );
  }

  const contentRequired = responseType === "DISAGREE";
  const invalid = contentRequired && content.trim().length < 10;

  return (
    <div className="space-y-3 rounded-xl border border-border/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Ý kiến của bạn về kết luận v{incident.decisionVersion}
        </p>
        <span className="text-xs text-muted-foreground">
          Hạn chót {fmt(incident.taskerResponseDeadline)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          size="sm"
          variant={responseType === "AGREE" ? "default" : "outline"}
          className="rounded-lg"
          onClick={() => setResponseType("AGREE")}
        >
          Đồng ý
        </Button>
        <Button
          type="button"
          size="sm"
          variant={responseType === "DISAGREE" ? "destructive" : "outline"}
          className="rounded-lg"
          onClick={() => setResponseType("DISAGREE")}
        >
          Không đồng ý
        </Button>
      </div>

      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        placeholder={responseType === "DISAGREE" ? "Nói rõ vì sao bạn không đồng ý…" : "Ghi chú thêm (không bắt buộc)…"}
        className="resize-none rounded-lg text-sm"
      />

      <EvidenceUploader
        upload={(file) => uploadEvidence.mutateAsync(file)}
        value={evidences}
        onChange={setEvidences}
        max={4}
      />

      <Button
        size="sm"
        className="w-full rounded-lg gap-1.5"
        disabled={submit.isPending || invalid}
        onClick={() =>
          submit.mutate(
            {
              decisionVersion: incident.decisionVersion,
              responseType,
              content: content.trim() || null,
              ...(evidences.length ? { evidenceIds: evidences.map((e) => e.id) } : {}),
            },
            {
              onSuccess: () => {
                setContent("");
                setEvidences([]);
              },
            },
          )
        }
      >
        <Send className="size-3.5" /> {submit.isPending ? "Đang gửi…" : "Gửi ý kiến"}
      </Button>
    </div>
  );
}
