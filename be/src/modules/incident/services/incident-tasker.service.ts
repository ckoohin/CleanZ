import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, IsNull, Repository } from 'typeorm';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { IncidentStatus } from 'src/common/enums/incident-status.enum';
import { IncidentDecisionResponseType } from 'src/common/enums/incident-decision-response-type.enum';
import { IncidentEvidencePurpose } from 'src/common/enums/incident-evidence-purpose.enum';
import { NotificationOutboxStatus } from 'src/common/enums/notification-outbox-status.enum';
import { IncidentEntity } from '../entity/incident.entity';
import { IncidentDecisionResponseEntity } from '../entity/incident-decision-response.entity';
import { IncidentDamageItemEntity } from '../entity/incident-damage-item.entity';
import { IncidentEvidenceEntity } from '../entity/incident-evidence.entity';
import { IncidentStatementEntity } from '../entity/incident-statement.entity';
import { NotificationOutboxEntity } from '../entity/notification-outbox.entity';
import { QueryIncidentDto } from '../dto/query-incident.dto';
import { SubmitStatementDto } from '../dto/submit-statement.dto';
import { UpsertIncidentDecisionResponseDto } from '../dto/upsert-incident-decision-response.dto';
import {
  IncidentDecisionResponseView,
  IncidentTaskerView,
  PaginatedIncidents,
  StatementView,
  toIncidentSummary,
  toDecisionResponseView,
  toTaskerView,
} from '../dto/incident-response.dto';
import { IncidentLogDimension } from 'src/common/enums/incident-log-dimension.enum';
import { IncidentStatusLogEntity } from '../entity/incident-status-log.entity';
import {
  INCIDENT_EVIDENCE_VISIBILITY,
  IncidentEvidenceLifecycleService,
} from './incident-evidence-lifecycle.service';
import { TaskerDebtService } from 'src/modules/wallet/tasker-debt.service';
import { TaskerDebtSource } from 'src/modules/wallet/entity/tasker-debt.entity';
import { vietnamNow, VN_NOW_SQL } from 'src/common/helpers/vietnam-time.helper';

@Injectable()
export class IncidentTaskerService {
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
    private readonly evidenceLifecycle: IncidentEvidenceLifecycleService,
    private readonly taskerDebt: TaskerDebtService,
  ) {}

  async uploadEvidence(
    userId: string,
    file: Express.Multer.File,
  ): Promise<{ id: string; url: string; fileType: string }> {
    return asyncHandleOperation(async () => {
      return this.evidenceLifecycle.uploadDetachedEvidence(userId, file, {
        purpose: IncidentEvidencePurpose.DECISION_RESPONSE,
        visibility: INCIDENT_EVIDENCE_VISIBILITY.ADMIN_TASKER,
      });
    }, 'Lỗi khi tải bằng chứng');
  }

  async listMine(
    taskerUserId: string,
    query: QueryIncidentDto,
  ): Promise<PaginatedIncidents> {
    return asyncHandleOperation(async () => {
      const page = query.page ?? 1;
      const limit = query.limit ?? 10;
      const qb = this.incidentRepo
        .createQueryBuilder('i')
        .innerJoin('i.tasker', 't')
        .innerJoin('t.user', 'u')
        .where('u.id = :uid', { uid: taskerUserId })
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

  async findOne(
    taskerUserId: string,
    incidentId: string,
  ): Promise<IncidentTaskerView> {
    return asyncHandleOperation(async () => {
      const incident = await this.loadOwned(incidentId, taskerUserId);
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
        'TASKER',
      );
      const statements = await this.statementRepo.find({
        where: { incident: { id: incidentId } },
        relations: ['submittedBy'],
        order: { createdAt: 'ASC' },
      });
      const byItem = new Map<string, IncidentEvidenceEntity[]>();
      for (const e of visibleEvidences) {
        const key = e.damageItem?.id;
        if (!key) continue;
        const arr = byItem.get(key) ?? [];
        arr.push(e);
        byItem.set(key, arr);
      }
      const outstandingDebt = await this.taskerDebt.getOutstandingForSource(
        this.dataSource.manager,
        TaskerDebtSource.INCIDENT_COMPENSATION,
        incidentId,
      );
      return toTaskerView(
        incident,
        items,
        byItem,
        statements,
        this.canSubmit(incident),
        outstandingDebt,
        await this.loadMyDecisionResponses(incidentId, taskerUserId),
      );
    }, 'Lỗi khi lấy chi tiết sự cố');
  }

  async submitStatement(
    taskerUserId: string,
    incidentId: string,
    dto: SubmitStatementDto,
  ): Promise<StatementView> {
    return asyncHandleOperation(
      () =>
        this.dataSource.transaction(async (manager) => {
          const incident = await this.lockOwnedIncident(
            manager,
            incidentId,
            taskerUserId,
          );
          if (
            incident.status !== IncidentStatus.REVIEWING &&
            incident.status !== IncidentStatus.AWAITING_RESPONSE
          ) {
            throw new ConflictException(
              'Chỉ giải trình khi sự cố đang được thẩm định',
            );
          }
          const dbNow = await this.getDatabaseNow(manager);
          if (
            incident.statementDueAt &&
            dbNow.getTime() > incident.statementDueAt.getTime()
          ) {
            throw new ConflictException('Đã quá thời hạn giải trình');
          }

          const evidenceRepo = manager.getRepository(IncidentEvidenceEntity);
          if (dto.evidenceIds?.length) {
            const owned = await evidenceRepo.find({
              where: {
                id: In(dto.evidenceIds),
                incident: IsNull(),
                isSoftDeleted: false,
              },
              relations: ['uploadedBy'],
            });
            const ownedIds = new Set(
              owned
                .filter((e) => e.uploadedBy?.id === taskerUserId)
                .map((e) => e.id),
            );
            if (ownedIds.size !== dto.evidenceIds.length) {
              throw new UnprocessableEntityException(
                'Bằng chứng không hợp lệ hoặc đã được sử dụng',
              );
            }
            await evidenceRepo
              .createQueryBuilder()
              .update()
              .set({
                incident: { id: incident.id },
                purpose: IncidentEvidencePurpose.TASKER_STATEMENT,
                visibility: INCIDENT_EVIDENCE_VISIBILITY.ADMIN_TASKER,
              })
              .whereInIds(dto.evidenceIds)
              .execute();
          }

          const statementRepo = manager.getRepository(IncidentStatementEntity);
          const statement = await statementRepo.save(
            statementRepo.create({
              incident: { id: incident.id },
              submittedBy: { id: taskerUserId },
              body: dto.body,
            }),
          );
          return {
            id: statement.id,
            submittedByUserId: taskerUserId,
            submittedByName: incident.tasker?.user?.fullName ?? null,
            submittedByRole: incident.tasker?.user?.role ?? null,
            body: statement.body,
            createdAt: statement.createdAt,
          };
        }),
      'Lỗi khi gửi giải trình',
    );
  }

  async upsertDecisionResponse(
    taskerUserId: string,
    incidentId: string,
    dto: UpsertIncidentDecisionResponseDto,
  ): Promise<IncidentDecisionResponseView> {
    return asyncHandleOperation(async () => {
      let responseId: string | null = null;

      await this.dataSource.transaction(async (manager) => {
        const incident = await this.lockOwnedIncident(
          manager,
          incidentId,
          taskerUserId,
        );
        this.assertDecisionResponseOpen(incident, dto.decisionVersion);

        const dbNow = await this.getDatabaseNow(manager);
        if (
          !incident.taskerResponseDeadline ||
          dbNow.getTime() > incident.taskerResponseDeadline.getTime()
        ) {
          // Hết hạn được suy ra từ deadline — không cần ghi trạng thái cửa sổ riêng.
          throw new ConflictException({
            code: 'TASKER_RESPONSE_WINDOW_EXPIRED',
            message: 'Đã quá thời hạn phản hồi quyết định',
          });
        }

        this.validateDecisionResponsePayload(dto);

        const evidences = await this.validateAndLockResponseEvidence(
          manager,
          dto.evidenceIds ?? [],
          incident.id,
          taskerUserId,
        );

        let response = await this.findDecisionResponseForUpdate(
          manager,
          incident.id,
          incident.decisionVersion,
          taskerUserId,
        );

        if (response?.reviewedAt) {
          throw new ConflictException({
            code: 'TASKER_RESPONSE_ALREADY_REVIEWED',
            message: 'Admin đã review phản hồi này',
          });
        }

        const activeEvidenceIds = response
          ? await this.getActiveResponseEvidenceIds(manager, response.id)
          : [];
        const changed = !response
          ? true
          : !this.isSameDecisionResponsePayload(
              response,
              dto,
              activeEvidenceIds,
            );

        if (!response) {
          response = manager
            .getRepository(IncidentDecisionResponseEntity)
            .create({
              incident: { id: incident.id } as never,
              decisionVersion: incident.decisionVersion,
              tasker: { id: taskerUserId } as never,
              responseType: dto.responseType,
              content: this.trimOptional(dto.content),
              responseRevision: 1,
              submittedAt: dbNow,
            });
        } else if (changed) {
          response.responseRevision += 1;
          response.responseType = dto.responseType;
          response.content = this.trimOptional(dto.content);
        }

        response = await manager
          .getRepository(IncidentDecisionResponseEntity)
          .save(response);
        responseId = response.id;

        if (changed) {
          await this.replaceActiveResponseEvidenceLinks(
            manager,
            response,
            evidences,
            incident,
          );
        }

        await this.ensureAdminTaskerResponseOutbox(
          manager,
          incident,
          response,
          taskerUserId,
        );
        await this.logDecisionResponseStatus(
          manager,
          incident.id,
          null,
          incident.status,
          taskerUserId,
          `Tasker gửi phản hồi quyết định (bản ${response.responseRevision})`,
        );
      });

      if (!responseId) {
        throw new NotFoundException({
          code: 'INCIDENT_NOT_FOUND',
          message: 'Không tìm thấy phản hồi',
        });
      }

      return this.getDecisionResponseView(responseId);
    }, 'Lỗi khi gửi phản hồi quyết định');
  }

  /**
   * Các bản phản hồi quyết định của CHÍNH Tasker này, kèm ảnh còn active của từng bản.
   *
   * Lọc theo `tasker.id = taskerUserId` chứ không lấy hết theo incident: cột `tasker_id`
   * của bảng phản hồi trỏ tới `users`, và một hồ sơ về nguyên tắc chỉ có một người phản
   * hồi — nhưng bộ lọc này là thứ bảo đảm điều đó, không phải giả định.
   *
   * Ảnh nạp bằng MỘT truy vấn cho mọi bản rồi gom theo `decisionResponse.id`; lặp gọi
   * repo cho từng bản là N+1 trên một màn hình chi tiết.
   */
  private async loadMyDecisionResponses(
    incidentId: string,
    taskerUserId: string,
  ): Promise<
    {
      response: IncidentDecisionResponseEntity;
      evidences: IncidentEvidenceEntity[];
    }[]
  > {
    const responses = await this.dataSource
      .getRepository(IncidentDecisionResponseEntity)
      .createQueryBuilder('response')
      .leftJoinAndSelect('response.incident', 'incident')
      .where('incident.id = :incidentId', { incidentId })
      .andWhere('response.tasker_id = :taskerUserId', { taskerUserId })
      .orderBy('response.decisionVersion', 'DESC')
      .addOrderBy('response.responseRevision', 'DESC')
      .getMany();
    if (responses.length === 0) return [];

    const evidences = await this.evidenceRepo.find({
      where: {
        decisionResponse: { id: In(responses.map((r) => r.id)) },
        isActiveForResponse: true,
        isSoftDeleted: false,
      },
      relations: ['decisionResponse'],
      order: { createdAt: 'ASC' },
    });
    const visible = this.evidenceLifecycle.filterForAudience(
      evidences,
      'TASKER',
    );
    const byResponse = new Map<string, IncidentEvidenceEntity[]>();
    for (const e of visible) {
      const key = e.decisionResponse?.id;
      if (!key) continue;
      byResponse.set(key, [...(byResponse.get(key) ?? []), e]);
    }
    return responses.map((response) => ({
      response,
      evidences: byResponse.get(response.id) ?? [],
    }));
  }

  private canSubmit(incident: IncidentEntity): boolean {
    if (
      incident.status !== IncidentStatus.REVIEWING &&
      incident.status !== IncidentStatus.AWAITING_RESPONSE
    ) {
      return false;
    }
    if (!incident.statementDueAt) return true;
    return vietnamNow().getTime() <= incident.statementDueAt.getTime();
  }

  private async lockOwnedIncident(
    manager: EntityManager,
    incidentId: string,
    taskerUserId: string,
  ): Promise<IncidentEntity> {
    const incident = await manager
      .getRepository(IncidentEntity)
      .createQueryBuilder('i')
      .innerJoinAndSelect('i.tasker', 't')
      .innerJoinAndSelect('t.user', 'u')
      .setLock('pessimistic_write', undefined, ['i'])
      .where('i.id = :id', { id: incidentId })
      .andWhere('u.id = :uid', { uid: taskerUserId })
      .getOne();

    if (!incident) {
      throw new NotFoundException({
        code: 'INCIDENT_NOT_FOUND',
        message: 'Không tìm thấy sự cố',
      });
    }
    return incident;
  }

  private assertDecisionResponseOpen(
    incident: IncidentEntity,
    decisionVersion: number,
  ): void {
    if (incident.decisionVersion !== decisionVersion) {
      throw new ConflictException({
        code: 'DECISION_VERSION_CONFLICT',
        message: 'Decision version đã thay đổi',
        details: {
          expectedDecisionVersion: decisionVersion,
          currentDecisionVersion: incident.decisionVersion,
        },
      });
    }

    // Một điều kiện duy nhất: sự cố đang chờ Tasker phản biện. Hạn nộp kiểm riêng ở caller.
    if (incident.status !== IncidentStatus.AWAITING_RESPONSE) {
      throw new ConflictException({
        code: 'TASKER_RESPONSE_NOT_OPEN',
        message: 'Cửa sổ phản hồi quyết định không mở',
      });
    }
  }

  private validateDecisionResponsePayload(
    dto: UpsertIncidentDecisionResponseDto,
  ): void {
    const content = this.trimOptional(dto.content);
    if (
      dto.responseType === IncidentDecisionResponseType.DISAGREE &&
      (!content || content.length < 10)
    ) {
      throw new UnprocessableEntityException({
        code: 'DECISION_RESPONSE_CONTENT_REQUIRED',
        message: 'DISAGREE phải có nội dung phản hồi ít nhất 10 ký tự',
      });
    }

    const evidenceIds = dto.evidenceIds ?? [];
    if (new Set(evidenceIds).size !== evidenceIds.length) {
      throw new UnprocessableEntityException({
        code: 'INVALID_RESPONSE_EVIDENCE',
        message: 'Evidence bị trùng trong request',
      });
    }
  }

  private async validateAndLockResponseEvidence(
    manager: EntityManager,
    evidenceIds: string[],
    incidentId: string,
    taskerUserId: string,
  ): Promise<IncidentEvidenceEntity[]> {
    if (!evidenceIds.length) return [];

    const evidences = await manager
      .getRepository(IncidentEvidenceEntity)
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.uploadedBy', 'uploadedBy')
      .leftJoinAndSelect('e.incident', 'incident')
      .leftJoinAndSelect('e.decisionResponse', 'decisionResponse')
      .setLock('pessimistic_write', undefined, ['e'])
      .where('e.id IN (:...ids)', { ids: evidenceIds })
      .getMany();

    const validIds = new Set<string>();
    for (const evidence of evidences) {
      const belongsToThisIncident =
        evidence.incident == null || evidence.incident.id === incidentId;
      const isOwnedByTasker = evidence.uploadedBy?.id === taskerUserId;
      const isAvailableForResponse =
        !evidence.isSoftDeleted &&
        (evidence.decisionResponse == null ||
          evidence.purpose === IncidentEvidencePurpose.DECISION_RESPONSE);

      if (belongsToThisIncident && isOwnedByTasker && isAvailableForResponse) {
        validIds.add(evidence.id);
      }
    }

    if (validIds.size !== evidenceIds.length) {
      throw new UnprocessableEntityException({
        code: 'INVALID_RESPONSE_EVIDENCE',
        message: 'Evidence phản hồi không hợp lệ',
      });
    }

    return evidences;
  }

  private findDecisionResponseForUpdate(
    manager: EntityManager,
    incidentId: string,
    decisionVersion: number,
    taskerUserId: string,
  ): Promise<IncidentDecisionResponseEntity | null> {
    return manager
      .getRepository(IncidentDecisionResponseEntity)
      .createQueryBuilder('response')
      .leftJoinAndSelect('response.incident', 'incident')
      .leftJoinAndSelect('response.tasker', 'tasker')
      .setLock('pessimistic_write', undefined, ['response'])
      .where('incident.id = :incidentId', { incidentId })
      .andWhere('response.decisionVersion = :decisionVersion', {
        decisionVersion,
      })
      .andWhere('tasker.id = :taskerUserId', { taskerUserId })
      .getOne();
  }

  private async getActiveResponseEvidenceIds(
    manager: EntityManager,
    responseId: string,
  ): Promise<string[]> {
    const evidences = await manager.getRepository(IncidentEvidenceEntity).find({
      where: {
        decisionResponse: { id: responseId },
        isActiveForResponse: true,
      },
      select: ['id'],
    });
    return evidences.map((evidence) => evidence.id).sort();
  }

  private isSameDecisionResponsePayload(
    response: IncidentDecisionResponseEntity,
    dto: UpsertIncidentDecisionResponseDto,
    activeEvidenceIds: string[],
  ): boolean {
    const nextEvidenceIds = [...(dto.evidenceIds ?? [])].sort();
    return (
      response.responseType === dto.responseType &&
      this.trimOptional(response.content) === this.trimOptional(dto.content) &&
      activeEvidenceIds.length === nextEvidenceIds.length &&
      activeEvidenceIds.every((id, index) => id === nextEvidenceIds[index])
    );
  }

  private async replaceActiveResponseEvidenceLinks(
    manager: EntityManager,
    response: IncidentDecisionResponseEntity,
    evidences: IncidentEvidenceEntity[],
    incident: IncidentEntity,
  ): Promise<void> {
    await this.evidenceLifecycle.replaceActiveResponseEvidenceLinks(
      manager,
      response,
      evidences,
      incident,
    );
  }

  private async ensureAdminTaskerResponseOutbox(
    manager: EntityManager,
    incident: IncidentEntity,
    response: IncidentDecisionResponseEntity,
    taskerUserId: string,
  ): Promise<void> {
    const adminUserId = incident.responsibilityDecidedByAdmin?.id;
    if (!adminUserId) return;

    await manager
      .getRepository(NotificationOutboxEntity)
      .createQueryBuilder()
      .insert()
      .values({
        eventType: 'INCIDENT_TASKER_DECISION_RESPONDED',
        refType: 'INCIDENT',
        refId: incident.id,
        recipient: { id: adminUserId } as never,
        decisionVersion: incident.decisionVersion,
        payload: {
          incidentId: incident.id,
          incidentCode: incident.incidentCode ?? null,
          decisionVersion: incident.decisionVersion,
          responseId: response.id,
          responseRevision: response.responseRevision,
          responseType: response.responseType,
        } as never,
        dedupeKey: this.buildTaskerResponseDedupeKey(
          incident.id,
          incident.decisionVersion,
          taskerUserId,
          response.responseRevision,
        ),
        status: NotificationOutboxStatus.PENDING,
        retryCount: 0,
      })
      .orIgnore()
      .execute();
  }

  private buildTaskerResponseDedupeKey(
    incidentId: string,
    decisionVersion: number,
    taskerUserId: string,
    responseRevision: number,
  ): string {
    return `incident:${incidentId}:decision:${decisionVersion}:tasker-response:${taskerUserId}:${responseRevision}`;
  }

  private async logDecisionResponseStatus(
    manager: EntityManager,
    incidentId: string,
    oldValue: string | null,
    newValue: string,
    changedByUserId: string,
    reason: string,
  ): Promise<void> {
    await manager.getRepository(IncidentStatusLogEntity).save(
      manager.getRepository(IncidentStatusLogEntity).create({
        incident: { id: incidentId },
        dimension: IncidentLogDimension.STATUS,
        oldValue,
        newValue,
        changedBy: { id: changedByUserId },
        reason,
      }),
    );
  }

  /**
   * `VN_NOW_SQL`, không phải `now()` trần — và ở đây điều đó là BẮT BUỘC để hai phía nhìn
   * cùng một cửa sổ thời gian.
   *
   * Mốc này gác hạn giải trình (`statementDueAt`) và hạn phản hồi quyết định
   * (`taskerResponseDeadline`) — đúng hai cột mà `IncidentDecisionService` cũng đọc để
   * quyết định Admin đã được chốt hay chưa. Hai service so cùng một hạn bằng hai đồng hồ
   * lệch nhau 7 tiếng thì sinh ra khoảng thời gian mà Tasker bị từ chối phản hồi trong khi
   * Admin vẫn chưa được chốt (hoặc ngược lại) — không bên nào làm gì được, và không có lỗi
   * nào chỉ ra vì sao.
   */
  private async getDatabaseNow(manager: EntityManager): Promise<Date> {
    const rows = await manager.query(`SELECT ${VN_NOW_SQL} AS now`);
    return new Date(rows[0].now);
  }

  private async getDecisionResponseView(
    responseId: string,
  ): Promise<IncidentDecisionResponseView> {
    const response = await this.dataSource
      .getRepository(IncidentDecisionResponseEntity)
      .findOne({
        where: { id: responseId },
        relations: ['incident'],
      });
    if (!response) {
      throw new NotFoundException({
        code: 'INCIDENT_NOT_FOUND',
        message: 'Không tìm thấy phản hồi',
      });
    }
    const evidences = await this.evidenceRepo.find({
      where: {
        decisionResponse: { id: response.id },
        isActiveForResponse: true,
        isSoftDeleted: false,
      },
      order: { createdAt: 'ASC' },
    });
    return toDecisionResponseView(
      response,
      this.evidenceLifecycle.filterForAudience(evidences, 'TASKER'),
      !response.reviewedAt,
    );
  }

  private trimOptional(value?: string | null): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private async loadOwned(
    incidentId: string,
    taskerUserId: string,
  ): Promise<IncidentEntity> {
    const incident = await this.incidentRepo
      .createQueryBuilder('i')
      .innerJoinAndSelect('i.tasker', 't')
      .innerJoinAndSelect('t.user', 'u')
      .where('i.id = :id', { id: incidentId })
      .andWhere('u.id = :uid', { uid: taskerUserId })
      .getOne();
    if (!incident) throw new NotFoundException('Không tìm thấy sự cố');
    return incident;
  }
}
