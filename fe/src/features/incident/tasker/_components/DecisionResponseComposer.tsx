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

  const open =
    incident.canRespondToDecision ||
    incident.responseWindowStatus === "OPEN" ||
    incident.responseWindowStatus === "RESPONDED";
  const expired = incident.responseWindowStatus === "EXPIRED";

  if (!open) {
    return (
      <p className="flex items-center justify-center gap-1.5 rounded-xl border border-border/40 bg-muted/40 p-3 text-xs text-muted-foreground">
        <Lock className="size-3.5" /> Chưa mở cửa sổ phản hồi quyết định.
      </p>
    );
  }

  const contentRequired = responseType === "DISAGREE";
  const invalid = contentRequired && content.trim().length < 10;

  return (
    <div className="space-y-3 rounded-xl border border-border/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Phản hồi quyết định v{incident.decisionVersion}
        </p>
        <span className="text-xs text-muted-foreground">
          Hạn chót {fmt(incident.taskerResponseDeadline)}
        </span>
      </div>

      {expired && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-700">
          <AlertTriangle className="mr-1 inline size-3.5" /> Đã quá hạn phản hồi.
        </p>
      )}

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
        placeholder={responseType === "DISAGREE" ? "Giải thích lý do không đồng ý…" : "Ghi chú (không bắt buộc)…"}
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
        disabled={submit.isPending || invalid || expired}
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
        <Send className="size-3.5" /> {submit.isPending ? "Đang gửi…" : "Gửi phản hồi"}
      </Button>
    </div>
  );
}
