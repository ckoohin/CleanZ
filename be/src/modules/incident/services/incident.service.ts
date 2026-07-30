import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { BookingEntity } from 'src/modules/booking/entity/booking.entity';
import { BookingStatus } from 'src/common/enums/booking-status.enum';
import { IncidentStatus } from 'src/common/enums/incident-status.enum';
import { IncidentDecisionStatus } from 'src/common/enums/incident-decision-status.enum';
import { IncidentCompensationStatus } from 'src/common/enums/incident-compensation-status.enum';
import { IncidentClosureReason } from 'src/common/enums/incident-closure-reason.enum';
import { IncidentLogDimension } from 'src/common/enums/incident-log-dimension.enum';
import { IncidentEvidencePurpose } from 'src/common/enums/incident-evidence-purpose.enum';
import { IncidentDamageItemVerificationStatus } from 'src/common/enums/incident-damage-item-verification-status.enum';
import { IncidentSource } from 'src/common/enums/incident-source.enum';
import { IncidentType } from 'src/common/enums/incident-type.enum';
import { IncidentEntity } from '../entity/incident.entity';
import { IncidentDamageItemEntity } from '../entity/incident-damage-item.entity';
import { IncidentEvidenceEntity } from '../entity/incident-evidence.entity';
import { IncidentStatusLogEntity } from '../entity/incident-status-log.entity';
import { CreateIncidentDto } from '../dto/create-incident.dto';
import { QueryIncidentDto } from '../dto/query-incident.dto';
import { WithdrawIncidentDto } from '../dto/withdraw-incident.dto';
import {
  IncidentCustomerView,
  PaginatedIncidents,
  toCustomerView,
  toIncidentSummary,
} from '../dto/incident-response.dto';
import { IncidentCodeService } from './incident-code.service';
import { IncidentConfigService } from './incident-config.service';
import { IncidentNotifier } from './incident-notifier.service';
import { IncidentDepositHoldService } from './incident-deposit-hold.service';
import {
  INCIDENT_EVIDENCE_VISIBILITY,
  IncidentEvidenceLifecycleService,
} from './incident-evidence-lifecycle.service';

const WITHDRAWABLE_STATUSES = [
  IncidentStatus.REPORTED,
  IncidentStatus.INVESTIGATING,
];

@Injectable()
export class IncidentService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(IncidentEntity)
    private readonly incidentRepo: Repository<IncidentEntity>,
    @InjectRepository(IncidentDamageItemEntity)
    private readonly itemRepo: Repository<IncidentDamageItemEntity>,
    @InjectRepository(IncidentEvidenceEntity)
    private readonly evidenceRepo: Repository<IncidentEvidenceEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookingRepo: Repository<BookingEntity>,
    private readonly incidentCode: IncidentCodeService,
    private readonly config: IncidentConfigService,
    private readonly evidenceLifecycle: IncidentEvidenceLifecycleService,
    private readonly notifier: IncidentNotifier,
    private readonly depositHold: IncidentDepositHoldService,
  ) {}

  async uploadEvidence(
    userId: string,
    file: Express.Multer.File,
  ): Promise<{ id: string; url: string; fileType: string }> {
    return asyncHandleOperation(async () => {
      return this.evidenceLifecycle.uploadDetachedEvidence(userId, file, {
        purpose: IncidentEvidencePurpose.DAMAGE_PHOTO,
        visibility: INCIDENT_EVIDENCE_VISIBILITY.INCIDENT_PARTIES,
      });
    }, 'Lỗi khi tải bằng chứng');
  }

  /**
   * P1.4 — Khách bổ sung bằng chứng cho hạng mục Admin yêu cầu (NEED_MORE_EVIDENCE).
   * Gắn các evidence đã upload (detached) vào hạng mục; hạng mục quay về PENDING chờ
   * Admin thẩm định lại (finalize vẫn bị chặn cho tới khi thẩm định xong).
   */
  async attachItemEvidence(
    customerUserId: string,
    incidentId: string,
    itemId: string,
    evidenceIds: string[],
  ): Promise<IncidentCustomerView> {
    return asyncHandleOperation(async () => {
      await this.dataSource.transaction(async (manager) => {
        const incident = await this.loadOwned(incidentId, customerUserId);
        if (incident.status !== IncidentStatus.INVESTIGATING) {
          throw new ConflictException({
            code: 'INCIDENT_NOT_EDITABLE',
            message: 'Chỉ bổ sung bằng chứng khi sự cố đang được thẩm định',
          });
        }
        const item = await manager
          .getRepository(IncidentDamageItemEntity)
          .findOne({
            where: { id: itemId, incident: { id: incidentId } },
          });
        if (!item) {
          throw new NotFoundException('Không tìm thấy hạng mục thiệt hại');
        }
        if (
          item.verificationStatus !==
          IncidentDamageItemVerificationStatus.NEED_MORE_EVIDENCE
        ) {
          throw new ConflictException({
            code: 'ITEM_NOT_AWAITING_EVIDENCE',
            message: 'Hạng mục này không ở trạng thái chờ bổ sung bằng chứng',
          });
        }

        // Chỉ nhận evidence do chính khách upload, còn detached, chưa xoá.
        const owned = await manager.getRepository(IncidentEvidenceEntity).find({
          where: {
            id: In(evidenceIds),
            uploadedBy: { id: customerUserId },
            incident: IsNull(),
            isSoftDeleted: false,
          },
        });
        if (owned.length !== evidenceIds.length) {
          throw new UnprocessableEntityException({
            code: 'INVALID_EVIDENCE',
            message: 'Bằng chứng không hợp lệ hoặc không thuộc về bạn',
          });
        }

        await manager
          .getRepository(IncidentEvidenceEntity)
          .createQueryBuilder()
          .update()
          .set({
            incident: { id: incidentId },
            damageItem: { id: itemId },
            purpose: IncidentEvidencePurpose.DAMAGE_PHOTO,
            visibility: INCIDENT_EVIDENCE_VISIBILITY.INCIDENT_PARTIES,
          })
          .whereInIds(evidenceIds)
          .execute();

        // Quay về PENDING chờ Admin thẩm định lại.
        item.verificationStatus = IncidentDamageItemVerificationStatus.PENDING;
        await manager.getRepository(IncidentDamageItemEntity).save(item);

        await manager.getRepository(IncidentStatusLogEntity).save(
          manager.getRepository(IncidentStatusLogEntity).create({
            incident: { id: incidentId },
            dimension: IncidentLogDimension.STATUS,
            oldValue: IncidentDamageItemVerificationStatus.NEED_MORE_EVIDENCE,
            newValue: IncidentDamageItemVerificationStatus.PENDING,
            changedBy: { id: customerUserId },
            reason: `Khách bổ sung ${evidenceIds.length} bằng chứng cho hạng mục "${item.description}"`,
          }),
        );
      });
      return this.findOneForCustomer(customerUserId, incidentId);
    }, 'Lỗi khi bổ sung bằng chứng');
  }

  async create(
    customerUserId: string,
    dto: CreateIncidentDto,
  ): Promise<IncidentCustomerView> {
    return asyncHandleOperation(async () => {
      const booking = await this.bookingRepo.findOne({
        where: { id: dto.bookingId },
        relations: ['customer', 'customer.user', 'tasker'],
      });
      if (!booking || booking.customer?.user?.id !== customerUserId) {
        throw new NotFoundException('Không tìm thấy đơn dịch vụ');
      }
      if (booking.status !== BookingStatus.COMPLETED || !booking.completedAt) {
        throw new UnprocessableEntityException(
          'Chỉ báo cáo sự cố cho đơn đã hoàn thành',
        );
      }
      if (!booking.tasker) {
        throw new UnprocessableEntityException(
          'Đơn không có tasker để báo cáo sự cố',
        );
      }

      const lockedUntil = booking.customer.reportingLockedUntil;
      if (lockedUntil && lockedUntil.getTime() > Date.now()) {
        throw new ForbiddenException('Tài khoản đang bị hạn chế báo cáo sự cố');
      }

      const active = await this.incidentRepo
        .createQueryBuilder('i')
        .where('i.booking_id = :bid', { bid: booking.id })
        .andWhere('i.status != :closed', { closed: IncidentStatus.CLOSED })
        .getOne();
      if (active) {
        throw new ConflictException({
          message: 'Đơn này đã có sự cố đang xử lý',
          incidentId: active.id,
        });
      }

      const claimMax = await this.config.getClaimMaxAmount();
      let totalClaimed = 0;
      for (const item of dto.damageItems) {
        if (!Number.isInteger(item.claimedAmount) || item.claimedAmount <= 0) {
          throw new UnprocessableEntityException(
            'Số tiền yêu cầu phải là số nguyên dương (VND)',
          );
        }
        if (item.claimedAmount > claimMax) {
          throw new UnprocessableEntityException(
            `Số tiền yêu cầu vượt trần cho phép (${claimMax} VND)`,
          );
        }
        totalClaimed += item.claimedAmount;
      }
      const severity = await this.config.computeSeverity(totalClaimed);

      const windowHours = await this.config.getReportWindowHours(severity);
      const deadline = new Date(
        booking.completedAt.getTime() + windowHours * 3_600_000,
      );
      if (new Date() > deadline) {
        throw new UnprocessableEntityException('Đã quá thời hạn báo cáo sự cố');
      }

      const allEvidenceIds = dto.damageItems.flatMap((d) => d.evidenceIds);
      const evidences = await this.evidenceRepo.find({
        where: {
          id: In(allEvidenceIds),
          incident: IsNull(),
          isSoftDeleted: false,
        },
        relations: ['uploadedBy'],
      });
      const evidenceById = new Map(evidences.map((e) => [e.id, e]));
      for (const id of allEvidenceIds) {
        const e = evidenceById.get(id);
        if (!e || e.uploadedBy?.id !== customerUserId) {
          throw new UnprocessableEntityException(
            'Bằng chứng không hợp lệ hoặc đã được sử dụng',
          );
        }
      }

      const now = new Date();
      const sla = await this.config.getSla(severity);
      const code = await this.incidentCode.next(now);

      const saved = await this.createWithConflictGuard(booking.id, () =>
        this.dataSource.transaction(async (manager) => {
          const incident = await manager.getRepository(IncidentEntity).save(
            manager.getRepository(IncidentEntity).create({
              incidentCode: code,
              booking: { id: booking.id } as BookingEntity,
              customer: { id: booking.customer!.id },
              tasker: { id: booking.tasker!.id },
              title: dto.title,
              description: dto.description,
              type: IncidentType.PROPERTY_DAMAGE,
              source: IncidentSource.CUSTOMER_REPORT,
              severity,
              status: IncidentStatus.REPORTED,
              claimedAmount: totalClaimed,
              reportWindowUntil: deadline,
              receivedDueAt: new Date(now.getTime() + sla.receivedMins * 60000),
              reportedAt: now,
            }),
          );

          for (const itemDto of dto.damageItems) {
            const item = await manager
              .getRepository(IncidentDamageItemEntity)
              .save(
                manager.getRepository(IncidentDamageItemEntity).create({
                  incident: { id: incident.id },
                  description: itemDto.description,
                  claimedAmount: itemDto.claimedAmount,
                }),
              );
            await manager
              .getRepository(IncidentEvidenceEntity)
              .createQueryBuilder()
              .update()
              .set({
                incident: { id: incident.id },
                damageItem: { id: item.id },
                purpose: IncidentEvidencePurpose.DAMAGE_PHOTO,
                visibility: INCIDENT_EVIDENCE_VISIBILITY.INCIDENT_PARTIES,
              })
              .whereInIds(itemDto.evidenceIds)
              .execute();
          }

          await manager.getRepository(IncidentStatusLogEntity).save(
            manager.getRepository(IncidentStatusLogEntity).create({
              incident: { id: incident.id },
              dimension: IncidentLogDimension.STATUS,
              oldValue: null,
              newValue: IncidentStatus.REPORTED,
              changedBy: { id: customerUserId },
              reason: 'Customer báo cáo sự cố',
            }),
          );
          return incident;
        }),
      );

      this.notifier.notify(
        customerUserId,
        saved.id,
        'Đã ghi nhận báo cáo sự cố',
        `Sự cố ${saved.incidentCode} của bạn đã được tiếp nhận và đang chờ xử lý.`,
        'reported',
      );

      return this.findOneForCustomer(customerUserId, saved.id);
    }, 'Lỗi khi tạo báo cáo sự cố');
  }

  async listMine(
    customerUserId: string,
    query: QueryIncidentDto,
  ): Promise<PaginatedIncidents> {
    return asyncHandleOperation(async () => {
      const page = query.page ?? 1;
      const limit = query.limit ?? 10;
      const qb = this.incidentRepo
        .createQueryBuilder('i')
        .innerJoin('i.customer', 'c')
        .innerJoin('c.user', 'u')
        .where('u.id = :uid', { uid: customerUserId })
        .orderBy('i.reportedAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit);
      if (query.status)
        qb.andWhere('i.status = :status', { status: query.status });
      if (query.compensationStatus)
        qb.andWhere('i.compensation_status = :cs', {
          cs: query.compensationStatus,
        });

      const [rows, total] = await qb.getManyAndCount();
      return {
        data: rows.map(toIncidentSummary),
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      };
    }, 'Lỗi khi lấy danh sách sự cố');
  }

  async findOneForCustomer(
    customerUserId: string,
    incidentId: string,
  ): Promise<IncidentCustomerView> {
    return asyncHandleOperation(async () => {
      const incident = await this.loadOwned(incidentId, customerUserId);
      const items = await this.itemRepo.find({
        where: { incident: { id: incidentId } },
        order: { createdAt: 'ASC' },
      });
      const evidences = await this.evidenceRepo.find({
        where: {
          incident: { id: incidentId },
          isSoftDeleted: false,
        },
        relations: ['damageItem'],
      });
      const visibleEvidences = this.evidenceLifecycle.filterForAudience(
        evidences,
        'CUSTOMER',
      );
      const byItem = new Map<string, IncidentEvidenceEntity[]>();
      for (const e of visibleEvidences) {
        const key = e.damageItem?.id;
        if (!key) continue;
        const arr = byItem.get(key) ?? [];
        arr.push(e);
        byItem.set(key, arr);
      }
      return toCustomerView(incident, items, byItem);
    }, 'Lỗi khi lấy chi tiết sự cố');
  }

  async withdraw(
    customerUserId: string,
    incidentId: string,
    dto: WithdrawIncidentDto,
  ): Promise<IncidentCustomerView> {
    return asyncHandleOperation(async () => {
      await this.dataSource.transaction(async (manager) => {
        const incident = await manager
          .getRepository(IncidentEntity)
          .createQueryBuilder('i')
          .innerJoinAndSelect('i.customer', 'c')
          .innerJoinAndSelect('c.user', 'u')
          .setLock('pessimistic_write', undefined, ['i'])
          .where('i.id = :id', { id: incidentId })
          .andWhere('u.id = :uid', { uid: customerUserId })
          .getOne();
        if (!incident) {
          throw new NotFoundException('Không tìm thấy sự cố');
        }
        if (!WITHDRAWABLE_STATUSES.includes(incident.status)) {
          throw new ConflictException(
            'Không thể rút sau khi đã duyệt bồi thường',
          );
        }

        if (
          ![IncidentDecisionStatus.NONE, IncidentDecisionStatus.DRAFT].includes(
            incident.decisionStatus,
          )
        ) {
          throw new ConflictException({
            code: 'DECISION_ALREADY_SUBMITTED',
            message: 'Không thể rút sau khi quyết định đã được submit',
          });
        }

        // BR29 — chỉ tự rút khi chưa phát sinh bồi thường (compensation_status=NONE).
        if (incident.compensationStatus !== IncidentCompensationStatus.NONE) {
          throw new ConflictException({
            code: 'COMPENSATION_IN_PROGRESS',
            message: 'Không thể rút khi đã phát sinh xử lý bồi thường',
          });
        }

        const from = incident.status;
        incident.status = IncidentStatus.CLOSED;
        incident.closureReason = IncidentClosureReason.WITHDRAWN;
        // P0.2 — rút báo cáo khi đang điều tra → giải phóng phần ví đã HOLD.
        await this.depositHold.release(manager, incident);
        await manager.getRepository(IncidentEntity).save(incident);
        await manager.getRepository(IncidentStatusLogEntity).save(
          manager.getRepository(IncidentStatusLogEntity).create({
            incident: { id: incident.id },
            dimension: IncidentLogDimension.STATUS,
            oldValue: from,
            newValue: IncidentStatus.CLOSED,
            changedBy: { id: customerUserId },
            reason: dto.reason ?? 'Customer rút báo cáo',
          }),
        );
      });
      return this.findOneForCustomer(customerUserId, incidentId);
    }, 'Lỗi khi rút báo cáo sự cố');
  }

  private async createWithConflictGuard<T>(
    bookingId: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      const pgErr = err as { code?: string; constraint?: string };
      if (pgErr?.code === '23505') {
        if (pgErr.constraint === 'uq_inc_active_per_booking') {
          const existing = await this.incidentRepo
            .createQueryBuilder('i')
            .where('i.booking_id = :bid', { bid: bookingId })
            .andWhere('i.status != :closed', {
              closed: IncidentStatus.CLOSED,
            })
            .getOne();
          throw new ConflictException({
            message: 'Đơn này đã có sự cố đang xử lý',
            incidentId: existing?.id,
          });
        }
        throw new ConflictException('Xung đột khi tạo sự cố, vui lòng thử lại');
      }
      throw err;
    }
  }

  private async loadOwned(
    incidentId: string,
    customerUserId: string,
  ): Promise<IncidentEntity> {
    const incident = await this.incidentRepo
      .createQueryBuilder('i')
      .innerJoinAndSelect('i.customer', 'c')
      .innerJoinAndSelect('c.user', 'u')
      .where('i.id = :id', { id: incidentId })
      .andWhere('u.id = :uid', { uid: customerUserId })
      .getOne();
    if (!incident) {
      throw new NotFoundException('Không tìm thấy sự cố');
    }
    return incident;
  }
}
