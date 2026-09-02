import { PaginatedResponseDto } from 'src/common/dto/paginated-response.dto';
import { IncidentEntity } from '../entity/incident.entity';
import { IncidentDecisionResponseEntity } from '../entity/incident-decision-response.entity';
import { IncidentDamageItemEntity } from '../entity/incident-damage-item.entity';
import { IncidentEvidenceEntity } from '../entity/incident-evidence.entity';
import { IncidentStatementEntity } from '../entity/incident-statement.entity';
import { IncidentStatusLogEntity } from '../entity/incident-status-log.entity';
import { toNumber } from 'src/common/helpers/number.helper';
import { IncidentStatus } from 'src/common/enums/incident-status.enum';

import { getIncidentDecisionActionView } from '../domain/incident-decision.helpers';
import {
  IncidentDecisionAction,
  IncidentDecisionActionView,
} from '../domain/incident-decision-domain.types';
import { vietnamNow } from 'src/common/helpers/vietnam-time.helper';

export interface EvidenceView {
  id: string;
  url: string;
  fileType?: string | null;
  purpose?: string | null;
  decisionVersion?: number | null;
}

export interface IncidentDecisionResponseView {
  id: string;
  incidentId: string | null;
  decisionVersion: number;
  responseType: string;
  content: string | null;
  responseRevision: number;
  submittedAt: Date;
  updatedAt: Date;
  reviewResult: string | null;
  reviewedAt: Date | null;
  evidences: EvidenceView[];
  canEdit: boolean;
}

export interface DamageItemView {
  id: string;
  description: string;
  claimedAmount: number;
  verifiedAmount: number | null;
  approvedAmount: number | null;
  verificationStatus: string;
  evidences: EvidenceView[];
}

export interface IncidentSummary {
  id: string;
  incidentCode: string | null;
  title: string;
  type: string;
  source: string;
  severity: string;
  status: string;
  decisionVersion: number;
  closureReason: string | null;
  claimedAmount: number | null;
  approvedAmount: number | null;
  reportedAt: Date;
  updatedAt: Date;
}

export interface IncidentCustomerView extends IncidentSummary {
  description: string;
  damageItems: DamageItemView[];
  resolvedAt: Date | null;
  /**
   * Tiền bồi thường đã đi đường nào — khách phải biết để không tưởng là chưa nhận được.
   * `WALLET` = đã hoàn vào ví CleanZ; `BANK_TRANSFER` = đã chuyển khoản ngân hàng;
   * `null` = chưa chi trả.
   */
  payoutChannel: 'WALLET' | 'BANK_TRANSFER' | null;
  /** Nội dung quyết định CleanZ gửi khách (lý do duyệt/từ chối). */
  decisionSummary: string | null;
}

export interface StatementView {
  id: string;
  submittedByUserId: string | null;
  submittedByName: string | null;
  submittedByRole: string | null;
  body: string;
  createdAt: Date;
}

/**
 * Một dòng nhật ký vòng đời sự cố (`incident_status_logs`).
 *
 * Bảng này được ghi ở MỌI bước — tiếp nhận, lưu/gửi/chốt/thu hồi quyết định, chi trả, đảo
 * bồi thường, xoá nợ, đóng nguội — nhưng trước đây không API nào đọc, nên nó tồn tại mà
 * không ai đọc được. Với mô hình một Admin và không còn duyệt cấp hai, nhật ký hiển thị
 * ngay trên hồ sơ chính là kiểm soát thay thế: "ai làm gì lúc nào" phải trả lời được mà
 * không cần mở module kiểm toán.
 */
export interface IncidentHistoryEntryView {
  id: string;
  dimension: string;
  oldValue: string | null;
  newValue: string;
  reason: string | null;
  /** Người thao tác; null khi hệ thống tự chạy (housekeeping) hoặc tài khoản đã xoá. */
  changedByName: string | null;
  changedByRole: string | null;
  /**
   * ADMIN / USER / SYSTEM. Tách "hệ thống tự làm" khỏi "không rõ ai" — cả hai đều có
   * `changedByName = null` nhưng là hai kết luận khác hẳn khi điều tra.
   */
  actorType: string | null;
  createdAt: Date;
}

export function toIncidentHistoryEntryView(
  log: IncidentStatusLogEntity,
): IncidentHistoryEntryView {
  return {
    id: log.id,
    dimension: log.dimension,
    oldValue: log.oldValue ?? null,
    newValue: log.newValue,
    reason: log.reason ?? null,
    changedByName: log.changedBy?.fullName ?? null,
    changedByRole: log.changedBy?.role ?? null,
    actorType: log.actorType ?? null,
    createdAt: log.createdAt,
  };
}

/** Phản hồi quyết định của Tasker theo góc nhìn Admin — kèm ghi chú review nội bộ. */
export interface AdminDecisionResponseView {
  id: string;
  decisionVersion: number;
  responseType: string;
  content: string | null;
  responseRevision: number;
  submittedByName: string | null;
  submittedAt: Date;
  reviewResult: string | null;
  reviewedAt: Date | null;
  adminReviewNote: string | null;
  evidences: EvidenceView[];
}

export interface IncidentAdminView extends IncidentSummary {
  description: string;
  customer: {
    id: string;
    fullName?: string | null;
    /**
     * Mốc khoá quyền báo cáo (null = không bị khoá). Admin cần biết trước khi
     * bấm gỡ khoá, nếu không nút đó là thao tác mù — không rõ có tác dụng gì.
     */
    reportingLockedUntil: string | null;
  };
  tasker: {
    id: string;
    fullName?: string | null;
    /** Ký quỹ đã bỏ — nguồn thu hồi duy nhất từ Tasker là số dư ví. */
    walletBalance: number;
  };
  damageItems: DamageItemView[];
  statements: StatementView[];
  /** Ảnh Tasker đính kèm khi giải trình (purpose=TASKER_STATEMENT, incident-level). */
  statementEvidences: EvidenceView[];
  /** P0.4 — ảnh minh chứng chuyển khoản thủ công (ADMIN_ONLY). */
  transferProofEvidences: EvidenceView[];
  decisionResponses: AdminDecisionResponseView[];
  /** P0.2 — số tiền ví Tasker đang tạm giữ cho sự cố này. */
  taskerWalletHoldAmount: number | null;
  /** Số liệu nợ lấy từ SỔ NỢ của ví (`tasker_debts`), không còn nằm trên bản ghi sự cố. */
  uncoveredRecoveredAmount: number;
  uncoveredWrittenOffAmount: number;
  outstandingDebtAmount: number;
  debtWriteOff: {
    at: Date;
    reason: string | null;
    byAdminName: string | null;
  } | null;
  canWriteOffDebt: boolean;
  /** Sổ chi ngoài: khoản đã chuyển khoản ngân hàng cho khách (không qua ví). */
  externalPayout: {
    /** Số khách THỰC NHẬN (đã trừ phần chuyển nhầm, nếu có điều chỉnh). */
    amount: number;
    at: Date;
    note: string | null;
    /** Tiền đã rời ngân hàng nhưng không đến khách — nền tảng chịu mất. */
    lossAmount: number;
    /** Còn thiếu so với số đã duyệt → phải chuyển bù cho khách. */
    shortfallAmount: number;
    correctedAt: Date | null;
  } | null;
  taskerBorneAmount: number | null;
  platformBorneAmount: number | null;
  allocationReason: string | null;
  compensationSource: string | null;
  decision: {
    outcome: string | null;
    version: number;
    taskerResponseDeadline: Date | null;
    /** Mốc `taskerBorne` của bản đã gửi Tasker — bản hiện tại lớn hơn ⟹ phải gửi lại. */
    sentTaskerBorneAmount: number | null;
    responsibilityParty: string | null;
    responsibilityReason: string | null;
    internalDecisionNote: string | null;
    taskerDecisionReason: string | null;
    customerDecisionSummary: string | null;
    depositBalanceSnapshot: number | null;
    recoverableFromDepositAmount: number | null;
    uncoveredLiabilityAmount: number | null;
    finalizedAt: Date | null;
    policyVersion: string | null;
    policyCapSnapshot: number | null;
    responseWindowHoursSnapshot: number | null;
    severityRuleSnapshot: Record<string, unknown> | null;
    /** Quyết định bắt Tasker chịu tiền ⟹ bắt buộc cho phản biện trước khi chốt. */
    requiresTaskerResponse: boolean;
    allowedActions: IncidentDecisionAction[];
    blockedReasons: string[];
  };
  /**
   * Xem trước dòng tiền TRƯỚC khi bấm chi trả — admin phải thấy đúng số sẽ trừ được từ
   * Tasker và số quỹ thực sự phải gánh, thay vì đoán từ `taskerBorne`/`platformBorne`.
   */
  payoutPreview: {
    /** Sẽ hoàn cho khách (luôn = tổng duyệt). */
    customerRefund: number;
    /** Trừ được ngay từ ví Tasker = min(taskerBorne, số dư ví). */
    recoverableFromTasker: number;
    /** Phần Tasker chịu mà ví không đủ → ghi nợ, quỹ ứng trước. */
    uncoveredFromTasker: number;
    /** Quỹ nền tảng thực chi = platformBorne + phần ứng nợ. */
    platformPayout: number;
    /** Số dư ví Tasker tại thời điểm xem. */
    taskerWalletBalance: number;
  } | null;
  receivedDueAt: Date | null;
  statementDueAt: Date | null;
  decisionDueAt: Date | null;
  reportWindowUntil: Date | null;
  resolvedAt: Date | null;
}

/** Ảnh chụp khoản nợ của một sự cố, do service nạp từ `tasker_debts`. */
export interface IncidentDebtView {
  recovered: number;
  writtenOff: number;
  outstanding: number;
  canWriteOff: boolean;
  writeOff: {
    at: Date;
    reason: string | null;
    byAdminName: string | null;
  } | null;
}

export type PaginatedIncidents = PaginatedResponseDto<IncidentSummary>;

export function toIncidentSummary(incident: IncidentEntity): IncidentSummary {
  return {
    id: incident.id,
    incidentCode: incident.incidentCode ?? null,
    title: incident.title,
    type: incident.type,
    source: incident.source,
    severity: incident.severity,
    status: incident.status,
    decisionVersion: incident.decisionVersion,
    closureReason: incident.closureReason ?? null,
    claimedAmount:
      incident.claimedAmount != null ? toNumber(incident.claimedAmount) : null,
    approvedAmount:
      incident.approvedCompensationAmount != null
        ? toNumber(incident.approvedCompensationAmount)
        : null,
    reportedAt: incident.reportedAt,
    updatedAt: incident.updatedAt,
  };
}

function toEvidenceView(e: IncidentEvidenceEntity): EvidenceView {
  return {
    id: e.id,
    url: e.fileUrl,
    fileType: e.fileType ?? null,
    purpose: e.purpose ?? null,
    decisionVersion: e.decisionVersion ?? null,
  };
}

export function toDecisionResponseView(
  response: IncidentDecisionResponseEntity,
  evidences: IncidentEvidenceEntity[],
  canEdit: boolean,
): IncidentDecisionResponseView {
  return {
    id: response.id,
    incidentId: response.incident?.id ?? null,
    decisionVersion: response.decisionVersion,
    responseType: response.responseType,
    content: response.content ?? null,
    responseRevision: response.responseRevision,
    submittedAt: response.submittedAt,
    updatedAt: response.updatedAt,
    reviewResult: response.reviewResult ?? null,
    reviewedAt: response.reviewedAt ?? null,
    evidences: evidences.map(toEvidenceView),
    canEdit,
  };
}

export function toAdminDecisionResponseView(
  response: IncidentDecisionResponseEntity,
): AdminDecisionResponseView {
  return {
    id: response.id,
    decisionVersion: response.decisionVersion,
    responseType: response.responseType,
    content: response.content ?? null,
    responseRevision: response.responseRevision,
    submittedByName: response.tasker?.fullName ?? null,
    submittedAt: response.submittedAt,
    reviewResult: response.reviewResult ?? null,
    reviewedAt: response.reviewedAt ?? null,
    adminReviewNote: response.adminReviewNote ?? null,
    evidences: (response.evidences ?? [])
      .filter((e) => !e.isSoftDeleted && e.isActiveForResponse)
      .map(toEvidenceView),
  };
}

function toDamageItemViews(
  items: IncidentDamageItemEntity[],
  evidencesByItem: Map<string, IncidentEvidenceEntity[]>,
): DamageItemView[] {
  return items.map((item) => ({
    id: item.id,
    description: item.description,
    claimedAmount: toNumber(item.claimedAmount),
    verifiedAmount:
      item.verifiedAmount != null ? toNumber(item.verifiedAmount) : null,
    approvedAmount:
      item.approvedAmount != null ? toNumber(item.approvedAmount) : null,
    verificationStatus: item.verificationStatus,
    evidences: (evidencesByItem.get(item.id) ?? []).map(toEvidenceView),
  }));
}

export function toCustomerView(
  incident: IncidentEntity,
  items: IncidentDamageItemEntity[],
  evidencesByItem: Map<string, IncidentEvidenceEntity[]>,
): IncidentCustomerView {
  const paid =
    incident.status === IncidentStatus.COMPENSATED &&
    incident.resolvedAt != null;
  return {
    ...toIncidentSummary(incident),
    description: incident.description,
    resolvedAt: incident.resolvedAt ?? null,
    damageItems: toDamageItemViews(items, evidencesByItem),
    // Sổ chi ngoài có số > 0 nghĩa là khoản này được chuyển khoản, không vào ví.
    payoutChannel: !paid
      ? null
      : toNumber(incident.externalPayoutAmount) > 0
        ? 'BANK_TRANSFER'
        : 'WALLET',
    decisionSummary: incident.customerDecisionSummary ?? null,
  };
}

/**
 * Xem trước dòng tiền của lần chi trả sắp tới. Dùng CÙNG công thức với
 * `CompensationExecutorService.applyDepositRecoverySnapshot` (floor về VND nguyên) để con
 * số trên nút xác nhận đúng bằng con số sẽ ghi sổ — admin không phải đoán phần quỹ ứng.
 */
function buildPayoutPreview(
  incident: IncidentEntity,
  taskerWalletBalance: number,
): IncidentAdminView['payoutPreview'] {
  const approved = toNumber(incident.approvedCompensationAmount);
  if (approved <= 0) return null;

  const taskerBorne = toNumber(incident.taskerBorneAmount);
  const platformBorne = toNumber(incident.platformBorneAmount);
  const available = Math.max(0, Math.floor(taskerWalletBalance));
  const recoverable = Math.max(0, Math.min(taskerBorne, available));
  const uncovered = taskerBorne - recoverable;

  return {
    customerRefund: approved,
    recoverableFromTasker: recoverable,
    uncoveredFromTasker: uncovered,
    platformPayout: platformBorne + uncovered,
    taskerWalletBalance: available,
  };
}

export function toAdminView(
  incident: IncidentEntity,
  items: IncidentDamageItemEntity[],
  evidencesByItem: Map<string, IncidentEvidenceEntity[]>,
  statements: IncidentStatementEntity[],
  decisionResponses: IncidentDecisionResponseEntity[] = [],
  statementEvidences: IncidentEvidenceEntity[] = [],
  taskerWalletBalance = 0,
  transferProofEvidences: IncidentEvidenceEntity[] = [],
  /** Số liệu nợ đọc từ sổ nợ của ví; null khi sự cố không phát sinh nợ. */
  debt: IncidentDebtView | null = null,
): IncidentAdminView {
  // Quỹ Tasker khả dụng THẬT = số dư ví (ký quỹ đã gộp vào ví).
  const walletBalance = toNumber(taskerWalletBalance);
  const taskerBorne = toNumber(incident.taskerBorneAmount);
  const hasTaskerResponse = decisionResponses.some(
    (r) => r.decisionVersion === incident.decisionVersion,
  );
  const actionView: IncidentDecisionActionView = getIncidentDecisionActionView(
    {
      status: incident.status,
      decisionVersion: incident.decisionVersion,
      hasDecision: incident.decisionOutcome != null,
      taskerBorneAmount: taskerBorne,
      sentTaskerBorneAmount:
        incident.sentTaskerBorneAmount != null
          ? toNumber(incident.sentTaskerBorneAmount)
          : null,
      taskerResponseDeadline: incident.taskerResponseDeadline ?? null,
      hasTaskerResponse,
      resolvedAt: incident.resolvedAt ?? null,
      // Chi trả thủ công ghi sổ chi ngoài; không có bút toán ví nào để đảo. Bám vào
      // MỐC THỜI GIAN chứ không phải số tiền: sau một lần điều chỉnh, số có thể về 0
      // (chuyển nhầm người hoàn toàn) mà khoản chi vẫn là chi ngoài — vẫn không đảo được.
      paidExternally: incident.externalPayoutAt != null,
      debtRecoveryStarted: (debt?.recovered ?? 0) > 0,
    },
    vietnamNow(),
  );

  return {
    ...toIncidentSummary(incident),
    description: incident.description,
    customer: {
      id: incident.customer?.id,
      fullName: incident.customer?.user?.fullName ?? null,
      reportingLockedUntil:
        incident.customer?.reportingLockedUntil?.toISOString() ?? null,
    },
    tasker: {
      id: incident.tasker?.id,
      fullName: incident.tasker?.user?.fullName ?? null,
      walletBalance,
    },
    damageItems: toDamageItemViews(items, evidencesByItem),
    statements: statements.map((s) => ({
      id: s.id,
      submittedByUserId: s.submittedBy?.id ?? null,
      submittedByName: s.submittedBy?.fullName ?? null,
      submittedByRole: s.submittedBy?.role ?? null,
      body: s.body,
      createdAt: s.createdAt,
    })),
    statementEvidences: statementEvidences.map(toEvidenceView),
    transferProofEvidences: transferProofEvidences.map(toEvidenceView),
    decisionResponses: decisionResponses.map(toAdminDecisionResponseView),
    taskerWalletHoldAmount:
      incident.taskerWalletHoldAmount != null
        ? toNumber(incident.taskerWalletHoldAmount)
        : null,
    uncoveredRecoveredAmount: debt?.recovered ?? 0,
    uncoveredWrittenOffAmount: debt?.writtenOff ?? 0,
    outstandingDebtAmount: debt?.outstanding ?? 0,
    debtWriteOff: debt?.writeOff ?? null,
    externalPayout: incident.externalPayoutAt
      ? {
          amount: toNumber(incident.externalPayoutAmount),
          at: incident.externalPayoutAt,
          note: incident.externalPayoutNote ?? null,
          lossAmount: toNumber(incident.externalPayoutLossAmount),
          shortfallAmount: Math.max(
            0,
            toNumber(incident.approvedCompensationAmount) -
              toNumber(incident.externalPayoutAmount),
          ),
          correctedAt: incident.externalPayoutCorrectedAt ?? null,
        }
      : null,
    canWriteOffDebt: debt?.canWriteOff ?? false,
    taskerBorneAmount:
      incident.taskerBorneAmount != null
        ? toNumber(incident.taskerBorneAmount)
        : null,
    platformBorneAmount:
      incident.platformBorneAmount != null
        ? toNumber(incident.platformBorneAmount)
        : null,
    allocationReason: incident.allocationReason ?? null,
    compensationSource: incident.compensationSource ?? null,
    decision: {
      outcome: incident.decisionOutcome ?? null,
      version: incident.decisionVersion,
      taskerResponseDeadline: incident.taskerResponseDeadline ?? null,
      sentTaskerBorneAmount:
        incident.sentTaskerBorneAmount != null
          ? toNumber(incident.sentTaskerBorneAmount)
          : null,
      responsibilityParty: incident.responsibilityParty ?? null,
      responsibilityReason: incident.responsibilityReason ?? null,
      internalDecisionNote: incident.internalDecisionNote ?? null,
      taskerDecisionReason: incident.taskerDecisionReason ?? null,
      customerDecisionSummary: incident.customerDecisionSummary ?? null,
      depositBalanceSnapshot:
        incident.depositBalanceSnapshot != null
          ? toNumber(incident.depositBalanceSnapshot)
          : null,
      recoverableFromDepositAmount:
        incident.recoverableFromDepositAmount != null
          ? toNumber(incident.recoverableFromDepositAmount)
          : null,
      uncoveredLiabilityAmount:
        incident.uncoveredLiabilityAmount != null
          ? toNumber(incident.uncoveredLiabilityAmount)
          : null,
      finalizedAt: incident.finalizedAt ?? null,
      policyVersion: incident.policyVersion ?? null,
      policyCapSnapshot:
        incident.policyCapSnapshot != null
          ? toNumber(incident.policyCapSnapshot)
          : null,
      responseWindowHoursSnapshot: incident.responseWindowHoursSnapshot ?? null,
      severityRuleSnapshot: incident.severityRuleSnapshot ?? null,
      requiresTaskerResponse: taskerBorne > 0,
      allowedActions: actionView.allowedActions,
      blockedReasons: actionView.blockedReasons,
    },
    payoutPreview: buildPayoutPreview(incident, walletBalance),
    receivedDueAt: incident.receivedDueAt ?? null,
    statementDueAt: incident.statementDueAt ?? null,
    decisionDueAt: incident.decisionDueAt ?? null,
    reportWindowUntil: incident.reportWindowUntil ?? null,
    resolvedAt: incident.resolvedAt ?? null,
  };
}

export type PaginatedAdminIncidents = PaginatedResponseDto<IncidentSummary>;

export interface IncidentTaskerView extends IncidentSummary {
  description: string;
  damageItems: DamageItemView[];
  statements: StatementView[];
  statementDueAt: Date | null;
  taskerResponseDeadline: Date | null;
  canSubmitStatement: boolean;
  canRespondToDecision: boolean;
  /**
   * Phần Tasker chịu — chỉ lộ khi quyết định đã externalize cho Tasker (từ lúc gửi phản
   * biện trở đi). Ẩn khi còn đang soạn để giữ cô lập bản nháp của Admin.
   */
  myBorneAmount: number | null;
  /** Số tiền ví đang bị tạm giữ cho sự cố này. */
  myWalletHold: number | null;
  /** Đã trừ thật từ ví khi chi trả. */
  myWalletDeducted: number | null;
  /** Còn NỢ nền tảng (quỹ đã ứng thay) = uncovered − đã thu hồi. */
  myOutstandingDebt: number | null;
  /**
   * NỘI DUNG quyết định mà Tasker được đọc TRƯỚC khi phản biện.
   *
   * `saveDecision` đã bắt buộc Admin nhập `taskerDecisionReason` khi `taskerBorne > 0`, và
   * form Admin ghi rõ "Tasker sẽ đọc nội dung này khi phản hồi" — nhưng view này trước đây
   * không trả nó ra, nên Tasker bị hỏi Đồng ý/Không đồng ý với một con số không kèm căn cứ.
   * Quyền phản biện mà không được biết mình phản biện điều gì thì chỉ còn là hình thức.
   *
   * Cùng cổng `externalized` với `myBorneAmount`: chưa gửi thì bản nháp của Admin vẫn kín.
   * `internalDecisionNote` CỐ Ý không có ở đây — đó là ghi chú nội bộ.
   */
  decision: {
    version: number;
    outcome: string | null;
    /** Lý do Admin soạn riêng cho Tasker (bắt buộc khi Tasker phải chịu tiền). */
    reasonForTasker: string | null;
    responsibilityParty: string | null;
    responsibilityReason: string | null;
    /** Vì sao chia tiền theo tỷ lệ này — căn cứ để Tasker phản biện phần mình gánh. */
    allocationReason: string | null;
    /** Tổng CleanZ duyệt chi cho khách; phần Tasker gánh là `myBorneAmount`. */
    approvedAmount: number | null;
    finalizedAt: Date | null;
  } | null;
  /**
   * Các bản phản hồi CHÍNH Tasker này đã gửi (mọi version, mọi revision).
   *
   * Thiếu nó thì gửi xong form trắng lại và Tasker không còn cách nào biết mình đã nói gì,
   * trong khi backend vốn lưu đủ theo revision. Dùng `toDecisionResponseView` chứ không
   * phải bản Admin: ghi chú review nội bộ không được lộ.
   */
  myDecisionResponses: IncidentDecisionResponseView[];
}

export function toTaskerView(
  incident: IncidentEntity,
  items: IncidentDamageItemEntity[],
  evidencesByItem: Map<string, IncidentEvidenceEntity[]>,
  statements: IncidentStatementEntity[],
  canSubmitStatement: boolean,
  /** Nợ còn lại của chính Tasker trên sự cố này, đọc từ sổ nợ của ví. */
  outstandingDebt = 0,
  /** Phản hồi của chính Tasker này, kèm ảnh còn active của từng bản. */
  myDecisionResponses: {
    response: IncidentDecisionResponseEntity;
    evidences: IncidentEvidenceEntity[];
  }[] = [],
): IncidentTaskerView {
  // Quyết định đã được gửi cho Tasker thì mới lộ số tiền.
  const externalized = [
    IncidentStatus.AWAITING_RESPONSE,
    IncidentStatus.AWAITING_PAYOUT,
    IncidentStatus.COMPENSATED,
    IncidentStatus.REJECTED,
    IncidentStatus.CLOSED,
  ].includes(incident.status);
  const settled = incident.status === IncidentStatus.COMPENSATED;
  // Tính MỘT lần: cùng vị từ vừa quyết định có mở form phản hồi, vừa quyết định bản phản
  // hồi cũ còn sửa được hay không. Tách đôi thì form mở mà bản cũ khoá (hoặc ngược lại).
  const canRespond = getIncidentDecisionActionView(
    {
      status: incident.status,
      decisionVersion: incident.decisionVersion,
      taskerBorneAmount: toNumber(incident.taskerBorneAmount),
      sentTaskerBorneAmount:
        incident.sentTaskerBorneAmount != null
          ? toNumber(incident.sentTaskerBorneAmount)
          : null,
      taskerResponseDeadline: incident.taskerResponseDeadline ?? null,
    },
    vietnamNow(),
  ).allowedActions.includes('RESPOND');

  return {
    ...toIncidentSummary(incident),
    description: incident.description,
    damageItems: toDamageItemViews(items, evidencesByItem),
    statements: statements.map((s) => ({
      id: s.id,
      submittedByUserId: s.submittedBy?.id ?? null,
      submittedByName: s.submittedBy?.fullName ?? null,
      submittedByRole: s.submittedBy?.role ?? null,
      body: s.body,
      createdAt: s.createdAt,
    })),
    statementDueAt: incident.statementDueAt ?? null,
    taskerResponseDeadline: incident.taskerResponseDeadline ?? null,
    canSubmitStatement,
    canRespondToDecision: canRespond,
    myBorneAmount: externalized ? toNumber(incident.taskerBorneAmount) : null,
    myWalletHold:
      incident.taskerWalletHoldAmount != null
        ? toNumber(incident.taskerWalletHoldAmount)
        : null,
    myWalletDeducted: settled
      ? toNumber(incident.recoverableFromDepositAmount)
      : null,
    // Nợ vẫn còn sau khi hồ sơ đóng nguội (auto-close chỉ bỏ qua khi HẾT nợ, nhưng Admin
    // đóng tay hoặc xoá nợ thì vẫn tới CLOSED). Khoá theo `settled` như cũ khiến màn hình
    // hiện "—" trong khi ví Tasker vẫn đang bị chặn rút vì đúng khoản nợ đó.
    myOutstandingDebt: outstandingDebt > 0 ? outstandingDebt : null,
    // `externalized` KHÔNG đủ: `CLOSED` nằm trong danh sách đó, mà một hồ sơ khách tự rút
    // cũng là CLOSED — chưa từng có quyết định nào. Thiếu vế `decisionOutcome` thì màn hình
    // Tasker dựng một thẻ "CleanZ kết luận" rỗng với 0đ/0đ và không một dòng căn cứ, tức là
    // khẳng định có kết luận trong khi không có.
    decision:
      externalized && incident.decisionOutcome != null
        ? {
            version: incident.decisionVersion,
            outcome: incident.decisionOutcome ?? null,
            reasonForTasker: incident.taskerDecisionReason ?? null,
            responsibilityParty: incident.responsibilityParty ?? null,
            responsibilityReason: incident.responsibilityReason ?? null,
            allocationReason: incident.allocationReason ?? null,
            approvedAmount:
              incident.approvedCompensationAmount != null
                ? toNumber(incident.approvedCompensationAmount)
                : null,
            finalizedAt: incident.finalizedAt ?? null,
          }
        : null,
    myDecisionResponses: myDecisionResponses.map((r) =>
      toDecisionResponseView(
        r.response,
        r.evidences,
        // Sửa lại được chừng nào Admin chưa review VÀ cửa sổ của version đó còn mở.
        !r.response.reviewedAt &&
          r.response.decisionVersion === incident.decisionVersion &&
          canRespond,
      ),
    ),
  };
}
