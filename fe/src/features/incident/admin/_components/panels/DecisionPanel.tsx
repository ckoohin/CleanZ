"use client";

import React, { useMemo, useState } from "react";
import { AdminButton } from "@/components/admin";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Check, Clock, History, Send, ShieldCheck, X } from "lucide-react";
import {
  useFinalizeDecision,
  useSaveDecision,
  useSendDecisionToTasker,
} from "../../hooks/useAdminIncident";
import {
  formatVnd,
  BLOCKED_REASON_LABEL,
  OUTCOME_LABEL,
  STATUS_LABEL,
} from "@/features/incident/shared/incident.labels";
import {
  checkAllocation,
  isIntegerAmount,
} from "@/features/incident/shared/incident.machine";
import {
  FieldHint,
  CharCount,
  FieldLabel,
} from "@/features/incident/shared/_components/FieldHint";
import type {
  DamageItem,
  DecisionOutcome,
  IncidentAdminView,
  ResponsibilityParty,
} from "@/features/incident/shared/incident.types";

function fmt(d: string | null | undefined) {
  return d ? new Date(d).toLocaleString("vi-VN") : "-";
}

/** Hành động khả dụng do BE tính — FE không tự suy bước tiếp theo. */
function can(action: string, inc: IncidentAdminView) {
  return inc.decision.allowedActions?.includes(action as never);
}

/** Giới hạn độ dài khớp DTO backend (SaveIncidentDecisionDto). */
const MAX = {
  responsibilityReason: 1000,
  allocationReason: 1000,
  taskerDecisionReason: 1000,
  customerDecisionSummary: 1000,
  internalDecisionNote: 2000,
} as const;
const TEXT_MIN = 10;

interface FormSnapshot {
  outcome: DecisionOutcome;
  items: { id: string; amount: number; status: string }[];
  responsibilityParty: ResponsibilityParty | "";
  taskerBorne: number;
  platformBorne: number;
  responsibilityReason: string;
  allocationReason: string;
  taskerDecisionReason: string;
  customerDecisionSummary: string;
  internalDecisionNote: string;
}

/**
 * Giá trị quyết định đang lưu trên server, chuẩn hoá về cùng dạng với state của
 * form để so sánh được. "Gửi Tasker" và "Chốt" tác động lên bản ĐÃ LƯU, nên khi
 * form còn khác bản này thì hai nút đó sẽ xử lý con số khác con số đang hiển thị.
 */
function snapshotOf(incident: IncidentAdminView): FormSnapshot {
  return {
    outcome: incident.decision.outcome ?? "COMPENSATE",
    items: incident.damageItems.map((it) => ({
      id: it.id,
      amount: Number(it.approvedAmount ?? it.claimedAmount) || 0,
      status:
        it.verificationStatus === "PENDING"
          ? "VERIFIED"
          : it.verificationStatus,
    })),
    responsibilityParty: incident.decision.responsibilityParty ?? "",
    taskerBorne: Number(incident.taskerBorneAmount ?? 0) || 0,
    platformBorne: Number(incident.platformBorneAmount ?? 0) || 0,
    responsibilityReason: (incident.decision.responsibilityReason ?? "").trim(),
    allocationReason: (incident.allocationReason ?? "").trim(),
    taskerDecisionReason: (incident.decision.taskerDecisionReason ?? "").trim(),
    customerDecisionSummary: (
      incident.decision.customerDecisionSummary ?? ""
    ).trim(),
    internalDecisionNote: (incident.decision.internalDecisionNote ?? "").trim(),
  };
}

/**
 * Soạn quyết định — MỘT form duy nhất.
 *
 * Gộp bước "Xác minh thiệt hại" cũ vào đây: mỗi khoản chỉ còn MỘT con số (số duyệt),
 * kèm trạng thái. Không còn nút "Lưu nháp / Sửa & tạo phiên bản mới" tách rời, không còn
 * ô review phản hồi, không còn khối duyệt cấp 2.
 */
export function DecisionPanel({ incident }: { incident: IncidentAdminView }) {
  const saveDecision = useSaveDecision(incident.id);
  const sendToTasker = useSendDecisionToTasker(incident.id);
  const finalize = useFinalizeDecision(incident.id);

  const [outcome, setOutcome] = useState<DecisionOutcome>(
    incident.decision.outcome ?? "COMPENSATE",
  );
  const [approved, setApproved] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      incident.damageItems.map((it) => [
        it.id,
        String(it.approvedAmount ?? it.claimedAmount),
      ]),
    ),
  );
  const [itemStatus, setItemStatus] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      incident.damageItems.map((it) => [
        it.id,
        it.verificationStatus === "PENDING"
          ? "VERIFIED"
          : it.verificationStatus,
      ]),
    ),
  );
  const [responsibilityParty, setResponsibilityParty] = useState<
    ResponsibilityParty | ""
  >(incident.decision.responsibilityParty ?? "");
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
  const [confirmFinalize, setConfirmFinalize] = useState(false);

  const isCompensate = outcome === "COMPENSATE";
  const sumApproved = useMemo(
    () =>
      incident.damageItems.reduce(
        (sum, it) =>
          sum +
          (itemStatus[it.id] === "VERIFIED" ? Number(approved[it.id]) || 0 : 0),
        0,
      ),
    [incident.damageItems, approved, itemStatus],
  );

  const taskerBorneNum = Number(taskerBorne) || 0;
  const platformBorneNum = Number(platformBorne) || 0;
  const allocation = checkAllocation(
    isCompensate ? sumApproved : 0,
    taskerBorneNum,
    platformBorneNum,
  );
  const expectedDecisionVersion = incident.decision.version;

  const saved = useMemo(() => snapshotOf(incident), [incident]);
  const current: FormSnapshot = {
    outcome,
    items: incident.damageItems.map((it) => ({
      id: it.id,
      amount: Number(approved[it.id]) || 0,
      status: itemStatus[it.id],
    })),
    responsibilityParty,
    taskerBorne: taskerBorneNum,
    platformBorne: platformBorneNum,
    responsibilityReason: responsibilityReason.trim(),
    allocationReason: allocationReason.trim(),
    taskerDecisionReason: taskerDecisionReason.trim(),
    customerDecisionSummary: customerDecisionSummary.trim(),
    internalDecisionNote: internalDecisionNote.trim(),
  };
  const dirty = JSON.stringify(saved) !== JSON.stringify(current);

  /** Kết cục ĐÃ LƯU — BE chốt theo bản này, không theo nút đang chọn trên form. */
  const savedOutcome = incident.decision.outcome;
  const busy =
    saveDecision.isPending || sendToTasker.isPending || finalize.isPending;

  const policyCap = incident.decision.policyCapSnapshot ?? null;
  const overCap = policyCap != null && sumApproved > policyCap;
  const summaryTooShort = customerDecisionSummary.trim().length < TEXT_MIN;
  const responsibilityReasonTooShort =
    responsibilityReason.trim().length < TEXT_MIN;
  const hasAllocationReason = allocationReason.trim().length > 0;
  const taskerReasonMissing =
    taskerBorneNum > 0 && !taskerDecisionReason.trim();
  /**
   * Cùng một vị từ cho cảnh báo dưới ô nhập và cho cổng chặn nút Lưu — tách
   * đôi thì ô báo đỏ mà nút vẫn bấm được, và BE trả 422.
   */
  const itemAmountInvalid = (it: DamageItem) => {
    if (itemStatus[it.id] !== "VERIFIED") return false;
    const amount = Number(approved[it.id]);
    // Chấp nhận thì phải duyệt > 0 (backend: INVALID_APPROVED_AMOUNT). "Chấp nhận nhưng
    // duyệt 0đ" là kết luận tự mâu thuẫn — không đền thì chọn "Từ chối".
    return !isIntegerAmount(amount) || amount <= 0 || amount > it.claimedAmount;
  };
  const hasInvalidItem = incident.damageItems.some(itemAmountInvalid);
  const needEvidenceBlocking =
    isCompensate &&
    incident.damageItems.some(
      (it) => itemStatus[it.id] === "NEED_MORE_EVIDENCE",
    );

  // Ràng buộc chia tiền theo bên chịu trách nhiệm (backend: INVALID_ALLOCATION_FOR_RESPONSIBILITY).
  let allocationRuleError: string | undefined;
  if (isCompensate && responsibilityParty) {
    if (responsibilityParty === "PLATFORM" && taskerBorneNum > 0) {
      allocationRuleError = "Nền tảng chịu: phần Tasker phải bằng 0";
    } else if (
      responsibilityParty === "UNDETERMINED" &&
      (taskerBorneNum > 0 ||
        platformBorneNum !== sumApproved ||
        !hasAllocationReason)
    ) {
      allocationRuleError =
        "Chưa xác định: quỹ nền tảng chịu toàn bộ (phần Tasker = 0) và phải nhập lý do chia tỷ lệ";
    } else if (
      responsibilityParty === "SHARED" &&
      (taskerBorneNum === 0 || platformBorneNum === 0) &&
      !hasAllocationReason
    ) {
      allocationRuleError =
        "Chia trách nhiệm nhưng một bên chịu 0 thì phải nhập lý do chia tỷ lệ";
    } else if (
      responsibilityParty === "TASKER" &&
      taskerBorneNum === 0 &&
      !hasAllocationReason
    ) {
      allocationRuleError =
        "Tasker chịu nhưng phần Tasker = 0 thì phải nhập lý do chia tỷ lệ";
    }
  }

  const invalid = isCompensate
    ? sumApproved <= 0 ||
      hasInvalidItem ||
      needEvidenceBlocking ||
      !responsibilityParty ||
      responsibilityReasonTooShort ||
      !allocation.ok ||
      !!allocationRuleError ||
      overCap ||
      summaryTooShort ||
      taskerReasonMissing
    : summaryTooShort;

  const buildBody = () => ({
    expectedDecisionVersion,
    outcome,
    ...(isCompensate
      ? {
          items: incident.damageItems.map((it) => ({
            damageItemId: it.id,
            approvedAmount:
              itemStatus[it.id] === "VERIFIED"
                ? Number(approved[it.id]) || 0
                : 0,
            status: itemStatus[it.id] as
              "VERIFIED" | "REJECTED" | "NEED_MORE_EVIDENCE",
          })),
          responsibilityParty: responsibilityParty || null,
          responsibilityReason: responsibilityReason.trim() || null,
          taskerBorneAmount: taskerBorneNum,
          platformBorneAmount: platformBorneNum,
          allocationReason: allocationReason.trim() || null,
          taskerDecisionReason: taskerDecisionReason.trim() || null,
        }
      : {}),
    customerDecisionSummary: customerDecisionSummary.trim(),
    internalDecisionNote: internalDecisionNote.trim() || null,
  });

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-[var(--c-line)] bg-[var(--c-card-2)] p-3 text-xs text-[var(--c-muted)]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-[var(--c-ink)]">
            Quyết định v{incident.decision.version}
          </span>
          <span>{STATUS_LABEL[incident.status] ?? incident.status}</span>
          {incident.decision.outcome && (
            <span>{OUTCOME_LABEL[incident.decision.outcome]}</span>
          )}
          {incident.decision.taskerResponseDeadline && (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" /> Hạn Tasker phản hồi:{" "}
              {fmt(incident.decision.taskerResponseDeadline)}
            </span>
          )}
        </div>
        {incident.decision.blockedReasons?.map((reason) => (
          <p key={reason} className="mt-2 text-[#D97706]">
            {BLOCKED_REASON_LABEL[reason] ?? reason}
          </p>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <AdminButton
          size="sm"
          variant={outcome === "COMPENSATE" ? "primary" : "secondary"}
          className="rounded-lg gap-1.5"
          onClick={() => setOutcome("COMPENSATE")}
        >
          <Check className="size-3.5" /> Bồi thường
        </AdminButton>
        <AdminButton
          size="sm"
          variant={outcome === "NO_COMPENSATION" ? "primary" : "secondary"}
          className="rounded-lg gap-1"
          onClick={() => setOutcome("NO_COMPENSATION")}
        >
          <Check className="size-3.5" /> Không bồi thường
        </AdminButton>
        <AdminButton
          size="sm"
          variant={outcome === "REJECT" ? "danger" : "secondary"}
          className="rounded-lg gap-1.5"
          onClick={() => setOutcome("REJECT")}
        >
          <X className="size-3.5" /> Bác bỏ
        </AdminButton>
      </div>

      {outcome === "NO_COMPENSATION" && (
        <div className="rounded-lg border border-[var(--c-line)] bg-[var(--c-card-2)] p-2.5 text-[11px] leading-snug text-[var(--c-muted)]">
          <p className="mb-1 font-bold text-[var(--c-ink)]">
            Công nhận có sự cố — nhưng không bồi thường
          </p>
          Sự cố có thật nhưng <b>không phát sinh bồi thường</b> (VD lỗi thuộc về
          khách, hoặc ngoài phạm vi chính sách). Khác &quot;Bác bỏ&quot; (báo
          cáo sai sự thật): <b>không tính là khách báo cáo sai</b>.
        </div>
      )}

      {isCompensate && (
        <div className="space-y-3">
          <div className="rounded-lg border border-[var(--c-line)] bg-[var(--c-card-2)] p-2.5 text-[11px] leading-snug text-[var(--c-muted)]">
            <p className="mb-1 font-bold text-[var(--c-ink)]">
              Xem xét &amp; duyệt tiền
            </p>
            <ul className="list-disc space-y-0.5 pl-4">
              <li>
                Mỗi khoản chỉ nhập <b>một số tiền duyệt</b>, không vượt số khách
                yêu cầu.
              </li>
              <li>
                Tổng duyệt &gt; 0 và không vượt mức bồi thường tối đa
                {policyCap != null ? ` (${formatVnd(policyCap)})` : ""}.
              </li>
              <li>
                Phần Tasker + phần quỹ nền tảng <b>phải bằng tổng duyệt</b>.
              </li>
              <li>
                Nếu <b>phần Tasker &gt; 0</b>, phải gửi Tasker phản hồi trước
                khi chốt.
              </li>
            </ul>
          </div>

          {incident.damageItems.map((it) => {
            const status = itemStatus[it.id];
            const itemInvalid = itemAmountInvalid(it);
            return (
              <div
                key={it.id}
                className="space-y-1.5 rounded-lg border border-[var(--c-line)] p-2.5"
              >
                <p className="text-sm">{it.description}</p>
                <p className="text-xs text-[var(--c-muted)]">
                  Khách yêu cầu {formatVnd(it.claimedAmount)}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={status}
                    onChange={(e) =>
                      setItemStatus((prev) => ({
                        ...prev,
                        [it.id]: e.target.value,
                      }))
                    }
                    className="h-8 w-full rounded-lg border border-[var(--c-line)] bg-[var(--c-card)] px-2 text-xs"
                  >
                    <option value="VERIFIED">Chấp nhận</option>
                    <option value="REJECTED">Từ chối</option>
                    <option value="NEED_MORE_EVIDENCE">
                      Cần thêm bằng chứng
                    </option>
                  </select>
                  <Input
                    type="number"
                    min={1}
                    max={it.claimedAmount}
                    step={1}
                    disabled={status !== "VERIFIED"}
                    value={status === "VERIFIED" ? approved[it.id] : "0"}
                    onChange={(e) =>
                      setApproved((prev) => ({
                        ...prev,
                        [it.id]: e.target.value,
                      }))
                    }
                    className="h-8 rounded-lg text-sm"
                  />
                </div>
                <FieldHint
                  hint={
                    status === "VERIFIED"
                      ? `Số nguyên, 1 – ${formatVnd(it.claimedAmount)}`
                      : status === "REJECTED"
                        ? "Khoản này bị từ chối — không duyệt tiền."
                        : "Sẽ nhắc khách bổ sung ảnh; còn khoản này thì chưa chốt được."
                  }
                  error={
                    itemInvalid
                      ? `Phải là số nguyên từ 1 đến ${formatVnd(it.claimedAmount)} — không đền thì chọn "Từ chối"`
                      : undefined
                  }
                />
              </div>
            );
          })}

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <FieldLabel required>Ai chịu trách nhiệm</FieldLabel>
              <select
                value={responsibilityParty}
                onChange={(e) =>
                  setResponsibilityParty(e.target.value as ResponsibilityParty)
                }
                className="h-8 w-full rounded-lg border border-[var(--c-line)] bg-[var(--c-card)] px-2 text-xs"
              >
                <option value="">Chọn…</option>
                <option value="TASKER">Tasker chịu</option>
                <option value="PLATFORM">Nền tảng chịu</option>
                <option value="SHARED">Chia trách nhiệm</option>
                <option value="UNDETERMINED">
                  Chưa xác định (CleanZ chịu)
                </option>
              </select>
            </div>
            <div className="space-y-1">
              <FieldLabel required>Phần Tasker chịu</FieldLabel>
              <Input
                type="number"
                min={0}
                step={1}
                value={taskerBorne}
                onChange={(e) => setTaskerBorne(e.target.value)}
                className="h-8 rounded-lg text-sm"
              />
            </div>
            <div className="space-y-1">
              <FieldLabel required>Phần nền tảng chịu</FieldLabel>
              <Input
                type="number"
                min={0}
                step={1}
                value={platformBorne}
                onChange={(e) => setPlatformBorne(e.target.value)}
                className="h-8 rounded-lg text-sm"
              />
            </div>
          </div>
          <FieldHint
            hint={
              <>
                Phần Tasker + phần nền tảng phải bằng tổng duyệt{" "}
                <b>{formatVnd(sumApproved)}</b>.
              </>
            }
            error={
              !responsibilityParty
                ? "Chưa chọn ai chịu trách nhiệm"
                : !allocation.ok
                  ? allocation.reason
                  : allocationRuleError
            }
          />
          {overCap && (
            <FieldHint
              error={`Tổng duyệt vượt mức bồi thường tối đa ${formatVnd(policyCap)}`}
            />
          )}

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <FieldLabel required>Vì sao kết luận như vậy</FieldLabel>
              <CharCount
                value={responsibilityReason}
                max={MAX.responsibilityReason}
              />
            </div>
            <Textarea
              value={responsibilityReason}
              maxLength={MAX.responsibilityReason}
              onChange={(e) => setResponsibilityReason(e.target.value)}
              rows={2}
              placeholder="Căn cứ để quy trách nhiệm cho bên này"
              className="resize-none rounded-lg text-sm"
            />
            <FieldHint
              hint={`Bắt buộc · tối thiểu ${TEXT_MIN} ký tự`}
              error={
                responsibilityReasonTooShort
                  ? `Cần tối thiểu ${TEXT_MIN} ký tự (hiện ${responsibilityReason.trim().length})`
                  : undefined
              }
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <FieldLabel>Lý do chia tỷ lệ</FieldLabel>
              <CharCount value={allocationReason} max={MAX.allocationReason} />
            </div>
            <Textarea
              value={allocationReason}
              maxLength={MAX.allocationReason}
              onChange={(e) => setAllocationReason(e.target.value)}
              rows={2}
              placeholder="Vì sao chia tiền theo tỷ lệ này"
              className="resize-none rounded-lg text-sm"
            />
            <FieldHint hint="Bắt buộc khi chia tiền bất thường (Chưa xác định; Chia trách nhiệm/Tasker mà một bên chịu 0)" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <FieldLabel required={taskerBorneNum > 0}>
                Lý do gửi Tasker
              </FieldLabel>
              <CharCount
                value={taskerDecisionReason}
                max={MAX.taskerDecisionReason}
              />
            </div>
            <Textarea
              value={taskerDecisionReason}
              maxLength={MAX.taskerDecisionReason}
              onChange={(e) => setTaskerDecisionReason(e.target.value)}
              rows={2}
              placeholder="Lý do gửi Tasker"
              className="resize-none rounded-lg text-sm"
            />
            <FieldHint
              hint={
                taskerBorneNum > 0
                  ? "Bắt buộc khi Tasker chịu > 0 — Tasker sẽ đọc nội dung này khi phản hồi"
                  : "Không bắt buộc"
              }
              error={
                taskerReasonMissing
                  ? "Bắt buộc nhập vì Tasker phải chịu chi phí"
                  : undefined
              }
            />
          </div>
        </div>
      )}

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <FieldLabel required>Tóm tắt gửi khách hàng</FieldLabel>
          <CharCount
            value={customerDecisionSummary}
            max={MAX.customerDecisionSummary}
          />
        </div>
        <Textarea
          value={customerDecisionSummary}
          maxLength={MAX.customerDecisionSummary}
          onChange={(e) => setCustomerDecisionSummary(e.target.value)}
          rows={2}
          placeholder="Tóm tắt gửi khách hàng"
          className="resize-none rounded-lg text-sm"
        />
        <FieldHint
          hint={`Bắt buộc · tối thiểu ${TEXT_MIN} ký tự · khách hàng sẽ đọc nội dung này`}
          error={
            summaryTooShort
              ? `Cần tối thiểu ${TEXT_MIN} ký tự (hiện ${customerDecisionSummary.trim().length})`
              : undefined
          }
        />
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <FieldLabel>Ghi chú nội bộ</FieldLabel>
          <CharCount
            value={internalDecisionNote}
            max={MAX.internalDecisionNote}
          />
        </div>
        <Textarea
          value={internalDecisionNote}
          maxLength={MAX.internalDecisionNote}
          onChange={(e) => setInternalDecisionNote(e.target.value)}
          rows={2}
          placeholder="Ghi chú nội bộ"
          className="resize-none rounded-lg text-sm"
        />
        <FieldHint hint="Không bắt buộc · chỉ nội bộ" />
      </div>

      {savedOutcome === "REJECT" && (
        <label className="flex items-center gap-2 rounded-lg border border-[var(--c-line)] p-2.5 text-sm">
          <input
            type="checkbox"
            checked={rejectAsFraud}
            onChange={(e) => setRejectAsFraud(e.target.checked)}
          />
          Đánh dấu báo cáo sai sự thật (cộng cảnh cáo gian lận cho khách)
        </label>
      )}

      <AdminButton
        size="sm"
        variant="secondary"
        className="w-full rounded-lg"
        disabled={busy || invalid || !can("SAVE_DECISION", incident)}
        onClick={() => saveDecision.mutate(buildBody())}
      >
        Lưu quyết định
      </AdminButton>

      {dirty && (
        <FieldHint error="Còn thay đổi chưa lưu. Bấm “Lưu quyết định” trước, vì gửi Tasker và chốt đều xử lý bản đã lưu chứ không phải nội dung đang hiển thị." />
      )}

      {can("SEND_TO_TASKER", incident) && (
        <div className="space-y-2 rounded-lg border border-[#D97706]/40 bg-[#D97706]/5 p-3">
          <p className="text-xs font-bold uppercase text-[var(--c-muted)]">
            Gửi Tasker phản hồi
          </p>
          <p className="text-[11px] leading-snug text-[var(--c-muted)]">
            Quyết định bắt Tasker chịu <b>{formatVnd(saved.taskerBorne)}</b>.
            Trước khi trừ tiền của họ, Tasker phải được đọc quyết định và có cơ
            hội nêu ý kiến. Chốt được khi Tasker trả lời hoặc hết hạn.
          </p>
          <AdminButton
            size="sm"
            variant="primary"
            className="w-full rounded-lg gap-1.5"
            disabled={busy || dirty}
            onClick={() => sendToTasker.mutate({ expectedDecisionVersion })}
          >
            <Send className="size-3.5" /> Gửi cho Tasker
          </AdminButton>
        </div>
      )}

      {/*
        Chốt quyết định là bước sinh NGHĨA VỤ TIỀN và là điểm không quay lại rẻ: sau đó
        `saveDecision` bị khoá, muốn sửa phải thu hồi quyết định (hoặc tệ hơn, đảo bồi
        thường nếu đã chi). Một cú bấm nhầm ở đây tốn nhiều thao tác hơn hẳn một hộp thoại.
        Nội dung hộp thoại đọc từ bản ĐÃ LƯU (`saved`, `savedOutcome`), không phải state
        form — vì chính bản đã lưu mới là thứ backend đem đi chốt.
      */}
      <AlertDialog open={confirmFinalize} onOpenChange={setConfirmFinalize}>
        <AlertDialogTrigger asChild>
          <AdminButton
            size="sm"
            variant="primary"
            className="w-full rounded-lg gap-1.5"
            disabled={busy || dirty || !can("FINALIZE", incident)}
          >
            <ShieldCheck className="size-3.5" /> Chốt quyết định
          </AdminButton>
        </AlertDialogTrigger>
        <AlertDialogContent className="cz-admin rounded-2xl bg-[var(--c-card)] text-[var(--c-ink)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[var(--c-ink)]">
              Chốt quyết định v{expectedDecisionVersion}?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-[var(--c-muted)]">
                <p>
                  Kết luận:{" "}
                  <b className="text-[var(--c-ink)]">
                    {savedOutcome ? OUTCOME_LABEL[savedOutcome] : "—"}
                  </b>
                </p>
                {savedOutcome === "COMPENSATE" ? (
                  <ul className="list-disc space-y-0.5 pl-4 text-xs">
                    <li>
                      Duyệt chi{" "}
                      <b>
                        {formatVnd(saved.taskerBorne + saved.platformBorne)}
                      </b>{" "}
                      cho khách — Tasker chịu{" "}
                      <b>{formatVnd(saved.taskerBorne)}</b>, quỹ nền tảng chịu{" "}
                      <b>{formatVnd(saved.platformBorne)}</b>.
                    </li>
                    <li>
                      Hồ sơ chuyển sang <b>chờ chi trả</b>. Tiền chỉ thật sự
                      chuyển ở bước chi trả sau đó.
                    </li>
                  </ul>
                ) : savedOutcome === "REJECT" ? (
                  <ul className="list-disc space-y-0.5 pl-4 text-xs">
                    <li>Hồ sơ bị bác bỏ, khách không được bồi thường.</li>
                    {rejectAsFraud && (
                      <li className="text-[#DC2626]">
                        Khách bị cộng <b>một cảnh cáo gian lận</b> — đủ số lần
                        sẽ bị khoá quyền báo cáo sự cố.
                      </li>
                    )}
                  </ul>
                ) : (
                  <ul className="list-disc space-y-0.5 pl-4 text-xs">
                    <li>
                      Công nhận có sự cố nhưng không phát sinh bồi thường.
                    </li>
                    <li>
                      Hồ sơ được đóng, khách KHÔNG bị tính là báo cáo sai.
                    </li>
                  </ul>
                )}
                <p className="text-[11px]">
                  Sau khi chốt, quyết định <b>không sửa trực tiếp được nữa</b> —
                  muốn đổi phải thu hồi quyết định trước khi chi trả.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                finalize.mutate(
                  {
                    expectedDecisionVersion,
                    ...(savedOutcome === "REJECT" ? { rejectAsFraud } : {}),
                  },
                  { onSettled: () => setConfirmFinalize(false) },
                )
              }
            >
              Chốt quyết định
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="rounded-lg border border-[var(--c-line)] p-3 text-xs text-[var(--c-muted)]">
        <p className="mb-2 flex items-center gap-1 font-bold uppercase text-[var(--c-ink)]">
          <History className="size-3.5" /> Thông tin lưu vết
        </p>
        <div className="grid grid-cols-2 gap-2">
          <span>Chính sách: {incident.decision.policyVersion ?? "-"}</span>
          <span>
            Mức tối đa: {formatVnd(incident.decision.policyCapSnapshot)}
          </span>
          <span>
            Hạn Tasker phản hồi:{" "}
            {incident.decision.responseWindowHoursSnapshot ?? "-"} giờ
          </span>
          <span>Đã chốt: {fmt(incident.decision.finalizedAt)}</span>
        </div>
      </div>
    </section>
  );
}
