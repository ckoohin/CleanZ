import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { toNumber } from 'src/common/helpers/number.helper';
import { IncidentStatus } from 'src/common/enums/incident-status.enum';
import { IncidentClosureReason } from 'src/common/enums/incident-closure-reason.enum';
import { IncidentLogDimension } from 'src/common/enums/incident-log-dimension.enum';
import { IncidentResponsibilityParty } from 'src/common/enums/incident-responsibility-party.enum';
import { IncidentDamageItemVerificationStatus } from 'src/common/enums/incident-damage-item-verification-status.enum';
import { NotificationOutboxStatus } from 'src/common/enums/notification-outbox-status.enum';
import {
  IncidentCompensationSource,
  IncidentEntity,
} from '../entity/incident.entity';
import { IncidentDamageItemEntity } from '../entity/incident-damage-item.entity';
import {
  IncidentDecisionOutcome,
  SaveIncidentDecisionDto,
  SendDecisionToTaskerDto,
} from '../dto/save-incident-decision.dto';
import { FinalizeIncidentDecisionDto } from '../dto/finalize-incident-decision.dto';
import { WithdrawDecisionDto } from '../dto/withdraw-decision.dto';
import { IncidentAdminView } from '../dto/incident-response.dto';
import { isExpectedDecisionVersion } from '../domain/incident-decision.helpers';
import { NotificationOutboxEntity } from '../entity/notification-outbox.entity';
import { IncidentDecisionResponseEntity } from '../entity/incident-decision-response.entity';
import {
  EDITABLE_STATUSES,
  IncidentStateService,
} from './incident-state.service';
import { IncidentConfigService } from './incident-config.service';
import { IncidentAdminService } from './incident-admin.service';
import { IncidentDepositHoldService } from './incident-deposit-hold.service';
import { FraudStrikeService } from './fraud-strike.service';

interface DecisionPolicy {
  policyVersion: string;
  policyCap: number;
  responseWindowHours: number;
  severityRuleSnapshot: Record<string, unknown>;
}

interface NormalizedDecision {
  outcome: IncidentDecisionOutcome;
  itemApprovals: Map<string, number>;
  itemStatuses: Map<string, IncidentDamageItemVerificationStatus>;
  totalApprovedAmount: number;
  taskerBorneAmount: number;
  platformBorneAmount: number;
  responsibilityParty: IncidentResponsibilityParty | null;
  responsibilityReason: string | null;
  allocationReason: string | null;
  internalDecisionNote: string | null;
  taskerDecisionReason: string | null;
  customerDecisionSummary: string;
  compensationSource: IncidentCompensationSource | null;
  /** Quy tắc due process duy nhất: Tasker phải chịu tiền ⟹ bắt buộc cho phản biện. */
  requiresTaskerResponse: boolean;
}

/**
 * Quyết định sự cố — luồng tinh gọn, MỘT admin, MỘT trục trạng thái.
 *
 *   REVIEWING ──save──▶ REVIEWING
 *       │ send (chỉ khi taskerBorne > 0)
 *       ▼
 *   AWAITING_RESPONSE ──(Tasker phản hồi | hết 48h)──┐
 *       │                                            │
 *       └──────────────── finalize ──────────────────┴─▶ AWAITING_PAYOUT | REJECTED | CLOSED
 *
 * Không còn duyệt cấp 2, không còn bước "review phản hồi" và "gia hạn" riêng: cửa sổ phản
 * biện là một khoảng thời gian duy nhất, hết hạn là chốt được.
 */
@Injectable()
export class IncidentDecisionService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly state: IncidentStateService,
    private readonly config: IncidentConfigService,
    private readonly adminService: IncidentAdminService,
    private readonly fraudStrike: FraudStrikeService,
    private readonly depositHold: IncidentDepositHoldService,
  ) {}

  /**
   * Soạn / sửa quyết định (upsert). Thay cho `saveDraft` + `reviseDecision` + `verifyItems`:
   * admin nhập MỘT số tiền cho mỗi hạng mục, kèm phân bổ Tasker/Nền tảng.
   * Bump `decisionVersion` mỗi lần nội dung thay đổi vật chất → chống lost update.
   */
  async saveDecision(
    adminUserId: string,
    incidentId: string,
    dto: SaveIncidentDecisionDto,
  ): Promise<IncidentAdminView> {
    return asyncHandleOperation(async () => {
      let needEvidence:
        | {
            incidentCode: string | null;
            customerUserId: string | null;
            items: { id: string; description: string }[];
          }
        | undefined;

      await this.dataSource.transaction(async (manager) => {
        const incident = await this.lockIncident(manager, incidentId);
        this.assertVersion(incident, dto.expectedDecisionVersion);
        this.assertEditable(incident);

        const items = await this.lockDamageItems(manager, incident.id);
        const policy = await this.loadPolicy();
        const decision = this.normalize(dto, items);
        this.validate(items, decision, policy);

        // Không có thay đổi vật chất → no-op (idempotent, không bump version).
        //
        // Guard này PHẢI phủ cả AWAITING_RESPONSE, không riêng REVIEWING: bump version sẽ
        // xoá `taskerResponseDeadline` và kéo hồ sơ về REVIEWING, tức là một cú bấm "Lưu"
        // không sửa gì cũng đủ huỷ cửa sổ phản biện đang mở và vô hiệu hoá phản hồi Tasker
        // đã gửi (phản hồi gắn theo version cũ) — bắt cả hai bên làm lại từ đầu vô cớ.
        if (!this.hasMaterialChange(incident, items, decision)) {
          return;
        }

        const from = incident.status;
        // Hạng mục vừa được chuyển sang "cần bổ sung bằng chứng" → nhắc khách sau tx.
        const newlyNeedEvidence = items.filter(
          (item) =>
            item.verificationStatus !==
              IncidentDamageItemVerificationStatus.NEED_MORE_EVIDENCE &&
            decision.itemStatuses.get(item.id) ===
              IncidentDamageItemVerificationStatus.NEED_MORE_EVIDENCE,
        );
        if (newlyNeedEvidence.length > 0) {
          needEvidence = {
            incidentCode: incident.incidentCode ?? null,
            customerUserId: incident.customer?.user?.id ?? null,
            items: newlyNeedEvidence.map((i) => ({
              id: i.id,
              description: i.description,
            })),
          };
        }

        this.apply(incident, items, decision, adminUserId);

        // Đã biết Tasker phải chịu bao nhiêu → trả lại phần ví giữ thừa so với số khách khai.
        // Chỉ co khi `taskerBorne > 0`: quyết định không bắt Tasker chịu tiền vẫn có thể được
        // sửa lại trước khi chốt, nhả sạch từ lúc còn là bản nháp thì tiền có thể đã bị rút
        // đi trước khi Admin đổi ý. Nhánh không bồi thường vẫn nhả đủ ở `finalizeDecision`.
        if (decision.taskerBorneAmount > 0) {
          await this.depositHold.shrinkTo(
            manager,
            incident,
            decision.taskerBorneAmount,
          );
        }

        this.state.assertStatusTransition(from, IncidentStatus.REVIEWING);
        incident.status = IncidentStatus.REVIEWING;

        await manager.getRepository(IncidentDamageItemEntity).save(items);
        await manager.getRepository(IncidentEntity).save(incident);
        await this.state.log(
          manager,
          incident.id,
          IncidentLogDimension.STATUS,
          from,
          IncidentStatus.REVIEWING,
          adminUserId,
          `Lưu quyết định v${incident.decisionVersion} (${decision.outcome}, duyệt ${decision.totalApprovedAmount} VND)`,
        );
      });

      if (needEvidence) {
        this.adminService.notifyNeedMoreEvidence(
          incidentId,
          needEvidence.incidentCode,
          needEvidence.customerUserId,
          needEvidence.items,
        );
      }
      return this.adminService.findOne(incidentId);
    }, 'Lỗi khi lưu quyết định sự cố');
  }

  /**
   * Gửi quyết định dự kiến cho Tasker phản biện. Mở cửa sổ DUY NHẤT
   * `RESPONSE_WINDOW_HOURS` giờ — hết hạn là admin chốt được, không có gia hạn.
   */
  async sendToTasker(
    adminUserId: string,
    incidentId: string,
    dto: SendDecisionToTaskerDto,
  ): Promise<IncidentAdminView> {
    return asyncHandleOperation(async () => {
      await this.dataSource.transaction(async (manager) => {
        const incident = await this.lockIncident(manager, incidentId);
        this.assertVersion(incident, dto.expectedDecisionVersion);

        // Idempotent: đã gửi ở version này rồi thì chỉ đảm bảo notification tồn tại.
        if (incident.status === IncidentStatus.AWAITING_RESPONSE) {
          await this.ensureSentToTaskerOutbox(manager, incident);
          return;
        }
        this.assertEditable(incident);

        if (toNumber(incident.taskerBorneAmount) <= 0) {
          throw new ConflictException({
            code: 'TASKER_RESPONSE_NOT_REQUIRED',
            message:
              'Quyết định không bắt Tasker chịu tiền — chốt thẳng, không cần gửi phản biện',
          });
        }

        const policy = await this.ensurePolicySnapshot(incident);
        const dbNow = await this.getDatabaseNow(manager);

        this.state.assertStatusTransition(
          incident.status,
          IncidentStatus.AWAITING_RESPONSE,
        );
        const from = incident.status;
        incident.status = IncidentStatus.AWAITING_RESPONSE;
        incident.taskerResponseDeadline = new Date(
          dbNow.getTime() + policy.responseWindowHours * 3_600_000,
        );
        // Mốc so sánh: nếu sau phản hồi admin TĂNG phần Tasker chịu thì phải gửi lại.
        incident.sentTaskerBorneAmount = toNumber(incident.taskerBorneAmount);

        await manager.getRepository(IncidentEntity).save(incident);
        await this.ensureSentToTaskerOutbox(manager, incident);
        await this.state.log(
          manager,
          incident.id,
          IncidentLogDimension.STATUS,
          from,
          IncidentStatus.AWAITING_RESPONSE,
          adminUserId,
          `Gửi quyết định v${incident.decisionVersion} cho Tasker phản biện (hạn ${incident.taskerResponseDeadline.toISOString()})`,
        );
      });

      return this.adminService.findOne(incidentId);
    }, 'Lỗi khi gửi quyết định cho Tasker');
  }

  /**
   * Chốt quyết định. Không còn duyệt cấp 2 — một admin chốt là xong. Bù lại bằng
   * `policyCap` cứng, log bất biến, và `reverse()` (hoàn tác trong cửa sổ cho phép).
   */
  async finalizeDecision(
    adminUserId: string,
    incidentId: string,
    dto: FinalizeIncidentDecisionDto,
  ): Promise<IncidentAdminView> {
    return asyncHandleOperation(async () => {
      await this.dataSource.transaction(async (manager) => {
        const incident = await this.lockIncident(manager, incidentId);
        this.assertVersion(incident, dto.expectedDecisionVersion);

        // Idempotent: đã chốt rồi thì thôi.
        if (!EDITABLE_STATUSES.includes(incident.status)) {
          return;
        }
        if (!incident.decisionOutcome) {
          throw new ConflictException({
            code: 'DECISION_REQUIRED',
            message: 'Chưa có quyết định nào để chốt',
          });
        }

        const dbNow = await this.getDatabaseNow(manager);
        await this.assertDueProcessSatisfied(manager, incident, dbNow);

        const items = await this.lockDamageItems(manager, incident.id);
        const policy = await this.ensurePolicySnapshot(incident);
        this.validateFinal(incident, items, policy);

        const from = incident.status;
        const approved = toNumber(incident.approvedCompensationAmount);
        let rejectedAsFraud = false;

        if (approved > 0) {
          incident.status = IncidentStatus.AWAITING_PAYOUT;
        } else if (
          incident.decisionOutcome === IncidentDecisionOutcome.NO_COMPENSATION
        ) {
          // Công nhận sự cố nhưng không bồi thường: đóng, không tiền, không phạt khách.
          incident.status = IncidentStatus.CLOSED;
          incident.closureReason = IncidentClosureReason.NO_COMPENSATION;
          await this.depositHold.release(manager, incident, incident.tasker);
        } else {
          incident.status = IncidentStatus.REJECTED;
          incident.closureReason = IncidentClosureReason.REJECTED;
          rejectedAsFraud =
            dto.rejectAsFraud === true && !!incident.customer?.id;
          await this.depositHold.release(manager, incident, incident.tasker);
        }

        this.state.assertStatusTransition(from, incident.status);
        incident.finalizedByAdmin = { id: adminUserId } as never;
        incident.finalizedAt = dbNow;
        await manager.getRepository(IncidentEntity).save(incident);

        if (rejectedAsFraud) {
          await this.fraudStrike.addStrike(
            manager,
            incident.customer.id,
            incident.id,
            `Từ chối sự cố v${incident.decisionVersion} — báo cáo sai sự thật`,
          );
        }
        await this.ensureFinalDecisionOutbox(manager, incident);
        await this.state.log(
          manager,
          incident.id,
          IncidentLogDimension.STATUS,
          from,
          incident.status,
          adminUserId,
          `Chốt quyết định v${incident.decisionVersion} (${incident.decisionOutcome}, duyệt ${approved} VND)`,
        );
      });

      return this.adminService.findOne(incidentId);
    }, 'Lỗi khi chốt quyết định sự cố');
  }

  /**
   * THU HỒI quyết định đã chốt nhưng CHƯA chi trả, để soạn lại.
   *
   * Bảng trạng thái vẫn khai báo `AWAITING_PAYOUT → REVIEWING` từ đầu, nhưng không lệnh nào
   * thực hiện được: `saveDecision` bị `assertEditable` chặn, còn `reverse()` chỉ nhận hồ sơ
   * đã COMPENSATED. Nghĩa là Admin chốt nhầm số tiền và phát hiện TRƯỚC khi chi thì lối duy
   * nhất là bấm chi trả cho tiền chạy sai đi rồi mới đảo lại — mà đảo còn có thể thất bại
   * (quá 72h, khách đã tiêu, hoặc đã chi thủ công). Sửa sai trước khi mất tiền phải rẻ hơn
   * sửa sai sau khi mất tiền.
   *
   * Trả hồ sơ về ĐÚNG trạng thái trước lúc chốt chứ không phải luôn về REVIEWING: nếu quyết
   * định đã từng gửi Tasker thì phản hồi (hoặc việc hết hạn) của họ ở version này vẫn còn
   * hiệu lực, ép gửi lại và chờ thêm một cửa sổ nữa cho một quyết định KHÔNG đổi là phạt oan
   * cả hai bên. Ngược lại, nếu sau đó Admin sửa nội dung thì `saveDecision` bump version và
   * due process tự bắt gửi lại như thường.
   */
  async withdrawDecision(
    adminUserId: string,
    incidentId: string,
    dto: WithdrawDecisionDto,
  ): Promise<IncidentAdminView> {
    return asyncHandleOperation(async () => {
      await this.dataSource.transaction(async (manager) => {
        const incident = await this.lockIncident(manager, incidentId);
        this.assertVersion(incident, dto.expectedDecisionVersion);

        if (incident.status === IncidentStatus.COMPENSATED) {
          throw new ConflictException({
            code: 'COMPENSATION_ALREADY_PAID',
            message:
              'Bồi thường đã được chi — dùng chức năng thu hồi bồi thường thay vì thu hồi quyết định',
          });
        }
        if (incident.status !== IncidentStatus.AWAITING_PAYOUT) {
          throw new ConflictException({
            code: 'DECISION_NOT_FINALIZED',
            message: 'Chỉ thu hồi được quyết định đã chốt và đang chờ chi trả',
          });
        }

        const reason = this.trimRequired(dto.reason);
        if (reason.length < 10) {
          throw new UnprocessableEntityException({
            code: 'WITHDRAW_REASON_REQUIRED',
            message: 'Lý do thu hồi quyết định phải có ít nhất 10 ký tự',
          });
        }

        const from = incident.status;
        const target =
          incident.sentTaskerBorneAmount != null
            ? IncidentStatus.AWAITING_RESPONSE
            : IncidentStatus.REVIEWING;
        this.state.assertStatusTransition(from, target);

        incident.status = target;
        // Giữ nguyên `decisionVersion`, hạn phản biện và mốc đã gửi — nội dung quyết định
        // không đổi, chỉ gỡ dấu "đã chốt".
        incident.finalizedAt = null;
        incident.finalizedByAdmin = null;
        await manager.getRepository(IncidentEntity).save(incident);

        await this.ensureDecisionWithdrawnOutbox(manager, incident, reason);
        await this.state.log(
          manager,
          incident.id,
          IncidentLogDimension.STATUS,
          from,
          target,
          adminUserId,
          `Thu hồi quyết định v${incident.decisionVersion} khi chưa chi trả — lý do: ${reason}`,
        );
      });

      return this.adminService.findOne(incidentId);
    }, 'Lỗi khi thu hồi quyết định sự cố');
  }

  // ── Due process ────────────────────────────────────────────────────────────

  /**
   * Quy tắc DUY NHẤT thay cho `isAdverseDraft` + `shouldReopenTaskerResponse` + bước
   * review + bước gia hạn cũ:
   *
   *  1. `taskerBorne = 0` → chốt thẳng.
   *  2. `taskerBorne > 0` → phải đã gửi Tasker, VÀ (Tasker đã phản hồi HOẶC đã hết hạn).
   *  3. Nếu admin sửa làm TĂNG phần Tasker chịu so với bản đã gửi → phải gửi lại.
   */
  private async assertDueProcessSatisfied(
    manager: EntityManager,
    incident: IncidentEntity,
    dbNow: Date,
  ): Promise<void> {
    const taskerBorne = toNumber(incident.taskerBorneAmount);
    if (taskerBorne <= 0) return;

    if (incident.status !== IncidentStatus.AWAITING_RESPONSE) {
      throw new ConflictException({
        code: 'TASKER_RESPONSE_REQUIRED',
        message:
          'Quyết định bắt Tasker chịu tiền — phải gửi Tasker phản biện trước khi chốt',
      });
    }

    const sent = toNumber(incident.sentTaskerBorneAmount);
    if (taskerBorne > sent) {
      throw new ConflictException({
        code: 'TASKER_RESPONSE_REQUIRED',
        message:
          'Phần Tasker chịu đã tăng so với bản đã gửi — phải gửi lại cho Tasker phản biện',
      });
    }

    const hasResponse = await manager
      .getRepository(IncidentDecisionResponseEntity)
      .createQueryBuilder('response')
      .leftJoin('response.incident', 'incident')
      .where('incident.id = :incidentId', { incidentId: incident.id })
      .andWhere('response.decisionVersion = :version', {
        version: incident.decisionVersion,
      })
      .getExists();
    if (hasResponse) return;

    const deadline = incident.taskerResponseDeadline;
    if (deadline && dbNow.getTime() < deadline.getTime()) {
      throw new ConflictException({
        code: 'TASKER_RESPONSE_WAITING',
        message: 'Đang trong thời hạn Tasker phản biện — chưa được chốt',
      });
    }
  }

  // ── Chuẩn hoá & kiểm tra ───────────────────────────────────────────────────

  private normalize(
    dto: SaveIncidentDecisionDto,
    items: IncidentDamageItemEntity[],
  ): NormalizedDecision {
    const customerDecisionSummary = this.trimRequired(
      dto.customerDecisionSummary,
    );
    const internalDecisionNote = this.trimOptional(dto.internalDecisionNote);
    const taskerDecisionReason = this.trimOptional(dto.taskerDecisionReason);

    const itemApprovals = new Map(items.map((i) => [i.id, 0]));
    const itemStatuses = new Map(
      items.map((i) => [i.id, i.verificationStatus]),
    );

    // REJECT và NO_COMPENSATION đều là quyết định KHÔNG chuyển tiền.
    if (dto.outcome !== IncidentDecisionOutcome.COMPENSATE) {
      const hasAmount =
        (dto.taskerBorneAmount ?? 0) > 0 ||
        (dto.platformBorneAmount ?? 0) > 0 ||
        (dto.items ?? []).some((i) => i.approvedAmount > 0);
      if (hasAmount) {
        throw new UnprocessableEntityException({
          code: 'INVALID_DECISION',
          message:
            'Quyết định không bồi thường không được có số tiền duyệt hoặc phân bổ',
        });
      }
      for (const item of items) {
        itemStatuses.set(
          item.id,
          IncidentDamageItemVerificationStatus.REJECTED,
        );
      }
      return {
        outcome: dto.outcome,
        itemApprovals,
        itemStatuses,
        totalApprovedAmount: 0,
        taskerBorneAmount: 0,
        platformBorneAmount: 0,
        responsibilityParty: null,
        responsibilityReason: null,
        allocationReason: null,
        internalDecisionNote,
        taskerDecisionReason,
        customerDecisionSummary,
        compensationSource: null,
        requiresTaskerResponse: false,
      };
    }

    const seen = new Set<string>();
    let totalApprovedAmount = 0;
    for (const input of dto.items ?? []) {
      if (seen.has(input.damageItemId)) {
        throw new UnprocessableEntityException({
          code: 'INVALID_DECISION',
          message: 'Hạng mục thiệt hại bị trùng trong request',
        });
      }
      seen.add(input.damageItemId);
      if (!itemApprovals.has(input.damageItemId)) {
        throw new UnprocessableEntityException({
          code: 'INVALID_DECISION',
          message: 'Hạng mục thiệt hại không thuộc sự cố',
        });
      }
      itemApprovals.set(input.damageItemId, input.approvedAmount);
      itemStatuses.set(
        input.damageItemId,
        input.status ??
          (input.approvedAmount > 0
            ? IncidentDamageItemVerificationStatus.VERIFIED
            : IncidentDamageItemVerificationStatus.REJECTED),
      );
      totalApprovedAmount += input.approvedAmount;
    }

    const taskerBorneAmount = dto.taskerBorneAmount ?? 0;
    const platformBorneAmount = dto.platformBorneAmount ?? 0;

    return {
      outcome: dto.outcome,
      itemApprovals,
      itemStatuses,
      totalApprovedAmount,
      taskerBorneAmount,
      platformBorneAmount,
      responsibilityParty: dto.responsibilityParty ?? null,
      responsibilityReason: this.trimOptional(dto.responsibilityReason),
      allocationReason: this.trimOptional(dto.allocationReason),
      internalDecisionNote,
      taskerDecisionReason,
      customerDecisionSummary,
      compensationSource: this.deriveCompensationSource(
        taskerBorneAmount,
        platformBorneAmount,
      ),
      requiresTaskerResponse: taskerBorneAmount > 0,
    };
  }

  private validate(
    items: IncidentDamageItemEntity[],
    decision: NormalizedDecision,
    policy: DecisionPolicy,
  ): void {
    if (decision.customerDecisionSummary.length < 10) {
      throw new UnprocessableEntityException({
        code: 'INVALID_DECISION',
        message: 'Tóm tắt gửi khách phải có ít nhất 10 ký tự',
      });
    }

    // Số duyệt từng hạng mục không được vượt số khách yêu cầu cho hạng mục đó.
    for (const item of items) {
      const approved = decision.itemApprovals.get(item.id) ?? 0;
      if (approved > toNumber(item.claimedAmount)) {
        throw new UnprocessableEntityException({
          code: 'INVALID_APPROVED_AMOUNT',
          message: `Số tiền duyệt vượt số khách yêu cầu ở hạng mục "${item.description}"`,
        });
      }
      if (
        approved > 0 &&
        decision.itemStatuses.get(item.id) ===
          IncidentDamageItemVerificationStatus.REJECTED
      ) {
        throw new UnprocessableEntityException({
          code: 'INVALID_APPROVED_AMOUNT',
          message: 'Hạng mục bị từ chối không được duyệt tiền',
        });
      }
    }

    if (decision.outcome !== IncidentDecisionOutcome.COMPENSATE) return;

    if (decision.totalApprovedAmount <= 0) {
      throw new UnprocessableEntityException({
        code: 'INVALID_DECISION',
        message: 'Tổng tiền duyệt phải lớn hơn 0',
      });
    }
    if (decision.totalApprovedAmount > policy.policyCap) {
      throw new UnprocessableEntityException({
        code: 'POLICY_CAP_EXCEEDED',
        message: `Tổng bồi thường vượt trần chính sách (${policy.policyCap} VND)`,
      });
    }
    if (!decision.responsibilityParty) {
      throw new UnprocessableEntityException({
        code: 'INVALID_DECISION',
        message: 'Quyết định bồi thường phải có bên chịu trách nhiệm',
      });
    }
    if (
      !decision.responsibilityReason ||
      decision.responsibilityReason.length < 10
    ) {
      throw new UnprocessableEntityException({
        code: 'INVALID_DECISION',
        message: 'Lý do quy trách nhiệm phải có ít nhất 10 ký tự',
      });
    }
    // So sánh trực tiếp chỉ đúng khi cả ba là SỐ NGUYÊN — điều này do `@IsInt()`
    // trên DTO bảo đảm, không phải do đoạn code này. Chốt lại tường minh: nếu
    // ai đó nới DTO sang số thực, bất biến phân bổ sẽ hỏng âm thầm vì sai số
    // dấu phẩy động, không phải vì logic sai.
    if (
      !Number.isInteger(decision.taskerBorneAmount) ||
      !Number.isInteger(decision.platformBorneAmount) ||
      !Number.isInteger(decision.totalApprovedAmount)
    ) {
      throw new UnprocessableEntityException({
        code: 'INVALID_ALLOCATION_TOTAL',
        message: 'Số tiền phân bổ phải là số nguyên VND',
      });
    }
    if (
      decision.taskerBorneAmount + decision.platformBorneAmount !==
      decision.totalApprovedAmount
    ) {
      throw new UnprocessableEntityException({
        code: 'INVALID_ALLOCATION_TOTAL',
        message: 'Phần Tasker chịu + phần Nền tảng chịu phải bằng tổng duyệt',
      });
    }

    this.assertAllocationMatchesResponsibility(decision);
  }

  /** Phân bổ tiền phải nhất quán với bên bị quy trách nhiệm. */
  private assertAllocationMatchesResponsibility(
    decision: NormalizedDecision,
  ): void {
    const { responsibilityParty: party, taskerBorneAmount: tasker } = decision;
    const platform = decision.platformBorneAmount;
    const reason = decision.allocationReason;

    if (party === IncidentResponsibilityParty.PLATFORM && tasker > 0) {
      throw new UnprocessableEntityException({
        code: 'INVALID_ALLOCATION_FOR_RESPONSIBILITY',
        message: 'Nền tảng chịu trách nhiệm thì Tasker không chịu tiền',
      });
    }
    if (
      party === IncidentResponsibilityParty.UNDETERMINED &&
      (tasker > 0 || platform !== decision.totalApprovedAmount || !reason)
    ) {
      throw new UnprocessableEntityException({
        code: 'INVALID_ALLOCATION_FOR_RESPONSIBILITY',
        message:
          'Chưa xác định trách nhiệm: CleanZ chịu toàn bộ và phải có lý do phân bổ',
      });
    }
    if (
      party === IncidentResponsibilityParty.SHARED &&
      (tasker === 0 || platform === 0) &&
      !reason
    ) {
      throw new UnprocessableEntityException({
        code: 'INVALID_ALLOCATION_FOR_RESPONSIBILITY',
        message: 'Trách nhiệm chung nhưng một bên chịu 0 — cần lý do phân bổ',
      });
    }
    if (
      party === IncidentResponsibilityParty.TASKER &&
      tasker === 0 &&
      !reason
    ) {
      throw new UnprocessableEntityException({
        code: 'INVALID_ALLOCATION_FOR_RESPONSIBILITY',
        message:
          'Tasker chịu trách nhiệm nhưng chịu 0 đồng — cần lý do phân bổ',
      });
    }
  }

  /** Chốt chặn cuối trước khi chuyển tiền — tự kiểm, không tin bước trước. */
  private validateFinal(
    incident: IncidentEntity,
    items: IncidentDamageItemEntity[],
    policy: DecisionPolicy,
  ): void {
    const approved = toNumber(incident.approvedCompensationAmount);
    const tasker = toNumber(incident.taskerBorneAmount);
    const platform = toNumber(incident.platformBorneAmount);

    if (approved > policy.policyCap) {
      throw new UnprocessableEntityException({
        code: 'POLICY_CAP_EXCEEDED',
        message: `Tổng bồi thường vượt trần chính sách (${policy.policyCap} VND)`,
      });
    }

    const itemsTotal = items.reduce(
      (sum, item) => sum + toNumber(item.approvedAmount),
      0,
    );
    if (itemsTotal !== approved) {
      throw new UnprocessableEntityException({
        code: 'INVALID_ALLOCATION_TOTAL',
        message: 'Tổng duyệt không khớp tổng các hạng mục',
      });
    }

    if (approved > 0) {
      if (!incident.responsibilityParty) {
        throw new UnprocessableEntityException({
          code: 'INVALID_DECISION',
          message: 'Quyết định bồi thường phải có bên chịu trách nhiệm',
        });
      }
      if (tasker + platform !== approved) {
        throw new UnprocessableEntityException({
          code: 'INVALID_ALLOCATION_TOTAL',
          message: 'Phần Tasker chịu + phần Nền tảng chịu phải bằng tổng duyệt',
        });
      }
      const blocking = items.find(
        (item) =>
          item.verificationStatus ===
          IncidentDamageItemVerificationStatus.NEED_MORE_EVIDENCE,
      );
      if (blocking) {
        throw new UnprocessableEntityException({
          code: 'DAMAGE_ITEMS_NOT_FINALIZABLE',
          message: `Còn hạng mục chờ bổ sung bằng chứng: "${blocking.description}"`,
        });
      }
    } else if (tasker > 0 || platform > 0) {
      throw new UnprocessableEntityException({
        code: 'INVALID_DECISION',
        message: 'Quyết định không bồi thường không được có phân bổ tiền',
      });
    }
  }

  // ── Ghi quyết định lên entity ──────────────────────────────────────────────

  private hasMaterialChange(
    incident: IncidentEntity,
    items: IncidentDamageItemEntity[],
    decision: NormalizedDecision,
  ): boolean {
    if ((incident.decisionOutcome ?? null) !== decision.outcome) return true;
    if (
      toNumber(incident.approvedCompensationAmount) !==
      decision.totalApprovedAmount
    ) {
      return true;
    }
    if (toNumber(incident.taskerBorneAmount) !== decision.taskerBorneAmount) {
      return true;
    }
    if (
      toNumber(incident.platformBorneAmount) !== decision.platformBorneAmount
    ) {
      return true;
    }
    if ((incident.compensationSource ?? null) !== decision.compensationSource) {
      return true;
    }
    if (
      (incident.responsibilityParty ?? null) !== decision.responsibilityParty
    ) {
      return true;
    }
    if (
      this.trimOptional(incident.responsibilityReason) !==
      decision.responsibilityReason
    ) {
      return true;
    }
    if (
      this.trimOptional(incident.allocationReason) !== decision.allocationReason
    ) {
      return true;
    }
    if (
      this.trimOptional(incident.internalDecisionNote) !==
      decision.internalDecisionNote
    ) {
      return true;
    }
    if (
      this.trimOptional(incident.taskerDecisionReason) !==
      decision.taskerDecisionReason
    ) {
      return true;
    }
    if (
      this.trimRequired(incident.customerDecisionSummary) !==
      decision.customerDecisionSummary
    ) {
      return true;
    }
    return items.some(
      (item) =>
        toNumber(item.approvedAmount) !==
          (decision.itemApprovals.get(item.id) ?? 0) ||
        item.verificationStatus !== decision.itemStatuses.get(item.id),
    );
  }

  private apply(
    incident: IncidentEntity,
    items: IncidentDamageItemEntity[],
    decision: NormalizedDecision,
    adminUserId: string,
  ): void {
    for (const item of items) {
      const approved = decision.itemApprovals.get(item.id) ?? 0;
      item.approvedAmount = approved;
      // Gộp thẩm định + duyệt: giữ cột `verified_amount` khớp để đối soát vẫn đọc được.
      item.verifiedAmount = approved;
      item.verificationStatus =
        decision.itemStatuses.get(item.id) ??
        IncidentDamageItemVerificationStatus.PENDING;
    }

    incident.decisionVersion = incident.decisionVersion + 1;
    // Sang version mới → bản đã gửi Tasker (nếu có) không còn hiệu lực.
    incident.taskerResponseDeadline = null;
    incident.sentTaskerBorneAmount = null;

    incident.decisionOutcome = decision.outcome;
    incident.approvedCompensationAmount = decision.totalApprovedAmount;
    incident.taskerBorneAmount = decision.taskerBorneAmount;
    incident.platformBorneAmount = decision.platformBorneAmount;
    incident.allocationReason = decision.allocationReason;
    incident.compensationSource = decision.compensationSource;

    incident.responsibilityParty = decision.responsibilityParty;
    incident.responsibilityReason = decision.responsibilityReason;
    incident.responsibilityDecidedByAdmin = { id: adminUserId } as never;
    incident.responsibilityDecidedAt = new Date();

    incident.internalDecisionNote = decision.internalDecisionNote;
    incident.taskerDecisionReason = decision.taskerDecisionReason;
    incident.customerDecisionSummary = decision.customerDecisionSummary;

    incident.finalizedByAdmin = null;
    incident.finalizedAt = null;
  }

  // ── Hạ tầng ────────────────────────────────────────────────────────────────

  private async lockIncident(
    manager: EntityManager,
    incidentId: string,
  ): Promise<IncidentEntity> {
    const incident = await manager
      .getRepository(IncidentEntity)
      .createQueryBuilder('i')
      .leftJoinAndSelect('i.customer', 'customer')
      .leftJoinAndSelect('customer.user', 'customerUser')
      .leftJoinAndSelect('i.tasker', 'tasker')
      .leftJoinAndSelect('tasker.user', 'taskerUser')
      .setLock('pessimistic_write', undefined, ['i'])
      .where('i.id = :id', { id: incidentId })
      .getOne();

    if (!incident) {
      throw new NotFoundException({
        code: 'INCIDENT_NOT_FOUND',
        message: 'Không tìm thấy sự cố',
      });
    }
    return incident;
  }

  private lockDamageItems(
    manager: EntityManager,
    incidentId: string,
  ): Promise<IncidentDamageItemEntity[]> {
    return manager
      .getRepository(IncidentDamageItemEntity)
      .createQueryBuilder('item')
      .setLock('pessimistic_write', undefined, ['item'])
      .where('item.incident_id = :incidentId', { incidentId })
      .orderBy('item.created_at', 'ASC')
      .getMany();
  }

  private assertVersion(incident: IncidentEntity, expected: number): void {
    if (!isExpectedDecisionVersion(incident.decisionVersion, expected)) {
      throw new ConflictException({
        code: 'DECISION_VERSION_CONFLICT',
        message:
          'Quyết định đã được thay đổi ở nơi khác — tải lại trước khi tiếp tục',
        currentDecisionVersion: incident.decisionVersion,
      });
    }
  }

  private assertEditable(incident: IncidentEntity): void {
    if (!EDITABLE_STATUSES.includes(incident.status)) {
      throw new ConflictException({
        code: 'INCIDENT_NOT_EDITABLE',
        message: `Không sửa được quyết định khi sự cố đang ở trạng thái ${incident.status}`,
      });
    }
  }

  private async loadPolicy(): Promise<DecisionPolicy> {
    const [policyCap, responseWindowHours, severityRuleSnapshot] =
      await Promise.all([
        this.config.getCompensationPolicyCap(),
        this.config.getResponseWindowHours(),
        this.config.getSevereCriteria(),
      ]);
    return {
      policyVersion: `incident-policy-${new Date().toISOString().slice(0, 10)}`,
      policyCap,
      responseWindowHours,
      severityRuleSnapshot: severityRuleSnapshot as unknown as Record<
        string,
        unknown
      >,
    };
  }

  /** Chốt snapshot chính sách lần đầu cần dùng; các lần sau đọc lại snapshot đã lưu. */
  private async ensurePolicySnapshot(
    incident: IncidentEntity,
  ): Promise<DecisionPolicy> {
    if (
      incident.policyCapSnapshot != null &&
      incident.responseWindowHoursSnapshot != null
    ) {
      return {
        policyVersion: incident.policyVersion ?? 'incident-policy-existing',
        policyCap: toNumber(incident.policyCapSnapshot),
        responseWindowHours: incident.responseWindowHoursSnapshot,
        severityRuleSnapshot: incident.severityRuleSnapshot ?? {},
      };
    }
    const policy = await this.loadPolicy();
    incident.policyVersion = policy.policyVersion;
    incident.policyCapSnapshot = policy.policyCap;
    incident.responseWindowHoursSnapshot = policy.responseWindowHours;
    incident.severityRuleSnapshot = policy.severityRuleSnapshot;
    return policy;
  }

  private async getDatabaseNow(manager: EntityManager): Promise<Date> {
    const rows = await manager.query('SELECT now() AS now');
    return new Date(rows[0].now);
  }

  private deriveCompensationSource(
    taskerBorneAmount: number,
    platformBorneAmount: number,
  ): IncidentCompensationSource | null {
    if (taskerBorneAmount > 0 && platformBorneAmount > 0) return 'MIXED';
    if (taskerBorneAmount > 0) return 'TASKER_DEPOSIT';
    if (platformBorneAmount > 0) return 'PLATFORM_FUND';
    return null;
  }

  private trimOptional(value?: string | null): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private trimRequired(value?: string | null): string {
    return value?.trim() ?? '';
  }

  // ── Notification outbox ────────────────────────────────────────────────────

  private async ensureSentToTaskerOutbox(
    manager: EntityManager,
    incident: IncidentEntity,
  ): Promise<void> {
    const taskerUserId = incident.tasker?.user?.id;
    if (!taskerUserId) {
      throw new UnprocessableEntityException({
        code: 'INVALID_DECISION',
        message: 'Không tìm thấy tài khoản Tasker để gửi thông báo',
      });
    }

    await manager
      .getRepository(NotificationOutboxEntity)
      .createQueryBuilder()
      .insert()
      .values({
        eventType: 'INCIDENT_DECISION_SENT_TO_TASKER',
        refType: 'INCIDENT',
        refId: incident.id,
        recipient: { id: taskerUserId } as never,
        decisionVersion: incident.decisionVersion,
        payload: {
          incidentId: incident.id,
          incidentCode: incident.incidentCode ?? null,
          decisionVersion: incident.decisionVersion,
          responsibilityParty: incident.responsibilityParty ?? null,
          taskerDecisionReason: incident.taskerDecisionReason ?? null,
          approvedAmount: toNumber(incident.approvedCompensationAmount),
          taskerBorneAmount: toNumber(incident.taskerBorneAmount),
          taskerResponseDeadline: incident.taskerResponseDeadline ?? null,
        } as never,
        dedupeKey: `incident:${incident.id}:decision:${incident.decisionVersion}:sent-to-tasker:${taskerUserId}`,
        status: NotificationOutboxStatus.PENDING,
        retryCount: 0,
      })
      .orIgnore()
      .execute();
  }

  /**
   * Hai bên đã nhận thông báo "quyết định đã chốt" (kèm số tiền). Thu hồi mà im lặng thì
   * khách vẫn đang chờ một khoản tiền không còn được duyệt nữa.
   *
   * Dedupe theo version: thu hồi lần hai ở cùng một version sẽ không gửi lại — chấp nhận
   * được, vì nội dung thông báo y hệt.
   */
  private async ensureDecisionWithdrawnOutbox(
    manager: EntityManager,
    incident: IncidentEntity,
    reason: string,
  ): Promise<void> {
    const recipients = [
      incident.customer?.user?.id,
      incident.tasker?.user?.id,
    ].filter((id): id is string => !!id);
    if (!recipients.length) return;

    await manager
      .getRepository(NotificationOutboxEntity)
      .createQueryBuilder()
      .insert()
      .values(
        recipients.map((userId) => ({
          eventType: 'INCIDENT_DECISION_WITHDRAWN',
          refType: 'INCIDENT',
          refId: incident.id,
          recipient: { id: userId } as never,
          decisionVersion: incident.decisionVersion,
          payload: {
            incidentId: incident.id,
            incidentCode: incident.incidentCode ?? null,
            decisionVersion: incident.decisionVersion,
            status: incident.status,
            reason,
          } as never,
          dedupeKey: `incident:${incident.id}:decision:${incident.decisionVersion}:withdrawn:${userId}`,
          status: NotificationOutboxStatus.PENDING,
          retryCount: 0,
        })) as never,
      )
      .orIgnore()
      .execute();
  }

  private async ensureFinalDecisionOutbox(
    manager: EntityManager,
    incident: IncidentEntity,
  ): Promise<void> {
    const customerUserId = incident.customer?.user?.id;
    const taskerUserId = incident.tasker?.user?.id;
    const rows: Array<Partial<NotificationOutboxEntity>> = [];

    if (customerUserId) {
      rows.push({
        eventType: 'INCIDENT_DECISION_FINALIZED',
        refType: 'INCIDENT',
        refId: incident.id,
        recipient: { id: customerUserId } as never,
        decisionVersion: incident.decisionVersion,
        payload: {
          incidentId: incident.id,
          incidentCode: incident.incidentCode ?? null,
          decisionVersion: incident.decisionVersion,
          status: incident.status,
          approvedAmount: toNumber(incident.approvedCompensationAmount),
          customerDecisionSummary: incident.customerDecisionSummary ?? null,
        } as never,
        dedupeKey: `incident:${incident.id}:decision:${incident.decisionVersion}:final:customer:${customerUserId}`,
        status: NotificationOutboxStatus.PENDING,
        retryCount: 0,
      });
    }

    if (taskerUserId) {
      rows.push({
        eventType: 'INCIDENT_DECISION_FINALIZED',
        refType: 'INCIDENT',
        refId: incident.id,
        recipient: { id: taskerUserId } as never,
        decisionVersion: incident.decisionVersion,
        payload: {
          incidentId: incident.id,
          incidentCode: incident.incidentCode ?? null,
          decisionVersion: incident.decisionVersion,
          status: incident.status,
          responsibilityParty: incident.responsibilityParty ?? null,
          taskerDecisionReason: incident.taskerDecisionReason ?? null,
          approvedAmount: toNumber(incident.approvedCompensationAmount),
          taskerBorneAmount: toNumber(incident.taskerBorneAmount),
        } as never,
        dedupeKey: `incident:${incident.id}:decision:${incident.decisionVersion}:final:tasker:${taskerUserId}`,
        status: NotificationOutboxStatus.PENDING,
        retryCount: 0,
      });
    }

    if (!rows.length) return;

    await manager
      .getRepository(NotificationOutboxEntity)
      .createQueryBuilder()
      .insert()
      .values(rows as never)
      .orIgnore()
      .execute();
  }
}
