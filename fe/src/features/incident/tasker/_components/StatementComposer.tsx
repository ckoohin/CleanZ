"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Lock, Send } from "lucide-react";
import { EvidenceUploader } from "@/features/incident/shared/_components/EvidenceUploader";
import type { Evidence } from "@/features/incident/shared/incident.types";
import { useSubmitStatement, useTaskerUploadEvidence } from "../hooks/useTaskerIncident";

/**
 * Soạn giải trình/đối chất. Chỉ bật khi `canSubmitStatement` (INVESTIGATING + còn hạn);
 * quá hạn → khoá + ghi chú (BE vẫn chốt chặn 409).
 */
export function StatementComposer({
  incidentId,
  canSubmit,
}: {
  incidentId: string;
  canSubmit: boolean;
}) {
  const submit = useSubmitStatement(incidentId);
  const uploadEvidence = useTaskerUploadEvidence();
  const [body, setBody] = useState("");
  const [evidences, setEvidences] = useState<Evidence[]>([]);

  if (!canSubmit) {
    return (
      <p className="flex items-center justify-center gap-1.5 rounded-xl border border-border/40 bg-muted/40 p-3 text-xs text-muted-foreground">
        <Lock className="size-3.5" /> Đã quá thời hạn hoặc không trong giai đoạn thẩm định — không thể gửi giải trình.
      </p>
    );
  }

  const handleSend = () => {
    if (!body.trim()) return;
    submit.mutate(
      {
        body: body.trim(),
        ...(evidences.length ? { evidenceIds: evidences.map((e) => e.id) } : {}),
      },
      {
        onSuccess: () => {
          setBody("");
          setEvidences([]);
        },
      },
    );
  };

  return (
    <div className="space-y-2 rounded-xl border border-border/40 p-3">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="Nhập giải trình của bạn..."
        className="resize-none rounded-lg text-sm"
        aria-label="Nội dung giải trình"
      />
      <EvidenceUploader
        upload={(f) => uploadEvidence.mutateAsync(f)}
        value={evidences}
        onChange={setEvidences}
        max={4}
      />
      <Button
        size="sm"
        className="w-full rounded-lg gap-1.5"
        onClick={handleSend}
        disabled={!body.trim() || submit.isPending}
      >
        <Send className="size-3.5" /> {submit.isPending ? "Đang gửi..." : "Gửi giải trình"}
      </Button>
    </div>
  );
}
