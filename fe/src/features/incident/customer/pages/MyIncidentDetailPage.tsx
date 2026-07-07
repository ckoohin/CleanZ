"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, CheckCircle2, ImagePlus, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  useAttachItemEvidence,
  useIncidentDetail,
  useUploadEvidence,
  useWithdrawIncident,
} from "../hooks/useCustomerIncident";
import {
  IncidentStatusBadge,
  CompensationBadge,
  SeverityBadge,
} from "@/features/incident/shared/_components/badges";
import { formatVnd, CLOSURE_LABEL } from "@/features/incident/shared/incident.labels";
import { canWithdraw } from "@/features/incident/shared/incident.machine";

function fmt(d: string | null | undefined) {
  return d ? new Date(d).toLocaleString("vi-VN") : "—";
}

function WithdrawDialog({ id, open, onClose }: { id: string; open: boolean; onClose: () => void }) {
  const withdraw = useWithdrawIncident(id);
  const [reason, setReason] = useState("");
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">Rút báo cáo sự cố</DialogTitle>
        </DialogHeader>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Lý do rút (tuỳ chọn)..."
          className="resize-none rounded-lg text-sm"
        />
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" className="rounded-full" onClick={onClose}>Huỷ</Button>
          <Button
            size="sm"
            variant="destructive"
            className="rounded-full"
            disabled={withdraw.isPending}
            onClick={() => withdraw.mutate({ reason: reason || undefined }, { onSuccess: onClose })}
          >
            {withdraw.isPending ? "Đang rút..." : "Xác nhận rút"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** P1.4 — Uploader bổ sung bằng chứng cho hạng mục Admin yêu cầu (NEED_MORE_EVIDENCE). */
function NeedEvidenceUploader({
  incidentId,
  itemId,
}: {
  incidentId: string;
  itemId: string;
}) {
  const upload = useUploadEvidence();
  const attach = useAttachItemEvidence(incidentId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const busy = upload.isPending || attach.isPending;

  const submit = async () => {
    if (files.length === 0) return;
    const ids: string[] = [];
    for (const f of files) {
      const ev = await upload.mutateAsync(f);
      ids.push(ev.id);
    }
    attach.mutate(
      { itemId, evidenceIds: ids },
      { onSuccess: () => setFiles([]) },
    );
  };

  return (
    <div className="mt-2 rounded-lg border border-amber-300/60 bg-amber-50 p-2.5 dark:bg-amber-500/10">
      <p className="flex items-start gap-1.5 text-xs font-medium text-amber-700">
        <AlertTriangle className="mt-px size-3.5 shrink-0" />
        CleanZ cần thêm bằng chứng cho hạng mục này để tiếp tục thẩm định.
      </p>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png"
        multiple
        className="hidden"
        onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 10))}
      />
      <div className="mt-2 flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full gap-1.5"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
        >
          <ImagePlus className="size-4" /> Chọn ảnh
        </Button>
        {files.length > 0 && (
          <span className="text-xs text-muted-foreground">{files.length} ảnh đã chọn</span>
        )}
        <Button
          type="button"
          size="sm"
          className="ml-auto rounded-full"
          disabled={busy || files.length === 0}
          onClick={() => void submit()}
        >
          {busy ? "Đang gửi..." : "Gửi bổ sung"}
        </Button>
      </div>
    </div>
  );
}

export function MyIncidentDetailPage({ incidentId }: { incidentId: string }) {
  const router = useRouter();
  const { data: inc, isLoading } = useIncidentDetail(incidentId);
  const [showWithdraw, setShowWithdraw] = useState(false);

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
        <p className="text-sm text-muted-foreground">Không tìm thấy sự cố</p>
        <button onClick={() => router.back()} className="text-sm font-semibold text-primary">← Quay lại</button>
      </div>
    );
  }

  const withdrawable = canWithdraw(
    inc.status,
    inc.compensationStatus,
    inc.decisionStatus,
  );

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
          <IncidentStatusBadge status={inc.status} />
          <CompensationBadge status={inc.compensationStatus} />
          <SeverityBadge severity={inc.severity} />
          {inc.closureReason && (
            <span className="text-xs text-muted-foreground">· {CLOSURE_LABEL[inc.closureReason]}</span>
          )}
        </div>

        <div className="rounded-2xl border border-border/40 bg-muted/30 p-3 text-sm">
          <p className="mb-1 text-xs font-bold text-muted-foreground">Mô tả</p>
          {inc.description}
        </div>

        {/* Damage items */}
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Hạng mục thiệt hại</p>
          {inc.damageItems.map((it) => (
            <div key={it.id} className="rounded-xl border border-border/50 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{it.description}</p>
                {it.verificationStatus === "NEED_MORE_EVIDENCE" && (
                  <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                    Cần thêm bằng chứng
                  </span>
                )}
                {it.verificationStatus === "REJECTED" && (
                  <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                    Không được chấp nhận
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-center gap-3 text-xs">
                <span className="text-muted-foreground">Yêu cầu: <b className="text-foreground/80">{formatVnd(it.claimedAmount)}</b></span>
                {it.approvedAmount != null && (
                  <span className="text-emerald-600">Duyệt: <b>{formatVnd(it.approvedAmount)}</b></span>
                )}
              </div>
              {it.evidences.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {it.evidences.map((ev) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={ev.id} src={ev.url} alt="bằng chứng" className="size-14 rounded-lg border border-border/50 object-cover" />
                  ))}
                </div>
              )}
              {inc.status === "INVESTIGATING" &&
                it.verificationStatus === "NEED_MORE_EVIDENCE" && (
                  <NeedEvidenceUploader incidentId={incidentId} itemId={it.id} />
                )}
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-3 rounded-2xl border border-border/40 p-3 text-sm">
          <div>
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Tổng yêu cầu</p>
            <p className="font-semibold">{formatVnd(inc.claimedAmount)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Được duyệt</p>
            <p className="font-semibold text-emerald-600">{formatVnd(inc.approvedAmount)}</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5" /> Báo cáo: {fmt(inc.reportedAt)}
          </div>
          {inc.resolvedAt && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600">
              <CheckCircle2 className="size-3.5" /> Xử lý: {fmt(inc.resolvedAt)}
            </div>
          )}
        </div>

        {withdrawable && (
          <Button variant="outline" className="w-full rounded-xl text-red-600 hover:bg-red-500/10" onClick={() => setShowWithdraw(true)}>
            Rút báo cáo
          </Button>
        )}
      </div>

      <WithdrawDialog id={incidentId} open={showWithdraw} onClose={() => setShowWithdraw(false)} />
    </div>
  );
}
