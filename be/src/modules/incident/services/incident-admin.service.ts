import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { toNumber } from 'src/common/helpers/number.helper';
import { WalletOwnerType } from 'src/common/enums/wallet-owner-type.enum';
import { WalletEntity } from 'src/modules/wallet/entity/wallet.entity';
import { IncidentStatus } from 'src/common/enums/incident-status.enum';
import { IncidentLogDimension } from 'src/common/enums/incident-log-dimension.enum';
import { IncidentEntity } from '../entity/incident.entity';
import { IncidentDamageItemEntity } from '../entity/incident-damage-item.entity';
import { IncidentEvidenceEntity } from '../entity/incident-evidence.entity';
import { IncidentStatementEntity } from '../entity/incident-statement.entity';
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
    @InjectRepository(BookingEntity)
    private readonly bookingRepo: Repository<BookingEntity>,
    @InjectRepository(SupportTicketEntity)
    private readonly ticketRepo: Repository<SupportTicketEntity>,
    private readonly state: IncidentStateService,
    private readonly config: IncidentConfigService,
    private readonly code: IncidentCodeService,
    private readonly fraudStrike: FraudStrikeService,
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
        await manager.getRepository(IncidentEntity).save(incident);

        await this.state.log(
          manager,
          incident.id,
          IncidentLogDimension.STATUS,
          from,
          IncidentStatus.INVESTIGATING,
          adminUserId,
          'Admin tiếp nhận thẩm định (ghi nhận ý định hold cọc — Phase 2)',
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
      await this.dataSource.transaction(async (manager) => {
        const incident = await manager.getRepository(IncidentEntity).findOne({
          where: { id: incidentId },
        });
        if (!incident) throw new NotFoundException('Không tìm thấy sự cố');
        if (incident.status !== IncidentStatus.INVESTIGATING) {
          throw new ConflictException(
            'Chỉ xác minh khi sự cố đang được thẩm định',
          );
        }
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
          item.verifiedAmount = input.verifiedAmount;
          await manager.getRepository(IncidentDamageItemEntity).save(item);
        }
      });
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
      where: { incident: { id: incident.id } },
      relations: ['damageItem'],
    });
    const statements = await this.statementRepo.find({
      where: { incident: { id: incident.id } },
      relations: ['submittedBy'],
      order: { createdAt: 'ASC' },
    });
    const byItem = new Map<string, IncidentEvidenceEntity[]>();
    for (const e of evidences) {
      const key = e.damageItem?.id;
      if (!key) continue;
      const arr = byItem.get(key) ?? [];
      arr.push(e);
      byItem.set(key, arr);
    }
    const taskerWalletBalance = incident.tasker?.id
      ? toNumber(
          (
            await this.incidentRepo.manager
              .getRepository(WalletEntity)
              .findOne({
                where: {
                  tasker: { id: incident.tasker.id },
                  ownerType: WalletOwnerType.TASKER,
                },
              })
          )?.balance,
        )
      : 0;
    return toAdminView(
      incident,
      items,
      byItem,
      statements,
      taskerWalletBalance,
    );
  }
}
