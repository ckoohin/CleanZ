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
import {
  applyAdminIncidentFilters,
  applyAdminIncidentSort,
} from './incident-query.filters';
import { AcceptIncidentDto } from '../dto/accept-incident.dto';
import { CreateFromTicketDto } from '../dto/create-from-ticket.dto';
import {
  IncidentAdminView,
  IncidentDebtView,
  PaginatedAdminIncidents,
  toAdminView,
  toIncidentSummary,
} from '../dto/incident-response.dto';
import { IncidentStateService } from './incident-state.service';
import { isActiveIncidentPerBookingConflict } from '../domain/incident-conflict.helpers';
import { IncidentConfigService } from './incident-config.service';
import { IncidentCodeService } from './incident-code.service';
import { FraudStrikeService } from './fraud-strike.service';
import {
  INCIDENT_EVIDENCE_VISIBILITY,
  IncidentEvidenceLifecycleService,
} from './incident-evidence-lifecycle.service';
import { IncidentDepositHoldService } from './incident-deposit-hold.service';
import { IncidentNotifier } from './incident-notifier.service';
import { IncidentAlertService } from './incident-alert.service';
import { TaskerDebtService } from 'src/modules/wallet/tasker-debt.service';
import { AuditRecorder } from 'src/modules/admin/audit/audit-recorder.service';
import { AuditActionCode } from 'src/modules/admin/audit/audit-action-codes';
import { AuditSeverity } from 'src/common/enums/audit-severity.enum';
import {
  TaskerDebtSource,
  debtOutstanding,
} from 'src/modules/wallet/entity/tasker-debt.entity';

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
    private readonly taskerDebt: TaskerDebtService,
    private readonly alert: IncidentAlertService,
    private readonly auditRecorder: AuditRecorder,
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
          code: 'INCIDENT_ALREADY_ACTIVE_FOR_BOOKING',
          message: 'Đơn này đã có sự cố đang xử lý',
          incidentId: active.id,
        });
      }

      const totalClaimed = dto.damageItems.reduce(
        (sum, it) => sum + it.claimedAmount,
        0,
      );
      // Trần áp cho TỔNG, giống hệt luồng khách tự báo cáo. Thiếu chốt này thì nâng cấp từ
      // ticket là đường vòng qua được trần chính sách — và `claimedAmount` còn quyết định
      // khoản tạm giữ ví Tasker lúc tiếp nhận.
      const claimMax = await this.config.getClaimMaxAmount();
      if (totalClaimed > claimMax) {
        throw new UnprocessableEntityException(
          `Tổng số tiền yêu cầu vượt trần cho phép (${claimMax} VND)`,
        );
      }
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
        // Pha kiểm `active` ở trên thua race; chốt chặn thật là partial unique index.
        // Bắt đúng constraint đó thôi — 23505 của mã sự cố là chuyện khác hẳn, gộp chung
        // sẽ báo sai nguyên nhân cho admin.
        .catch((err: unknown) => {
          if (isActiveIncidentPerBookingConflict(err)) {
            throw new ConflictException({
              code: 'INCIDENT_ALREADY_ACTIVE_FOR_BOOKING',
              message: 'Đơn này đã có sự cố đang xử lý',
            });
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
      const incidentId = await this.dataSource
        .transaction(async (manager) => {
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
          const item = await manager
            .getRepository(IncidentDamageItemEntity)
            .save(
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
          // Khoá `pessimistic_write` trên booking chỉ chặn được hai Admin tranh nhau; luồng
          // khách tự báo cáo KHÔNG khoá booking nên vẫn có thể chen vào giữa. Partial unique
          // index mới là chốt chặn, và va chạm của nó phải ra 409 chứ không phải 500.
        })
        .catch((err: unknown) => {
          if (isActiveIncidentPerBookingConflict(err)) {
            throw new ConflictException({
              code: 'INCIDENT_ALREADY_ACTIVE_FOR_BOOKING',
              message: 'Đơn này đã có sự cố đang xử lý',
            });
          }
          throw err;
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
      const incidentId = await this.dataSource
        .transaction(async (manager) => {
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
          // Cùng lý do như luồng check-in: khoá booking không chặn được luồng khách tự báo cáo.
        })
        .catch((err: unknown) => {
          if (isActiveIncidentPerBookingConflict(err)) {
            throw new ConflictException({
              code: 'INCIDENT_ALREADY_ACTIVE_FOR_BOOKING',
              message: 'Đơn này đã có sự cố đang xử lý',
            });
          }
          throw err;
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

      applyAdminIncidentFilters(qb, query);
      applyAdminIncidentSort(qb, query.sort);

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
          IncidentStatus.REVIEWING,
        );

        const from = incident.status;
        const sla = await this.config.getSla(incident.severity);
        const now = Date.now();

        incident.status = IncidentStatus.REVIEWING;
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
          IncidentStatus.REVIEWING,
          adminUserId,
          `Admin tiếp nhận thẩm định — tạm giữ ví Tasker ${heldAmount} VND` +
            (dto.note?.trim() ? ` — ghi chú: ${dto.note.trim()}` : ''),
        );
      });
      return this.findOne(incidentId);
    }, 'Lỗi khi tiếp nhận sự cố');
  }

  /**
   * Xoá nợ bồi thường không thu hồi được — lối ra cho hồ sơ mắc kẹt ở COMPENSATED vì
   * auto-close cố tình bỏ qua sự cố còn nợ. Sau khi xoá, nợ về 0 nên Tasker được rút tiền
   * trở lại và hồ sơ đủ điều kiện đóng nguội.
   */
  async writeOffDebt(
    adminUserId: string,
    incidentId: string,
    reason: string,
  ): Promise<IncidentAdminView> {
    return asyncHandleOperation(async () => {
      const minAgeDays = await this.config.getDebtWriteOffAfterDays();
      const result = await this.dataSource.transaction(async (manager) => {
        const out = await this.taskerDebt.writeOff(
          manager,
          TaskerDebtSource.INCIDENT_COMPENSATION,
          incidentId,
          adminUserId,
          reason,
          minAgeDays,
        );
        await this.state.log(
          manager,
          incidentId,
          IncidentLogDimension.COMPENSATION,
          null,
          'DEBT_WRITTEN_OFF',
          adminUserId,
          `Xoá nợ ${out.writtenOff} VND — lý do: ${reason.trim()}`,
        );

        // Nền tảng chấp nhận mất khoản này. Nhật ký phải commit cùng việc xoá nợ:
        // đây là quyết định không đảo ngược được và không bên nào ở ngoài đối chứng.
        await this.auditRecorder.enqueueInTransaction(manager, {
          actionCode: AuditActionCode.INCIDENT_DEBT_WRITE_OFF,
          severity: AuditSeverity.CRITICAL,
          targetType: 'INCIDENT',
          targetId: incidentId,
          reason,
          businessData: {
            incidentId,
            writtenOffAmount: out.writtenOff,
            sourceCode: out.sourceCode ?? null,
            minAgeDays,
          },
        });

        return out;
      });

      // Gửi sau khi commit: webhook là network call, không giữ trong lock.
      await this.alert.send(
        `incident-debt-write-off:${incidentId}`,
        `Xoá nợ bồi thường ${result.writtenOff.toLocaleString('vi-VN')}đ — sự cố ` +
          `${result.sourceCode ?? incidentId}, admin ${adminUserId}. Lý do: ${reason.trim()}`,
        'WARNING',
      );
      return this.findOne(incidentId);
    }, 'Lỗi khi xoá nợ bồi thường');
  }

  /**
   * Nhắc khách bổ sung bằng chứng cho các hạng mục Admin đánh dấu NEED_MORE_EVIDENCE.
   * Gọi từ `IncidentDecisionService.saveDecision` SAU transaction (thẩm định và duyệt tiền
   * nay là một bước duy nhất, không còn endpoint `items/verify` riêng).
   */
  notifyNeedMoreEvidence(
    incidentId: string,
    incidentCode: string | null,
    customerUserId: string | null,
    items: { id: string; description: string }[],
  ): void {
    if (!customerUserId || items.length === 0) return;
    const day = new Date().toISOString().slice(0, 10);
    for (const it of items) {
      this.notifier.notify(
        customerUserId,
        incidentId,
        'Cần bổ sung bằng chứng',
        `CleanZ cần thêm bằng chứng cho hạng mục "${it.description}" của sự cố ${incidentCode ?? ''}. Vui lòng mở sự cố và tải lên ảnh bổ sung để tiếp tục thẩm định.`,
        `need-evidence-${it.id}-${day}`,
      );
    }
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
      await this.loadDebtView(incident.id),
    );
  }

  /** Ảnh chụp khoản nợ của sự cố, đọc từ sổ nợ của ví (`tasker_debts`). */
  private async loadDebtView(
    incidentId: string,
  ): Promise<IncidentDebtView | null> {
    const debt = await this.taskerDebt.findBySource(
      this.dataSource.manager,
      TaskerDebtSource.INCIDENT_COMPENSATION,
      incidentId,
    );
    if (!debt) return null;

    const minAgeDays = await this.config.getDebtWriteOffAfterDays();
    const outstanding = debtOutstanding(debt);
    return {
      recovered: toNumber(debt.recoveredAmount),
      writtenOff: toNumber(debt.writtenOffAmount),
      outstanding,
      canWriteOff:
        outstanding > 0 &&
        Date.now() - debt.createdAt.getTime() >= minAgeDays * 86_400_000,
      writeOff: debt.writtenOffAt
        ? {
            at: debt.writtenOffAt,
            reason: debt.writeOffReason ?? null,
            byAdminName: debt.writtenOffByAdmin?.fullName ?? null,
          }
        : null,
    };
  }
}
