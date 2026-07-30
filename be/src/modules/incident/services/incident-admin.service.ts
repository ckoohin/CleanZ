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
import { IncidentSource } from 'src/common/enums/incident-source.enum';
import { IncidentType } from 'src/common/enums/incident-type.enum';
import { BookingCheckinReviewStatus } from 'src/common/enums/booking-checkin-review-status.enum';
import { BookingNoShowReviewStatus } from 'src/common/enums/booking-no-show-review-status.enum';
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
import {
  INCIDENT_EVIDENCE_VISIBILITY,
  IncidentEvidenceLifecycleService,
} from './incident-evidence-lifecycle.service';
import { IncidentDepositHoldService } from './incident-deposit-hold.service';
import { IncidentNotifier } from './incident-notifier.service';

export interface CreateCheckinViolationIncidentInput {
  claimedAmount: number;
  reviewReason: string;
}

export interface CreateNoShowViolationIncidentInput {
  claimedAmount: number;
  reviewReason: string;
}

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
              type: IncidentType.PROPERTY_DAMAGE,
              source: IncidentSource.SUPPORT_TICKET,
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

  /**
   * Mở Incident từ kết quả Admin xác nhận vi phạm check-in.
   *
   * Đây mới là số tiền yêu cầu ban đầu. Engine Incident hiện có vẫn bắt buộc
   * xác minh hạng mục, phân trách nhiệm, duyệt quyết định và thực thi bồi thường.
   */
  async createFromCheckinViolation(
    adminUserId: string,
    bookingId: string,
    input: CreateCheckinViolationIncidentInput,
  ): Promise<IncidentAdminView> {
    return asyncHandleOperation(async () => {
      const claimMax = await this.config.getClaimMaxAmount();
      if (
        !Number.isInteger(input.claimedAmount) ||
        input.claimedAmount <= 0 ||
        input.claimedAmount > claimMax
      ) {
        throw new UnprocessableEntityException(
          `Số tiền yêu cầu phải là số nguyên dương và không vượt ${claimMax} VND`,
        );
      }

      const severity = await this.config.computeSeverity(input.claimedAmount);
      const code = await this.code.next();
      const incidentId = await this.dataSource.transaction(async (manager) => {
        const booking = await manager
          .getRepository(BookingEntity)
          .createQueryBuilder('booking')
          .leftJoinAndSelect('booking.customer', 'customer')
          .leftJoinAndSelect('customer.user', 'customerUser')
          .leftJoinAndSelect('booking.tasker', 'tasker')
          .leftJoinAndSelect('tasker.user', 'taskerUser')
          .setLock('pessimistic_write', undefined, ['booking'])
          .where('booking.id = :bookingId', { bookingId })
          .getOne();
        if (!booking) {
          throw new NotFoundException('Không tìm thấy booking');
        }
        if (
          booking.checkinReviewStatus !== BookingCheckinReviewStatus.REJECTED
        ) {
          throw new UnprocessableEntityException(
            'Chỉ mở hồ sơ vi phạm sau khi Admin từ chối check-in',
          );
        }
        if (!booking.customer || !booking.tasker) {
          throw new UnprocessableEntityException(
            'Booking phải có customer và tasker để mở hồ sơ bồi thường',
          );
        }

        const active = await manager
          .getRepository(IncidentEntity)
          .createQueryBuilder('incident')
          .where('incident.booking_id = :bookingId', { bookingId })
          .andWhere('incident.status != :closed', {
            closed: IncidentStatus.CLOSED,
          })
          .getOne();
        if (active) {
          if (
            active.type === IncidentType.CHECKIN_VIOLATION &&
            active.source === IncidentSource.CHECKIN_REVIEW
          ) {
            return active.id;
          }
          throw new ConflictException({
            message: 'Đơn này đã có sự cố khác đang xử lý',
            incidentId: active.id,
          });
        }

        const distance =
          booking.checkinDistanceMeters != null
            ? `${Math.round(Number(booking.checkinDistanceMeters))}m`
            : 'không đo được';
        const incident = await manager.getRepository(IncidentEntity).save(
          manager.getRepository(IncidentEntity).create({
            incidentCode: code,
            booking: { id: booking.id } as BookingEntity,
            customer: { id: booking.customer.id },
            tasker: { id: booking.tasker.id },
            title: `Vi phạm check-in đơn ${booking.bookingCode}`,
            description:
              `Admin xác nhận check-in cần xử lý vi phạm. ` +
              `Khoảng cách: ${distance}. Lý do: ${input.reviewReason}`,
            type: IncidentType.CHECKIN_VIOLATION,
            source: IncidentSource.CHECKIN_REVIEW,
            severity,
            status: IncidentStatus.REPORTED,
            claimedAmount: input.claimedAmount,
            reportedAt: new Date(),
          }),
        );
        const item = await manager.getRepository(IncidentDamageItemEntity).save(
          manager.getRepository(IncidentDamageItemEntity).create({
            incident: { id: incident.id },
            description: 'Ảnh hưởng do vi phạm quy trình check-in',
            claimedAmount: input.claimedAmount,
          }),
        );

        if (booking.checkinProofPhotoUrl) {
          await manager.getRepository(IncidentEvidenceEntity).save(
            manager.getRepository(IncidentEvidenceEntity).create({
              incident: { id: incident.id },
              damageItem: { id: item.id },
              fileUrl: booking.checkinProofPhotoUrl,
              fileType: 'IMAGE',
              purpose: IncidentEvidencePurpose.OTHER,
              visibility: INCIDENT_EVIDENCE_VISIBILITY.INCIDENT_PARTIES,
              // Upload generic hiện chưa có asset ownership record; không gán
              // uploader giả chỉ từ người gửi URL check-in.
              uploadedBy: null,
              isSoftDeleted: false,
              isActiveForResponse: true,
            }),
          );
        }

        await this.state.log(
          manager,
          incident.id,
          IncidentLogDimension.STATUS,
          null,
          IncidentStatus.REPORTED,
          adminUserId,
          `Mở từ kết quả review check-in booking ${booking.bookingCode}`,
        );
        return incident.id;
      });

      const incident = await this.loadFull(incidentId);
      this.notifier.notify(
        incident.customer?.user?.id,
        incident.id,
        'Đã mở hồ sơ xử lý check-in',
        `CleanZ đã mở hồ sơ ${incident.incidentCode ?? ''} để xác minh quyền lợi và mức bồi thường.`,
        'checkin-review-opened-customer',
      );
      this.notifier.notify(
        incident.tasker?.user?.id,
        incident.id,
        'Check-in đang được xử lý vi phạm',
        `Hồ sơ ${incident.incidentCode ?? ''} đã được mở. Bạn sẽ được quyền giải trình trước khi có quyết định.`,
        'checkin-review-opened-tasker',
      );
      return this.buildAdminView(incident);
    }, 'Lỗi khi mở hồ sơ vi phạm check-in');
  }

  /**
   * Mở Incident bồi thường bổ sung sau khi Admin đã xác nhận Tasker no-show.
   * Hoàn escrow/voucher của booking đã xảy ra ở T+45 và không phụ thuộc luồng
   * này; Incident chỉ xử lý quyền lợi phát sinh thêm.
   */
  async createFromNoShowViolation(
    adminUserId: string,
    bookingId: string,
    input: CreateNoShowViolationIncidentInput,
  ): Promise<IncidentAdminView> {
    return asyncHandleOperation(async () => {
      const claimMax = await this.config.getClaimMaxAmount();
      if (
        !Number.isInteger(input.claimedAmount) ||
        input.claimedAmount <= 0 ||
        input.claimedAmount > claimMax
      ) {
        throw new UnprocessableEntityException(
          `Số tiền yêu cầu phải là số nguyên dương và không vượt ${claimMax} VND`,
        );
      }

      const severity = await this.config.computeSeverity(input.claimedAmount);
      const code = await this.code.next();
      const incidentId = await this.dataSource.transaction(async (manager) => {
        const booking = await manager
          .getRepository(BookingEntity)
          .createQueryBuilder('booking')
          .leftJoinAndSelect('booking.customer', 'customer')
          .leftJoinAndSelect('customer.user', 'customerUser')
          .leftJoinAndSelect('booking.tasker', 'tasker')
          .leftJoinAndSelect('tasker.user', 'taskerUser')
          .setLock('pessimistic_write', undefined, ['booking'])
          .where('booking.id = :bookingId', { bookingId })
          .getOne();
        if (!booking) {
          throw new NotFoundException('Không tìm thấy booking');
        }
        if (
          booking.noShowReviewStatus !== BookingNoShowReviewStatus.CONFIRMED
        ) {
          throw new UnprocessableEntityException(
            'Chỉ mở hồ sơ sau khi Admin xác nhận Tasker no-show',
          );
        }
        if (!booking.customer || !booking.tasker) {
          throw new UnprocessableEntityException(
            'Booking phải có customer và tasker để mở hồ sơ bồi thường',
          );
        }

        const active = await manager
          .getRepository(IncidentEntity)
          .createQueryBuilder('incident')
          .where('incident.booking_id = :bookingId', { bookingId })
          .andWhere('incident.status != :closed', {
            closed: IncidentStatus.CLOSED,
          })
          .getOne();
        if (active) {
          if (
            active.type === IncidentType.NO_SHOW &&
            active.source === IncidentSource.NO_SHOW_REVIEW
          ) {
            return active.id;
          }
          throw new ConflictException({
            message: 'Đơn này đã có sự cố khác đang xử lý',
            incidentId: active.id,
          });
        }

        const incident = await manager.getRepository(IncidentEntity).save(
          manager.getRepository(IncidentEntity).create({
            incidentCode: code,
            booking: { id: booking.id } as BookingEntity,
            customer: { id: booking.customer.id },
            tasker: { id: booking.tasker.id },
            title: `Tasker no-show đơn ${booking.bookingCode}`,
            description:
              `Admin xác nhận Tasker không có mặt/check-in đúng hạn. ` +
              `Lý do kết luận: ${input.reviewReason}`,
            type: IncidentType.NO_SHOW,
            source: IncidentSource.NO_SHOW_REVIEW,
            severity,
            status: IncidentStatus.REPORTED,
            claimedAmount: input.claimedAmount,
            reportedAt: new Date(),
          }),
        );
        await manager.getRepository(IncidentDamageItemEntity).save(
          manager.getRepository(IncidentDamageItemEntity).create({
            incident: { id: incident.id },
            description: 'Ảnh hưởng phát sinh do Tasker no-show',
            claimedAmount: input.claimedAmount,
          }),
        );
        await this.state.log(
          manager,
          incident.id,
          IncidentLogDimension.STATUS,
          null,
          IncidentStatus.REPORTED,
          adminUserId,
          `Mở từ kết luận no-show booking ${booking.bookingCode}`,
        );
        return incident.id;
      });

      const incident = await this.loadFull(incidentId);
      this.notifier.notify(
        incident.customer?.user?.id,
        incident.id,
        'Đã mở hồ sơ bồi thường no-show',
        `CleanZ đã mở hồ sơ ${incident.incidentCode ?? ''} để xem xét quyền lợi bổ sung; khoản hoàn booking trước đó không bị ảnh hưởng.`,
        'no-show-review-opened-customer',
      );
      this.notifier.notify(
        incident.tasker?.user?.id,
        incident.id,
        'Đã mở hồ sơ xử lý no-show',
        `Hồ sơ ${incident.incidentCode ?? ''} đã được mở. Bạn có quyền gửi bằng chứng và phản hồi trong quy trình Incident.`,
        'no-show-review-opened-tasker',
      );
      return this.buildAdminView(incident);
    }, 'Lỗi khi mở hồ sơ no-show');
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
        const sla = await this.config.getSla(incident.severity);
        const now = Date.now();

        incident.status = IncidentStatus.INVESTIGATING;
        incident.statementDueAt = new Date(now + sla.statementMins * 60000);
        incident.decisionDueAt = new Date(now + sla.decisionMins * 60000);

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
          `Admin tiếp nhận thẩm định — tạm giữ ví Tasker ${heldAmount} VND` +
            (dto.note?.trim() ? ` — ghi chú: ${dto.note.trim()}` : ''),
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
    const statementEvidences = visibleEvidences.filter(
      (e) =>
        !e.damageItem && e.purpose === IncidentEvidencePurpose.TASKER_STATEMENT,
    );
    const transferProofEvidences = visibleEvidences.filter(
      (e) => e.purpose === IncidentEvidencePurpose.COMPENSATION_TRANSFER_PROOF,
    );
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
