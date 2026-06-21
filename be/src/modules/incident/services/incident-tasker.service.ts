import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { UploadService } from 'src/modules/upload/upload.service';
import { IncidentStatus } from 'src/common/enums/incident-status.enum';
import { IncidentEntity } from '../entity/incident.entity';
import { IncidentDamageItemEntity } from '../entity/incident-damage-item.entity';
import { IncidentEvidenceEntity } from '../entity/incident-evidence.entity';
import { IncidentStatementEntity } from '../entity/incident-statement.entity';
import { QueryIncidentDto } from '../dto/query-incident.dto';
import { SubmitStatementDto } from '../dto/submit-statement.dto';
import {
  IncidentTaskerView,
  PaginatedIncidents,
  StatementView,
  toIncidentSummary,
  toTaskerView,
} from '../dto/incident-response.dto';

@Injectable()
export class IncidentTaskerService {
  constructor(
    @InjectRepository(IncidentEntity)
    private readonly incidentRepo: Repository<IncidentEntity>,
    @InjectRepository(IncidentDamageItemEntity)
    private readonly itemRepo: Repository<IncidentDamageItemEntity>,
    @InjectRepository(IncidentEvidenceEntity)
    private readonly evidenceRepo: Repository<IncidentEvidenceEntity>,
    @InjectRepository(IncidentStatementEntity)
    private readonly statementRepo: Repository<IncidentStatementEntity>,
    private readonly uploadService: UploadService,
  ) {}

  async uploadEvidence(
    userId: string,
    file: Express.Multer.File,
  ): Promise<{ id: string; url: string; fileType: string }> {
    return asyncHandleOperation(async () => {
      const uploaded = await this.uploadService.uploadImage(file);
      const evidence = await this.evidenceRepo.save(
        this.evidenceRepo.create({
          incident: null,
          damageItem: null,
          fileUrl: uploaded.url,
          fileType: 'IMAGE',
          uploadedBy: { id: userId },
        }),
      );
      return { id: evidence.id, url: evidence.fileUrl, fileType: 'IMAGE' };
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
        where: { incident: { id: incidentId } },
        relations: ['damageItem'],
      });
      const statements = await this.statementRepo.find({
        where: { incident: { id: incidentId } },
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
      return toTaskerView(
        incident,
        items,
        byItem,
        statements,
        this.canSubmit(incident),
      );
    }, 'Lỗi khi lấy chi tiết sự cố');
  }

  async submitStatement(
    taskerUserId: string,
    incidentId: string,
    dto: SubmitStatementDto,
  ): Promise<StatementView> {
    return asyncHandleOperation(async () => {
      const incident = await this.loadOwned(incidentId, taskerUserId);
      if (!this.canSubmit(incident)) {
        if (incident.status !== IncidentStatus.INVESTIGATING) {
          throw new ConflictException(
            'Chỉ giải trình khi sự cố đang được thẩm định',
          );
        }
        throw new ConflictException('Đã quá thời hạn giải trình');
      }

      if (dto.evidenceIds?.length) {
        const owned = await this.evidenceRepo.find({
          where: {
            id: In(dto.evidenceIds),
            incident: IsNull(),
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
        await this.evidenceRepo
          .createQueryBuilder()
          .update()
          .set({ incident: { id: incident.id } })
          .whereInIds(dto.evidenceIds)
          .execute();
      }

      const statement = await this.statementRepo.save(
        this.statementRepo.create({
          incident: { id: incident.id },
          submittedBy: { id: taskerUserId },
          body: dto.body,
        }),
      );
      return {
        id: statement.id,
        submittedByUserId: taskerUserId,
        body: statement.body,
        createdAt: statement.createdAt,
      };
    }, 'Lỗi khi gửi giải trình');
  }

  private canSubmit(incident: IncidentEntity): boolean {
    if (incident.status !== IncidentStatus.INVESTIGATING) return false;
    if (!incident.statementDueAt) return true;
    return Date.now() <= incident.statementDueAt.getTime();
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
