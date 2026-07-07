import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { IncidentStatus } from 'src/common/enums/incident-status.enum';
import { IncidentLogDimension } from 'src/common/enums/incident-log-dimension.enum';
import { IncidentEvidencePurpose } from 'src/common/enums/incident-evidence-purpose.enum';
import { IncidentDamageItemVerificationStatus } from 'src/common/enums/incident-damage-item-verification-status.enum';
import { IncidentEntity } from '../entity/incident.entity';
import { IncidentDamageItemEntity } from '../entity/incident-damage-item.entity';
import { IncidentEvidenceEntity } from '../entity/incident-evidence.entity';
import { IncidentStatementEntity } from '../entity/incident-statement.entity';
import { IncidentDecisionResponseEntity } from '../entity/incident-decision-response.entity';
import { WalletEntity } from 'src/modules/wallet/entity/wallet.entity';
import { WalletOwnerType } from 'src/common/enums/wallet-owner-type.enum';
import { toNumber } from 'src/common/helpers/number.helper';
import { BookingEntity } from 'src/modules/booking/entity/booking.entity';
import { BookingStatus } from 'src/common/enums/booking-status.enum';
import { SupportTicketEntity } from 'src/modules/support-ticket/entity/support-ticket.entity';
import { TicketCategory } from 'src/common/enums/ticket-category.enum';
import { QueryAdminIncidentDto } from '../dto/query-admin-incident.dto';
import { AcceptIncidentDto } from '../dto/accept-incident.dto';
import { VerifyItemsDto } from '../dto/verify-items.dto';
import { CreateFromTicketDto } from '../dto/create-from-ticket.dto';
import {
  IncidentAdminView,
  PaginatedAdminIncidents,
  toAdminView,
  toIncidentSummary,
} from '../dto/incident-response.dto';
import { IncidentStateService } from './incident-state.service';
import { IncidentConfigService } from './incident-config.service';
import { IncidentCodeService } from './incident-code.service';
import { FraudStrikeService } from './fraud-strike.service';
import { IncidentEvidenceLifecycleService } from './incident-evidence-lifecycle.service';
import { IncidentDepositHoldService } from './incident-deposit-hold.service';
import { IncidentNotifier } from './incident-notifier.service';

@Injectable()
export class IncidentAdminService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(IncidentEntity)
    private readonly incidentRepo: Repository<IncidentEntity>,
    @InjectRepository(IncidentDamageItemEntity)
    private readonly itemRepo: Repository<IncidentDamageItemEntity>,
    @InjectRepository(IncidentEvidenceEntity)
    private readonly evidenceRepo: Repository<IncidentEvidenceEntity>,
    @InjectRepository(IncidentStatementEntity)
    private readonly statementRepo: Repository<IncidentStatementEntity>,
    @InjectRepository(IncidentDecisionResponseEntity)
    private readonly decisionResponseRepo: Repository<IncidentDecisionResponseEntity>,
    @InjectRepository(WalletEntity)
    private readonly walletRepo: Repository<WalletEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookingRepo: Repository<BookingEntity>,
    @InjectRepository(SupportTicketEntity)
    private readonly ticketRepo: Repository<SupportTicketEntity>,
    private readonly state: IncidentStateService,
    private readonly config: IncidentConfigService,
    private readonly code: IncidentCodeService,
    private readonly fraudStrike: FraudStrikeService,
    private readonly evidenceLifecycle: IncidentEvidenceLifecycleService,
    private readonly depositHold: IncidentDepositHoldService,
    private readonly notifier: IncidentNotifier,
  ) {}

  async createFromTicket(
    incidentReporterAdminId: string,
    ticketId: string,
    dto: CreateFromTicketDto,
  ): Promise<IncidentAdminView> {
    return asyncHandleOperation(async () => {
      const ticket = await this.ticketRepo.findOne({
        where: { id: ticketId },
        relations: ['booking'],
      });
      if (!ticket) throw new NotFoundException('Không tìm thấy ticket');
      if (ticket.category !== TicketCategory.PROPERTY_DAMAGE) {
        throw new UnprocessableEntityException(
          'Chỉ nâng cấp ticket loại PROPERTY_DAMAGE',
        );
      }
      const bookingId = ticket.booking?.id;
      if (!bookingId) {
        throw new UnprocessableEntityException('Ticket không gắn đơn dịch vụ');
      }
      const booking = await this.bookingRepo.findOne({
        where: { id: bookingId },
        relations: ['customer', 'tasker'],
      });
      const bookingCustomer = booking?.customer;
      const bookingTasker = booking?.tasker;
      if (!bookingCustomer || !bookingTasker) {
        throw new UnprocessableEntityException('Đơn dịch vụ không hợp lệ');
      }
      if (booking.status !== BookingStatus.COMPLETED) {
        throw new UnprocessableEntityException('Đơn chưa hoàn thành');
      }

      const active = await this.incidentRepo
        .createQueryBuilder('i')
        .where('i.booking_id = :bid', { bid: bookingId })
        .andWhere('i.status != :closed', { closed: IncidentStatus.CLOSED })
        .getOne();
      if (active) {
        await this.ticketRepo.update(
          { id: ticketId },
          { incidentId: active.id },
        );
        throw new ConflictException({
          message: 'Đơn này đã có sự cố đang xử lý',
          incidentId: active.id,
        });
      }

      const totalClaimed = dto.damageItems.reduce(
        (sum, it) => sum + it.claimedAmount,
        0,
      );
      const severity = await this.config.computeSeverity(totalClaimed);
      const code = await this.code.next();

      const incidentId = await this.dataSource
        .transaction(async (manager) => {
          const incident = await manager.getRepository(IncidentEntity).save(
            manager.getRepository(IncidentEntity).create({
              incidentCode: code,
              booking: { id: bookingId } as BookingEntity,
              customer: { id: bookingCustomer.id },
              tasker: { id: bookingTasker.id },
              title: dto.title,
              description: dto.description,
              severity,
              status: IncidentStatus.REPORTED,
              claimedAmount: totalClaimed,
              reportedAt: new Date(),
            }),
          );
          for (const it of dto.damageItems) {
            await manager.getRepository(IncidentDamageItemEntity).save(
              manager.getRepository(IncidentDamageItemEntity).create({
                incident: { id: incident.id },
                description: it.description,
                claimedAmount: it.claimedAmount,
              }),
            );
          }
          await this.state.log(
            manager,
            incident.id,
            IncidentLogDimension.STATUS,
            null,
            IncidentStatus.REPORTED,
            incidentReporterAdminId,
            `Nâng cấp từ ticket ${ticket.ticketCode ?? ticketId}`,
          );
          await manager
            .getRepository(SupportTicketEntity)
            .update({ id: ticketId }, { incidentId: incident.id });
          return incident.id;
        })
        .catch((err: { code?: string; constraint?: string }) => {
          if (err?.code === '23505') {
            throw new ConflictException('Đơn này đã có sự cố đang xử lý');
          }
          throw err;
        });
      return this.findOne(incidentId);
    }, 'Lỗi khi nâng cấp ticket thành sự cố');
  }

  async unlockReporter(incidentId: string): Promise<{ unlocked: boolean }> {
    return asyncHandleOperation(async () => {
      const incident = await this.incidentRepo.findOne({
        where: { id: incidentId },
        relations: ['customer'],
      });
      if (!incident?.customer) {
        throw new NotFoundException('Không tìm thấy sự cố');
      }
      await this.fraudStrike.unlockReporter(
        this.dataSource.manager,
        incident.customer.id,
      );
      return { unlocked: true };
    }, 'Lỗi khi gỡ khóa quyền báo cáo');
  }

  async list(query: QueryAdminIncidentDto): Promise<PaginatedAdminIncidents> {
    return asyncHandleOperation(async () => {
      const page = query.page ?? 1;
      const limit = query.limit ?? 10;
      const qb = this.incidentRepo
        .createQueryBuilder('i')
        .skip((page - 1) * limit)
        .take(limit);

      if (query.status)
        qb.andWhere('i.status = :status', { status: query.status });
      if (query.compensationStatus)
        qb.andWhere('i.compensation_status = :cs', {
          cs: query.compensationStatus,
        });
      if (query.severity)
        qb.andWhere('i.severity = :sev', { sev: query.severity });
      if (query.taskerId)
        qb.andWhere('i.tasker_id = :tid', { tid: query.taskerId });
      if (query.customerId)
        qb.andWhere('i.customer_id = :cid', { cid: query.customerId });
      if (query.overdue === 'true')
        qb.andWhere('i.decision_due_at IS NOT NULL')
          .andWhere('i.decision_due_at < :now', { now: new Date() })
          .andWhere('i.status != :closed', { closed: IncidentStatus.CLOSED });

      if (query.sort === 'severity') qb.orderBy('i.severity', 'ASC');
      else if (query.sort === 'decisionDueAt')
        qb.orderBy('i.decisionDueAt', 'ASC');
      else qb.orderBy('i.reportedAt', 'DESC');

      const [rows, total] = await qb.getManyAndCount();
      return {
        data: rows.map(toIncidentSummary),
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      };
    }, 'Lỗi khi lấy hàng đợi sự cố');
  }

  async findOne(incidentId: string): Promise<IncidentAdminView> {
    return asyncHandleOperation(async () => {
      const incident = await this.loadFull(incidentId);
      return this.buildAdminView(incident);
    }, 'Lỗi khi lấy chi tiết sự cố');
  }

  async accept(
    adminUserId: string,
    incidentId: string,
    dto: AcceptIncidentDto,
  ): Promise<IncidentAdminView> {
    return asyncHandleOperation(async () => {
      await this.dataSource.transaction(async (manager) => {
        const incident = await manager
          .getRepository(IncidentEntity)
          .createQueryBuilder('i')
          .leftJoinAndSelect('i.tasker', 'tasker')
          .setLock('pessimistic_write', undefined, ['i'])
          .where('i.id = :id', { id: incidentId })
          .getOne();
        if (!incident) throw new NotFoundException('Không tìm thấy sự cố');

        this.state.assertStatusTransition(
          incident.status,
          IncidentStatus.INVESTIGATING,
        );

        const from = incident.status;
        const severity = dto.severity ?? incident.severity;
        const sla = await this.config.getSla(severity);
        const now = Date.now();

        incident.severity = severity;
        incident.status = IncidentStatus.INVESTIGATING;
        incident.statementDueAt = new Date(now + sla.statementMins * 60000);
        incident.decisionDueAt = new Date(now + sla.decisionMins * 60000);

        // P0.2 — HOLD ví Tasker để chống rút trốn nghĩa vụ trong lúc điều tra.
        let heldAmount = 0;
        if (incident.tasker) {
          heldAmount = await this.depositHold.holdForAccept(
            manager,
            incident,
            incident.tasker,
          );
        }
        await manager.getRepository(IncidentEntity).save(incident);

        await this.state.log(
          manager,
          incident.id,
          IncidentLogDimension.STATUS,
          from,
          IncidentStatus.INVESTIGATING,
          adminUserId,
          `Admin tiếp nhận thẩm định — tạm giữ ví Tasker ${heldAmount} VND`,
        );
      });
      return this.findOne(incidentId);
    }, 'Lỗi khi tiếp nhận sự cố');
  }

  async verifyItems(
    incidentId: string,
    dto: VerifyItemsDto,
  ): Promise<IncidentAdminView> {
    return asyncHandleOperation(async () => {
      // P1.4 — item bị đánh dấu NEED_MORE_EVIDENCE → notify khách bổ sung (sau commit).
      const needEvidenceItems: { id: string; description: string }[] = [];
      let customerUserId: string | null = null;
      let incidentCode: string | null = null;
      await this.dataSource.transaction(async (manager) => {
        const incident = await manager.getRepository(IncidentEntity).findOne({
          where: { id: incidentId },
          relations: ['customer', 'customer.user'],
        });
        if (!incident) throw new NotFoundException('Không tìm thấy sự cố');
        if (incident.status !== IncidentStatus.INVESTIGATING) {
          throw new ConflictException(
            'Chỉ xác minh khi sự cố đang được thẩm định',
          );
        }
        customerUserId = incident.customer?.user?.id ?? null;
        incidentCode = incident.incidentCode ?? null;
        const items = await manager
          .getRepository(IncidentDamageItemEntity)
          .find({
            where: { incident: { id: incidentId } },
          });
        const itemById = new Map(items.map((i) => [i.id, i]));
        for (const input of dto.items) {
          const item = itemById.get(input.itemId);
          if (!item) {
            throw new NotFoundException(
              `Không tìm thấy hạng mục thiệt hại ${input.itemId}`,
            );
          }
          if (input.verifiedAmount > Number(item.claimedAmount)) {
            throw new UnprocessableEntityException(
              'Giá trị xác minh không được vượt số tiền yêu cầu',
            );
          }
          // Suy trạng thái thẩm định nếu admin không truyền tường minh:
          // >0 ⇒ VERIFIED, =0 ⇒ REJECTED. NEED_MORE_EVIDENCE giữ item chưa quyết được.
          const status =
            input.status ??
            (input.verifiedAmount > 0
              ? IncidentDamageItemVerificationStatus.VERIFIED
              : IncidentDamageItemVerificationStatus.REJECTED);
          if (status === IncidentDamageItemVerificationStatus.REJECTED) {
            item.verifiedAmount = 0;
          } else if (
            status === IncidentDamageItemVerificationStatus.NEED_MORE_EVIDENCE
          ) {
            item.verifiedAmount = null;
            needEvidenceItems.push({
              id: item.id,
              description: item.description,
            });
          } else {
            item.verifiedAmount = input.verifiedAmount;
          }
          item.verificationStatus = status;
          await manager.getRepository(IncidentDamageItemEntity).save(item);
        }
      });

      // Sau commit: nhắc khách bổ sung bằng chứng (dedupe theo item + ngày, tránh spam khi retry).
      if (customerUserId && needEvidenceItems.length > 0) {
        const day = new Date().toISOString().slice(0, 10);
        for (const it of needEvidenceItems) {
          this.notifier.notify(
            customerUserId,
            incidentId,
            'Cần bổ sung bằng chứng',
            `CleanZ cần thêm bằng chứng cho hạng mục "${it.description}" của sự cố ${incidentCode ?? ''}. Vui lòng mở sự cố và tải lên ảnh bổ sung để tiếp tục thẩm định.`,
            `need-evidence-${it.id}-${day}`,
          );
        }
      }
      return this.findOne(incidentId);
    }, 'Lỗi khi xác minh thiệt hại');
  }

  private async loadFull(incidentId: string): Promise<IncidentEntity> {
    const incident = await this.incidentRepo.findOne({
      where: { id: incidentId },
      relations: ['customer', 'customer.user', 'tasker', 'tasker.user'],
    });
    if (!incident) throw new NotFoundException('Không tìm thấy sự cố');
    return incident;
  }

  private async buildAdminView(
    incident: IncidentEntity,
  ): Promise<IncidentAdminView> {
    const items = await this.itemRepo.find({
      where: { incident: { id: incident.id } },
      order: { createdAt: 'ASC' },
    });
    const evidences = await this.evidenceRepo.find({
      where: { incident: { id: incident.id }, isSoftDeleted: false },
      relations: ['damageItem'],
    });
    const visibleEvidences = this.evidenceLifecycle.filterForAudience(
      evidences,
      'ADMIN',
    );
    const statements = await this.statementRepo.find({
      where: { incident: { id: incident.id } },
      relations: ['submittedBy'],
      order: { createdAt: 'ASC' },
    });
    const decisionResponses = await this.decisionResponseRepo.find({
      where: { incident: { id: incident.id } },
      relations: ['tasker', 'evidences'],
      order: { decisionVersion: 'ASC', responseRevision: 'ASC' },
    });
    const byItem = new Map<string, IncidentEvidenceEntity[]>();
    for (const e of visibleEvidences) {
      const key = e.damageItem?.id;
      if (!key) continue;
      const arr = byItem.get(key) ?? [];
      arr.push(e);
      byItem.set(key, arr);
    }
    // Ảnh giải trình của Tasker gắn ở cấp sự cố (không thuộc hạng mục nào) → tách riêng
    // để hiển thị trong phụ lục Giải trình bên Admin (trước đây bị rơi mất).
    const statementEvidences = visibleEvidences.filter(
      (e) =>
        !e.damageItem &&
        e.purpose === IncidentEvidencePurpose.TASKER_STATEMENT,
    );
    // P0.4 — ảnh minh chứng chuyển khoản thủ công (audit).
    const transferProofEvidences = visibleEvidences.filter(
      (e) =>
        e.purpose === IncidentEvidencePurpose.COMPENSATION_TRANSFER_PROOF,
    );
    // Số dư ví Tasker (read-only) để tính quỹ khả dụng = ví + cọc gốc.
    const taskerWallet = incident.tasker
      ? await this.walletRepo.findOne({
          where: {
            tasker: { id: incident.tasker.id },
            ownerType: WalletOwnerType.TASKER,
          },
        })
      : null;
    return toAdminView(
      incident,
      items,
      byItem,
      statements,
      decisionResponses,
      statementEvidences,
      toNumber(taskerWallet?.balance),
      transferProofEvidences,
    );
  }
}
