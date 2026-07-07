"use client";

import React, { useMemo, useState } from "react";
import { AdminButton } from "@/components/admin";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Check, Clock, History, Send, ShieldCheck, X } from "lucide-react";
import {
  useExtendTaskerResponse,
  useFinalizeDecision,
  useReviewDecisionResponse,
  useReviseDecision,
  useSaveDecisionDraft,
  useSecondApproval,
  useSubmitDecisionDraft,
} from "../../hooks/useAdminIncident";
import {
  formatVnd,
  DECISION_STATUS_LABEL,
  RESPONSE_WINDOW_LABEL,
  REVIEW_RESULT_LABEL,
  VERIFICATION_STATUS_LABEL,
} from "@/features/incident/shared/incident.labels";
import type {
  IncidentDecisionStatus,
  ResponseWindowStatus,
} from "@/features/incident/shared/incident.enums";
import { checkAllocation } from "@/features/incident/shared/incident.machine";
import {
  FieldHint,
  CharCount,
  FieldLabel,
} from "@/features/incident/shared/_components/FieldHint";
import type {
  IncidentAdminView,
  ResponsibilityParty,
  ResponseReviewResult,
} from "@/features/incident/shared/incident.types";
import type { Decision } from "@/features/incident/shared/incident.enums";

function fmt(d: string | null | undefined) {
  return d ? new Date(d).toLocaleString("vi-VN") : "-";
}

function can(action: string, inc: IncidentAdminView) {
  return inc.decision.allowedActions?.includes(action as never);
}

export function DecisionPanel({ incident }: { incident: IncidentAdminView }) {
  const saveDraft = useSaveDecisionDraft(incident.id);
  const submitDraft = useSubmitDecisionDraft(incident.id);
  const reviewResponse = useReviewDecisionResponse(incident.id);
  const revise = useReviseDecision(incident.id);
  const extendResponse = useExtendTaskerResponse(incident.id);
  const finalize = useFinalizeDecision(incident.id);
  const secondApproval = useSecondApproval(incident.id);

  const [mode, setMode] = useState<Decision>(
    incident.approvedAmount && incident.approvedAmount > 0 ? "APPROVE" : "APPROVE",
  );
  const [approved, setApproved] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      incident.damageItems.map((it) => [
        it.id,
        // Chỉ hạng mục đã VERIFIED mới được duyệt tiền; còn lại (PENDING/REJECTED/
        // NEED_MORE_EVIDENCE) khoá về 0.
        it.verificationStatus === "VERIFIED"
          ? String(it.approvedAmount ?? it.verifiedAmount ?? it.claimedAmount)
          : "0",
      ]),
    ),
  );
  const [responsibilityParty, setResponsibilityParty] =
    useState<ResponsibilityParty | "">(
      incident.decision.responsibilityParty ?? "",
    );
  const [taskerBorne, setTaskerBorne] = useState(
    String(incident.taskerBorneAmount ?? ""),
  );
  const [platformBorne, setPlatformBorne] = useState(
    String(incident.platformBorneAmount ?? ""),
  );
  const [responsibilityReason, setResponsibilityReason] = useState(
    incident.decision.responsibilityReason ?? "",
  );
  const [allocationReason, setAllocationReason] = useState(
    incident.allocationReason ?? "",
  );
  const [taskerDecisionReason, setTaskerDecisionReason] = useState(
    incident.decision.taskerDecisionReason ?? "",
  );
  const [customerDecisionSummary, setCustomerDecisionSummary] = useState(
    incident.decision.customerDecisionSummary ?? "",
  );
  const [internalDecisionNote, setInternalDecisionNote] = useState(
    incident.decision.internalDecisionNote ?? "",
  );
  const [rejectAsFraud, setRejectAsFraud] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const [secondNote, setSecondNote] = useState("");

  // Phòng thủ: backend cũ (chưa restart) có thể chưa trả decisionResponses.
  const decisionResponses = incident.decisionResponses ?? [];
  const currentResponse = decisionResponses.find(
    (r) => r.decisionVersion === incident.decision.version && !r.reviewedAt,
  );
  const sumApproved = useMemo(
    () =>
      incident.damageItems.reduce(
        (sum, it) =>
          sum +
          (it.verificationStatus === "VERIFIED"
            ? Number(approved[it.id]) || 0
            : 0),
        0,
      ),
    [incident.damageItems, approved],
  );
  // Còn hạng mục chưa thẩm định xong → chặn chốt APPROVE (khớp guard backend).
  const hasUnresolvedItems = incident.damageItems.some(
    (it) =>
      it.verificationStatus === "PENDING" ||
      it.verificationStatus === "NEED_MORE_EVIDENCE",
  );
  const allocation = checkAllocation(
    mode === "APPROVE" ? sumApproved : 0,
    Number(taskerBorne) || 0,
    Number(platformBorne) || 0,
  );
  const expectedDecisionVersion = incident.decision.version;
  const busy =
    saveDraft.isPending ||
    submitDraft.isPending ||
    reviewResponse.isPending ||
    revise.isPending ||
    extendResponse.isPending ||
    finalize.isPending ||
    secondApproval.isPending;

  const buildDraft = () => ({
    expectedDecisionVersion,
    decision: mode,
    ...(mode === "APPROVE"
      ? {
        items: incident.damageItems.map((it) => ({
          damageItemId: it.id,
          // Chỉ hạng mục VERIFIED mới được duyệt tiền; còn lại ép 0.
          approvedAmount:
            it.verificationStatus === "VERIFIED"
              ? Number(approved[it.id]) || 0
              : 0,
        })),
        responsibilityParty: responsibilityParty || null,
        responsibilityReason: responsibilityReason.trim() || null,
        taskerBorneAmount: Number(taskerBorne) || 0,
        platformBorneAmount: Number(platformBorne) || 0,
        allocationReason: allocationReason.trim() || null,
        taskerDecisionReason: taskerDecisionReason.trim() || null,
        customerDecisionSummary: customerDecisionSummary.trim(),
      }
      : {
        items: incident.damageItems.map((it) => ({
          damageItemId: it.id,
          approvedAmount: 0,
        })),
        customerDecisionSummary: customerDecisionSummary.trim(),
      }),
    internalDecisionNote: internalDecisionNote.trim() || null,
  });

  // Giới hạn MaxLength khớp với DTO backend (SaveIncidentDecisionDraftDto).
  const MAX = {
    responsibilityReason: 1000,
    allocationReason: 1000,
    taskerDecisionReason: 1000,
    customerDecisionSummary: 1000,
    internalDecisionNote: 2000,
    reviewNote: 2000,
    secondNote: 2000,
  } as const;
  // Ràng buộc độ dài tối thiểu khớp backend (validateDecisionDraft).
  const REVIEW_NOTE_MIN = 10;
  const TEXT_MIN = 10;

  // Trần chính sách: tổng duyệt không được vượt (snapshot lấy tại thời điểm soạn).
  const policyCap = incident.decision.policyCapSnapshot ?? null;
  const overCap = policyCap != null && sumApproved > policyCap;
  const taskerBorneNum = Number(taskerBorne) || 0;
  const platformBorneNum = Number(platformBorne) || 0;
  const taskerReasonMissing = taskerBorneNum > 0 && !taskerDecisionReason.trim();

  // customerDecisionSummary: bắt buộc ≥10 ký tự (cả APPROVE lẫn REJECT).
  const summaryTooShort = customerDecisionSummary.trim().length < TEXT_MIN;
  // responsibilityReason: bắt buộc ≥10 ký tự khi APPROVE.
  const responsibilityReasonTooShort =
    responsibilityReason.trim().length < TEXT_MIN;
  const hasAllocationReason = allocationReason.trim().length > 0;

  // Ràng buộc phân bổ theo bên chịu (backend: INVALID_ALLOCATION_FOR_RESPONSIBILITY).
  let allocationRuleError: string | undefined;
  if (mode === "APPROVE" && responsibilityParty) {
    if (responsibilityParty === "PLATFORM" && taskerBorneNum > 0) {
      allocationRuleError = "Nền tảng chịu: Tasker chịu phải bằng 0";
    } else if (
      responsibilityParty === "UNDETERMINED" &&
      (taskerBorneNum > 0 ||
        platformBorneNum !== sumApproved ||
        !hasAllocationReason)
    ) {
      allocationRuleError =
        "Chưa xác định: Quỹ chịu toàn bộ (Tasker chịu = 0) và cần nhập lý do phân bổ";
    } else if (
      responsibilityParty === "SHARED" &&
      (taskerBorneNum === 0 || platformBorneNum === 0) &&
      !hasAllocationReason
    ) {
      allocationRuleError =
        "Chia sẻ nhưng một bên chịu 0 thì cần nhập lý do phân bổ";
    } else if (
      responsibilityParty === "TASKER" &&
      taskerBorneNum === 0 &&
      !hasAllocationReason
    ) {
      allocationRuleError =
        "Tasker chịu nhưng phần Tasker = 0 thì cần nhập lý do phân bổ";
    }
  }

  const draftInvalid =
    mode === "APPROVE"
      ? sumApproved <= 0 ||
      hasUnresolvedItems ||
      !responsibilityParty ||
      responsibilityReasonTooShort ||
      !allocation.ok ||
      !!allocationRuleError ||
      overCap ||
      summaryTooShort ||
      taskerReasonMissing
      : summaryTooShort;

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-[var(--c-line)] bg-[var(--c-card-2)] p-3 text-xs text-[var(--c-muted)]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-[var(--c-ink)]">Quyết định v{incident.decision.version}</span>
          <span>{DECISION_STATUS_LABEL[incident.decision.status as IncidentDecisionStatus] ?? incident.decision.status}</span>
          <span>{RESPONSE_WINDOW_LABEL[incident.decision.responseWindowStatus as ResponseWindowStatus] ?? incident.decision.responseWindowStatus}</span>
          {incident.decision.taskerResponseDeadline && (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" /> {fmt(incident.decision.taskerResponseDeadline)}
            </span>
          )}
        </div>
        {incident.decision.blockedReasons?.length > 0 && (
          <p className="mt-2 text-[#D97706]">{incident.decision.blockedReasons.join(" · ")}</p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <AdminButton size="sm" variant={mode === "APPROVE" ? "primary" : "secondary"} className="rounded-lg gap-1.5" onClick={() => setMode("APPROVE")}>
          <Check className="size-3.5" /> Duyệt
        </AdminButton>
        <AdminButton size="sm" variant={mode === "APPROVE_NO_COMPENSATION" ? "primary" : "secondary"} className="rounded-lg gap-1" onClick={() => setMode("APPROVE_NO_COMPENSATION")}>
          <Check className="size-3.5" /> Không bồi thường
        </AdminButton>
        <AdminButton size="sm" variant={mode === "REJECT" ? "danger" : "secondary"} className="rounded-lg gap-1.5" onClick={() => setMode("REJECT")}>
          <X className="size-3.5" /> Từ chối
        </AdminButton>
      </div>

      {mode === "APPROVE_NO_COMPENSATION" && (
        <div className="rounded-lg border border-[var(--c-line)] bg-[var(--c-card-2)] p-2.5 text-[11px] leading-snug text-[var(--c-muted)]">
          <p className="mb-1 font-bold text-[var(--c-ink)]">Công nhận sự cố — không bồi thường</p>
          Ghi nhận sự cố có thật nhưng <b>không phát sinh bồi thường</b> (VD lỗi thuộc về khách, ngoài phạm vi chính sách).
          Khác &quot;Từ chối&quot; (báo cáo sai): <b>không cộng cảnh cáo gian lận</b> cho khách. Sự cố sẽ đóng, không chuyển tiền.
          Vui lòng nêu rõ lý do trong phần tóm tắt gửi khách.
        </div>
      )}

      {mode === "APPROVE" && (
        <div className="space-y-3">
          <div className="rounded-lg border border-[var(--c-line)] bg-[var(--c-card-2)] p-2.5 text-[11px] leading-snug text-[var(--c-muted)]">
            <p className="mb-1 font-bold text-[var(--c-ink)]">Yêu cầu duyệt bồi thường</p>
            <ul className="list-disc space-y-0.5 pl-4">
              <li>Số duyệt mỗi hạng mục phải luôn lớn hơn 0 và <b>không vượt số đã xác minh</b>.</li>
              <li>Tổng duyệt phải &gt; 0 và <b>không vượt trần chính sách</b> {policyCap != null ? `(${formatVnd(policyCap)})` : ""}.</li>
              <li>Bắt buộc chọn <b>bên chịu trách nhiệm</b> và nhập <b>lý do quy trách nhiệm (tối thiểu 10 kí tự)</b>.</li>
              <li>Tasker chịu + Quỹ chịu <b>phải bằng tổng duyệt</b> (theo bên chịu: Nền tảng ⇒ Tasker = 0; Chưa xác định ⇒ Quỹ chịu toàn bộ + lý do phân bổ).</li>
              <li>Nếu Tasker chịu &gt; 0 thì bắt buộc nhập <b>lý do gửi Tasker</b>.</li>
              <li>Bắt buộc nhập <b>tóm tắt gửi khách hàng ≥ 10 ký tự</b>.</li>
            </ul>
          </div>
          {hasUnresolvedItems && (
            <div className="rounded-lg border border-[#DC2626]/30 bg-[#DC2626]/5 p-2.5">
              <FieldHint error='Còn hạng mục ở trạng thái "Chờ thẩm định" / "Cần thêm bằng chứng". Quay lại bước "Thẩm định thiệt hại" để Xác minh hoặc Từ chối tất cả hạng mục trước khi lưu/chốt quyết định.' />
            </div>
          )}
          {incident.damageItems.map((it) => {
            const a = Number(approved[it.id]);
            const cap = it.verifiedAmount;
            const verified = it.verificationStatus === "VERIFIED";
            const itemInvalid =
              verified &&
              (!Number.isInteger(a) || a < 0 || (cap != null && a > cap));
            return (
              <div key={it.id} className="rounded-lg border border-[var(--c-line)] p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm">{it.description}</p>
                  <span
                    className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${it.verificationStatus === "VERIFIED"
                      ? "bg-[#10B981]/15 text-[#047857]"
                      : it.verificationStatus === "REJECTED"
                        ? "bg-[#DC2626]/15 text-[#B91C1C]"
                        : "bg-[#F59E0B]/15 text-[#B45309]"
                      }`}
                  >
                    {VERIFICATION_STATUS_LABEL[it.verificationStatus] ?? it.verificationStatus}
                  </span>
                </div>
                <p className="mb-1 text-xs text-[var(--c-muted)]">
                  Yêu cầu {formatVnd(it.claimedAmount)} · Xác minh {formatVnd(it.verifiedAmount)}
                </p>
                {verified ? (
                  <>
                    <Input
                      type="number"
                      min={0}
                      max={cap ?? undefined}
                      step={1}
                      value={approved[it.id]}
                      onChange={(e) => setApproved((prev) => ({ ...prev, [it.id]: e.target.value }))}
                      className="h-8 rounded-lg text-sm"
                    />
                    <div className="mt-1">
                      <FieldHint
                        hint={`Số nguyên, 0 – ${formatVnd(cap)} (≤ số đã xác minh)`}
                        error={itemInvalid ? `Phải là số nguyên từ 0 đến ${formatVnd(cap)}` : undefined}
                      />
                    </div>
                  </>
                ) : it.verificationStatus === "REJECTED" ? (
                  <FieldHint hint="Hạng mục bị từ chối — không duyệt tiền (số duyệt = 0)." />
                ) : (
                  <FieldHint
                    error={`Hạng mục chưa thẩm định xong (${VERIFICATION_STATUS_LABEL[it.verificationStatus] ?? it.verificationStatus
                      }). Quay lại bước "Thẩm định thiệt hại" xử lý trước — nếu không sẽ bị chặn khi chốt.`}
                  />
                )}
              </div>
            );
          })}

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <FieldLabel required>Trách nhiệm</FieldLabel>
              <select
                value={responsibilityParty}
                onChange={(e) => setResponsibilityParty(e.target.value as ResponsibilityParty)}
                className="h-8 w-full rounded-lg border border-[var(--c-line)] bg-[var(--c-card)] px-2 text-xs"
              >
                <option value="">Chọn…</option>
                <option value="TASKER">Tasker chịu</option>
                <option value="PLATFORM">Nền tảng chịu</option>
                <option value="SHARED">Chia sẻ</option>
                <option value="UNDETERMINED">Chưa xác định (CleanZ chịu)</option>
              </select>
            </div>
            <div className="space-y-1">
              <FieldLabel required>Tasker chịu</FieldLabel>
              <Input type="number" min={0} step={1} value={taskerBorne} onChange={(e) => setTaskerBorne(e.target.value)} className="h-8 rounded-lg text-sm" />
            </div>
            <div className="space-y-1">
              <FieldLabel required>Nền tảng chịu</FieldLabel>
              <Input type="number" min={0} step={1} value={platformBorne} onChange={(e) => setPlatformBorne(e.target.value)} className="h-8 rounded-lg text-sm" />
            </div>
          </div>
          <FieldHint
            hint={
              <>
                Bên chịu trách nhiệm là bắt buộc. Tasker chịu + Quỹ chịu (số nguyên ≥ 0) phải bằng tổng duyệt{" "}
                <b>{formatVnd(sumApproved)}</b>.
              </>
            }
            error={
              !responsibilityParty
                ? "Chưa chọn bên chịu trách nhiệm"
                : !allocation.ok
                  ? allocation.reason
                  : allocationRuleError
            }
          />
          {overCap && (
            <FieldHint error={`Tổng duyệt vượt trần chính sách ${formatVnd(policyCap)}`} />
          )}

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <FieldLabel required>Lý do quy trách nhiệm</FieldLabel>
              <CharCount value={responsibilityReason} max={MAX.responsibilityReason} />
            </div>
            <Textarea value={responsibilityReason} maxLength={MAX.responsibilityReason} onChange={(e) => setResponsibilityReason(e.target.value)} rows={2} placeholder="Lý do quy trách nhiệm" className="resize-none rounded-lg text-sm" />
            <FieldHint
              hint={`Bắt buộc · tối thiểu ${TEXT_MIN} ký tự · tối đa ${MAX.responsibilityReason} ký tự`}
              error={
                responsibilityReasonTooShort
                  ? `Bắt buộc, cần tối thiểu ${TEXT_MIN} ký tự (hiện ${responsibilityReason.trim().length})`
                  : undefined
              }
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <FieldLabel>Lý do phân bổ</FieldLabel>
              <CharCount value={allocationReason} max={MAX.allocationReason} />
            </div>
            <Textarea value={allocationReason} maxLength={MAX.allocationReason} onChange={(e) => setAllocationReason(e.target.value)} rows={2} placeholder="Lý do phân bổ" className="resize-none rounded-lg text-sm" />
            <FieldHint
              hint={`Bắt buộc khi phân bổ đặc biệt (Chưa xác định; Chia sẻ/Tasker mà một bên chịu 0) · tối đa ${MAX.allocationReason} ký tự`}
              error={
                allocationRuleError && !hasAllocationReason
                  ? "Trường hợp phân bổ này bắt buộc nhập lý do phân bổ"
                  : undefined
              }
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <FieldLabel required={taskerBorneNum > 0}>Lý do gửi Tasker</FieldLabel>
              <CharCount value={taskerDecisionReason} max={MAX.taskerDecisionReason} />
            </div>
            <Textarea value={taskerDecisionReason} maxLength={MAX.taskerDecisionReason} onChange={(e) => setTaskerDecisionReason(e.target.value)} rows={2} placeholder="Lý do gửi Tasker" className="resize-none rounded-lg text-sm" />
            <FieldHint
              hint={
                taskerBorneNum > 0
                  ? `Bắt buộc khi Tasker chịu > 0 · tối đa ${MAX.taskerDecisionReason} ký tự`
                  : `Không bắt buộc · tối đa ${MAX.taskerDecisionReason} ký tự`
              }
              error={taskerReasonMissing ? "Bắt buộc nhập vì Tasker phải chịu chi phí" : undefined}
            />
          </div>
        </div>
      )}

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <FieldLabel required>Tóm tắt gửi khách hàng</FieldLabel>
          <CharCount value={customerDecisionSummary} max={MAX.customerDecisionSummary} />
        </div>
        <Textarea value={customerDecisionSummary} maxLength={MAX.customerDecisionSummary} onChange={(e) => setCustomerDecisionSummary(e.target.value)} rows={2} placeholder="Tóm tắt gửi khách hàng" className="resize-none rounded-lg text-sm" />
        <FieldHint
          hint={`Bắt buộc · tối thiểu ${TEXT_MIN} ký tự · tối đa ${MAX.customerDecisionSummary} ký tự · nội dung này hiển thị cho khách hàng`}
          error={
            summaryTooShort
              ? `Bắt buộc, cần tối thiểu ${TEXT_MIN} ký tự (hiện ${customerDecisionSummary.trim().length})`
              : undefined
          }
        />
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <FieldLabel>Ghi chú nội bộ</FieldLabel>
          <CharCount value={internalDecisionNote} max={MAX.internalDecisionNote} />
        </div>
        <Textarea value={internalDecisionNote} maxLength={MAX.internalDecisionNote} onChange={(e) => setInternalDecisionNote(e.target.value)} rows={2} placeholder="Ghi chú nội bộ" className="resize-none rounded-lg text-sm" />
        <FieldHint hint={`Không bắt buộc · chỉ nội bộ · tối đa ${MAX.internalDecisionNote} ký tự`} />
      </div>

      {mode === "REJECT" && (
        <label className="flex items-center gap-2 rounded-lg border border-[var(--c-line)] p-2.5 text-sm">
          <input type="checkbox" checked={rejectAsFraud} onChange={(e) => setRejectAsFraud(e.target.checked)} />
          Đánh dấu báo cáo sai sự thật
        </label>
      )}

      <div className="grid grid-cols-2 gap-2">
        <AdminButton size="sm" variant="secondary" className="rounded-lg" disabled={busy || draftInvalid || !can("SAVE_DRAFT", incident)} onClick={() => saveDraft.mutate(buildDraft())}>
          Lưu nháp
        </AdminButton>
        <AdminButton size="sm" variant="primary" className="rounded-lg gap-1.5" disabled={busy || !can("SUBMIT_DRAFT", incident)} onClick={() => submitDraft.mutate({ expectedDecisionVersion })}>
          <Send className="size-3.5" /> Gửi cho Tasker
        </AdminButton>
      </div>
      <FieldHint
        hint={
          can("SUBMIT_DRAFT", incident)
            ? "Đã có nháp hợp lệ — có thể gửi cho Tasker."
            : 'Phải "Lưu nháp" hợp lệ trước, rồi mới "Gửi cho Tasker" (chưa có nháp thì gửi sẽ báo cần tạo nháp).'
        }
      />

      {can("REVISE_DECISION", incident) && (
        <div className="space-y-2 rounded-lg border border-[var(--c-line)] bg-[var(--c-card-2)] p-3">
          <p className="flex items-center gap-1 text-xs font-bold uppercase text-[var(--c-muted)]">
            <History className="size-3.5" /> Sửa lại quyết định
          </p>
          <p className="text-xs text-[var(--c-muted)]">
            Ghi đè quyết định đã gửi và tạo phiên bản mới (đặt lại phản hồi Tasker &amp; duyệt cấp 2).
          </p>
          <AdminButton size="sm" variant="secondary" className="w-full rounded-lg gap-1.5" disabled={busy || draftInvalid} onClick={() => revise.mutate(buildDraft())}>
            Sửa &amp; tạo phiên bản mới
          </AdminButton>
        </div>
      )}

      {incident.decision.responseWindowStatus === "EXPIRED" && (
        <p className="rounded-lg border border-[#D97706]/30 bg-[#D97706]/10 p-2.5 text-xs text-[#B45309]">
          <AlertTriangle className="mr-1 inline size-3.5" /> Tasker không phản hồi trước thời hạn.
        </p>
      )}

      {/* C6 — bắt buộc gia hạn + nhắc Tasker trước khi được chốt (công bằng). */}
      {can("EXTEND_RESPONSE", incident) && (
        <div className="space-y-2 rounded-lg border border-[#D97706]/40 bg-[#D97706]/5 p-3">
          <p className="text-xs font-bold uppercase text-[var(--c-muted)]">Gia hạn phản hồi cho Tasker</p>
          <p className="text-xs text-[var(--c-muted)]">
            Tasker chưa phản hồi trước hạn với quyết định bất lợi. Để đảm bảo công bằng, hãy gia hạn thêm
            một lần và nhắc Tasker trước khi chốt. Nếu vẫn không phản hồi, bạn có thể chốt sau khi hết hạn gia hạn.
          </p>
          <AdminButton
            size="sm"
            variant="secondary"
            className="w-full rounded-lg gap-1.5"
            disabled={busy}
            onClick={() => extendResponse.mutate({ expectedDecisionVersion })}
          >
            <Clock className="size-3.5" /> Gia hạn &amp; nhắc Tasker
          </AdminButton>
        </div>
      )}

      {/* Lịch sử phản hồi đầy đủ nằm ở tab "Phản hồi & Giải trình". Ở đây chỉ giữ
          hành động xem xét cho phản hồi mới nhất chưa review của version hiện tại. */}
      {currentResponse && (
        <div className="space-y-2 rounded-lg border border-[var(--c-primary-strong)]/40 bg-[var(--c-primary)]/5 p-3">
          <p className="text-xs font-bold uppercase text-[var(--c-muted)]">Xem xét phản hồi mới nhất</p>
          <div className="flex items-center justify-between">
            <FieldLabel required>Ghi chú xem xét của Admin</FieldLabel>
            <CharCount value={reviewNote} max={MAX.reviewNote} />
          </div>
          <Textarea value={reviewNote} maxLength={MAX.reviewNote} onChange={(e) => setReviewNote(e.target.value)} rows={2} placeholder="Ghi chú xem xét của Admin" className="resize-none rounded-lg text-sm" />
          <FieldHint
            hint={`Bắt buộc · tối thiểu ${REVIEW_NOTE_MIN} ký tự · tối đa ${MAX.reviewNote} ký tự`}
            error={
              reviewNote.trim().length > 0 && reviewNote.trim().length < REVIEW_NOTE_MIN
                ? `Cần tối thiểu ${REVIEW_NOTE_MIN} ký tự (hiện ${reviewNote.trim().length})`
                : undefined
            }
          />
          <div className="grid grid-cols-2 gap-2">
            {(["KEEP_DECISION", "REVISE_DECISION"] as ResponseReviewResult[]).map((result) => (
              <AdminButton key={result} size="sm" variant="secondary" className="rounded-lg" disabled={busy || reviewNote.trim().length < 10} onClick={() => reviewResponse.mutate({ expectedDecisionVersion, responseId: currentResponse.id, result, adminReviewNote: reviewNote.trim() })}>
                {REVIEW_RESULT_LABEL[result]}
              </AdminButton>
            ))}
          </div>
        </div>
      )}

      <AdminButton size="sm" variant="primary" className="w-full rounded-lg gap-1.5" disabled={busy || !can("FINALIZE", incident)} onClick={() => finalize.mutate({ expectedDecisionVersion, ...(mode === "REJECT" ? { rejectAsFraud } : {}) })}>
        <ShieldCheck className="size-3.5" /> Chốt quyết định
      </AdminButton>

      {incident.decision.status === "PENDING_ADMIN_APPROVAL" && (
        <div className="space-y-2 rounded-lg border border-[var(--c-line)] p-3">
          <p className="text-xs font-bold uppercase text-[var(--c-muted)]">Duyệt cấp 2</p>
          <div className="flex items-center justify-between">
            <FieldLabel>Ghi chú yêu cầu chỉnh sửa</FieldLabel>
            <CharCount value={secondNote} max={MAX.secondNote} />
          </div>
          <Textarea value={secondNote} maxLength={MAX.secondNote} onChange={(e) => setSecondNote(e.target.value)} rows={2} placeholder="Ghi chú yêu cầu chỉnh sửa" className="resize-none rounded-lg text-sm" />
          <FieldHint
            hint={`Chỉ bắt buộc khi "Yêu cầu chỉnh sửa" · tối thiểu ${REVIEW_NOTE_MIN} ký tự · tối đa ${MAX.secondNote} ký tự`}
            error={
              secondNote.trim().length > 0 && secondNote.trim().length < REVIEW_NOTE_MIN
                ? `Cần tối thiểu ${REVIEW_NOTE_MIN} ký tự để yêu cầu chỉnh sửa`
                : undefined
            }
          />
          <div className="grid grid-cols-2 gap-2">
            <AdminButton size="sm" variant="primary" className="rounded-lg" disabled={busy} onClick={() => secondApproval.mutate({ expectedDecisionVersion, action: "APPROVE" })}>
              Duyệt
            </AdminButton>
            <AdminButton size="sm" variant="danger" className="rounded-lg" disabled={busy || secondNote.trim().length < 10} onClick={() => secondApproval.mutate({ expectedDecisionVersion, action: "REQUEST_CHANGES", note: secondNote.trim() })}>
              Yêu cầu chỉnh sửa
            </AdminButton>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-[var(--c-line)] p-3 text-xs text-[var(--c-muted)]">
        <p className="mb-2 flex items-center gap-1 font-bold uppercase text-[var(--c-ink)]">
          <History className="size-3.5" /> Thông tin kiểm toán
        </p>
        <div className="grid grid-cols-2 gap-2">
          <span>Chính sách: {incident.decision.policyVersion ?? "-"}</span>
          <span>Trần: {formatVnd(incident.decision.policyCapSnapshot)}</span>
          <span>Ngưỡng duyệt 2 cấp: {formatVnd(incident.decision.dualApprovalThresholdSnapshot)}</span>
          <span>Cửa sổ phản hồi: {incident.decision.responseWindowHoursSnapshot ?? "-"} giờ</span>
          <span>Đã chốt: {fmt(incident.decision.finalizedAt)}</span>
          <span>Đã duyệt cấp 2: {fmt(incident.decision.secondApprovedAt)}</span>
        </div>
      </div>
    </section>
  );
}
