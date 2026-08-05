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
import {
  isActiveIncidentPerBookingConflict,
  isUniqueViolation,
} from '../domain/incident-conflict.helpers';
import { IncidentCodeService } from './incident-code.service';
import { IncidentConfigService } from './incident-config.service';
import { IncidentStateService } from './incident-state.service';
import { IncidentNotifier } from './incident-notifier.service';
import { IncidentDepositHoldService } from './incident-deposit-hold.service';
import {
  INCIDENT_EVIDENCE_VISIBILITY,
  IncidentEvidenceLifecycleService,
} from './incident-evidence-lifecycle.service';

const WITHDRAWABLE_STATUSES = [
  IncidentStatus.REPORTED,
  IncidentStatus.REVIEWING,
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
    private readonly state: IncidentStateService,
    private readonly evidenceLifecycle: IncidentEvidenceLifecycleService,
    private readonly notifier: IncidentNotifier,
    private readonly depositHold: IncidentDepositHoldService,
  ) {}

  /**
   * Tham số cấu hình mà FORM BÁO CÁO của khách cần để chặn trước.
   *
   * Cố ý KHÔNG trả `getEffectiveConfig()` như phía admin: bộ đó chứa ma trận
   * SLA, ngưỡng cảnh cáo gian lận, số dư tối thiểu ví hệ thống — chính sách vận
   * hành nội bộ, không phải thứ khách được biết. Ở đây chỉ phơi đúng con số mà
   * nếu thiếu thì khách tải xong hết ảnh mới bị từ chối.
   */
  async getReportConfig(): Promise<{ claimMax: number }> {
    return { claimMax: await this.config.getClaimMaxAmount() };
  }

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
        // Khoá hồ sơ TRONG transaction. `loadOwned` dùng repository riêng nên đọc ngoài
        // transaction, không khoá: khách bấm gửi đúng lúc Admin bấm chốt thì cả hai cùng
        // thấy REVIEWING, và bản ghi hạng mục bị kéo về PENDING SAU khi quyết định đã chốt
        // — đúng thứ `validateFinal` sinh ra để ngăn, mà giờ không ai kiểm lại nữa.
        const incident = await manager
          .getRepository(IncidentEntity)
          .createQueryBuilder('i')
          .innerJoin('i.customer', 'c')
          .innerJoin('c.user', 'u')
          .setLock('pessimistic_write', undefined, ['i'])
          .where('i.id = :id', { id: incidentId })
          .andWhere('u.id = :uid', { uid: customerUserId })
          .getOne();
        if (!incident) {
          throw new NotFoundException('Không tìm thấy sự cố');
        }
        if (incident.status !== IncidentStatus.REVIEWING) {
          throw new ConflictException({
            code: 'INCIDENT_NOT_EDITABLE',
            message: 'Chỉ bổ sung bằng chứng khi sự cố đang được thẩm định',
          });
        }
        // Khoá luôn hạng mục sắp sửa: `saveDecision` cũng khoá bảng này, nên hai bên xếp
        // hàng thay vì cùng ghi đè `verificationStatus`.
        const item = await manager
          .getRepository(IncidentDamageItemEntity)
          .createQueryBuilder('item')
          .setLock('pessimistic_write', undefined, ['item'])
          .where('item.id = :itemId', { itemId })
          .andWhere('item.incident_id = :incidentId', { incidentId })
          .getOne();
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
        // Cùng mã lỗi với nhánh va chạm unique index: client không nên phải phân biệt
        // "ai chặn" — pha kiểm này hay ràng buộc DB — cho cùng một tình huống.
        throw new ConflictException({
          code: 'INCIDENT_ALREADY_ACTIVE_FOR_BOOKING',
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
        totalClaimed += item.claimedAmount;
      }
      // Trần áp cho TỔNG, không phải từng hạng mục: nếu chỉ chặn từng hạng mục thì khai
      // nhiều dòng là vượt trần tuỳ ý, và `claimedAmount` còn quyết định số tiền tạm giữ
      // ví Tasker lúc tiếp nhận — khai khống sẽ đóng băng toàn bộ ví của họ.
      if (totalClaimed > claimMax) {
        throw new UnprocessableEntityException(
          `Tổng số tiền yêu cầu vượt trần cho phép (${claimMax} VND)`,
        );
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
        // Một điều kiện duy nhất: chỉ rút khi chưa gửi quyết định cho Tasker và chưa chốt.
        // (Trước đây phải kiểm chéo 3 cột status/decisionStatus/compensationStatus.)
        if (!WITHDRAWABLE_STATUSES.includes(incident.status)) {
          throw new ConflictException({
            code: 'INCIDENT_NOT_WITHDRAWABLE',
            message:
              'Không thể rút sau khi quyết định đã được gửi Tasker hoặc đã chốt',
          });
        }

        const from = incident.status;
        // Rút báo cáo cũng phải khai báo trong bảng chuyển trạng thái, không gán thẳng —
        // để `WITHDRAWABLE_STATUSES` và bảng trạng thái không thể lệch nhau trong im lặng.
        this.state.assertStatusTransition(from, IncidentStatus.CLOSED);
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

  /**
   * Pha kiểm trùng ở trên là check-then-act nên vẫn thua hai request song song; chốt chặn
   * THẬT là partial unique index `uq_inc_active_per_booking`. Ở đây chỉ dịch va chạm đó
   * thành 409 kèm id hồ sơ đang mở để client điều hướng tới đúng chỗ.
   */
  private async createWithConflictGuard<T>(
    bookingId: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (isActiveIncidentPerBookingConflict(err)) {
        const existing = await this.incidentRepo
          .createQueryBuilder('i')
          .where('i.booking_id = :bid', { bid: bookingId })
          .andWhere('i.status != :closed', { closed: IncidentStatus.CLOSED })
          .getOne();
        throw new ConflictException({
          code: 'INCIDENT_ALREADY_ACTIVE_FOR_BOOKING',
          message: 'Đơn này đã có sự cố đang xử lý',
          incidentId: existing?.id,
        });
      }
      if (isUniqueViolation(err)) {
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
