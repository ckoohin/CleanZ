import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/modules/users/entities/user.entity';
import { Brackets, In, Repository, SelectQueryBuilder } from 'typeorm';
import { AdminActivityQueryDto } from '../dto/admin-activity-query.dto';
import { buildCsv } from '../audit/audit-csv.helper';
import {
  AdminActivityLogEntity,
  AdminActivityStatus,
} from '../entities/admin-activity-log.entity';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Trần cứng cho một lần xuất CSV — xem doc-comment của `exportCsv`. */
const EXPORT_ROW_LIMIT = 20_000;

/**
 * `actionCode` và `severity` là BẮT BUỘC: nếu để tuỳ chọn thì mọi chỗ ghi tay đều
 * lặng lẽ rơi về mặc định, và cột phân loại quan trọng nhất của nhật ký sẽ toàn
 * giá trị mặc định. Các cột mô tả bổ sung thì để tuỳ chọn, vì phần lớn thao tác
 * không có gì để điền.
 */
export type RecordAdminActivityInput = Omit<
  AdminActivityLogEntity,
  | 'id'
  | 'createdAt'
  | 'targetType'
  | 'affectedIds'
  | 'businessData'
  | 'reason'
  | 'correlationId'
> &
  Partial<
    Pick<
      AdminActivityLogEntity,
      'targetType' | 'affectedIds' | 'businessData' | 'reason' | 'correlationId'
    >
  >;

@Injectable()
export class AdminActivityService {
  constructor(
    @InjectRepository(AdminActivityLogEntity)
    private readonly activityRepo: Repository<AdminActivityLogEntity>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async record(input: RecordAdminActivityInput): Promise<void> {
    const activity = this.activityRepo.create();
    Object.assign(activity, input);
    await this.activityRepo.save(activity);
  }

  async findAll(query: AdminActivityQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const listQuery = this.applyFilters(
      this.activityRepo
        .createQueryBuilder('activity')
        .leftJoin('users', 'actor', 'actor.id = activity.actor_user_id'),
      query,
      true,
    )
      .orderBy('activity.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [activities, total] = await listQuery.getManyAndCount();
    const actorIds = [...new Set(activities.map((item) => item.actorUserId))];
    const actors = actorIds.length
      ? await this.userRepo.find({
          where: { id: In(actorIds) },
          withDeleted: true,
        })
      : [];
    const actorNames = new Map(
      actors.map((actor) => [actor.id, actor.fullName]),
    );

    const statsQuery = this.applyFilters(
      this.activityRepo
        .createQueryBuilder('activity')
        .leftJoin('users', 'actor', 'actor.id = activity.actor_user_id'),
      query,
      false,
    );
    const rawStats = await statsQuery
      .select('COUNT(*)', 'total')
      .addSelect(
        `COUNT(*) FILTER (WHERE activity.status = '${AdminActivityStatus.SUCCESS}')`,
        'success',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE activity.status = '${AdminActivityStatus.WARNING}')`,
        'warning',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE activity.status = '${AdminActivityStatus.DANGER}')`,
        'danger',
      )
      .getRawOne<{
        total: string;
        success: string;
        warning: string;
        danger: string;
      }>();

    return {
      data: activities.map((activity) => ({
        id: activity.id,
        actor: actorNames.get(activity.actorUserId) ?? activity.actorEmail,
        actorEmail: activity.actorEmail,
        role: 'ADMIN' as const,
        action: activity.action,
        actionCode: activity.actionCode,
        severity: activity.severity,
        reason: activity.reason,
        correlationId: activity.correlationId,
        resource: activity.resource,
        targetLabel: this.toClientTargetLabel(activity.changes),
        targetType: activity.targetType,
        affectedCount: activity.affectedIds?.length ?? null,
        // `businessData` do extractor tự soạn nên đã là dữ kiện nghiệp vụ chọn lọc,
        // nhưng vẫn đi qua bộ che tham chiếu như `changes` — không có lý do gì để
        // id nội bộ lọt ra màn hình ở đường này mà bị chặn ở đường kia.
        businessData: this.hideInternalReferences(activity.businessData),
        changes: this.toClientChanges(activity.changes),
        status: activity.status,
        errorMessage: activity.errorMessage,
        timestamp: activity.createdAt,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        total: Number(rawStats?.total ?? 0),
        success: Number(rawStats?.success ?? 0),
        warning: Number(rawStats?.warning ?? 0),
        danger: Number(rawStats?.danger ?? 0),
      },
    };
  }

  /**
   * Xuất CSV phục vụ điều tra nội bộ.
   *
   * Không phân trang nhưng có trần cứng: một lần xuất là một lần dựng toàn bộ
   * chuỗi trong RAM, nên không thể để nó chạy theo kích thước bảng. Ai cần nhiều
   * hơn thì thu hẹp khoảng ngày — đó cũng là cách điều tra đúng.
   *
   * `changes` và `businessData` đi qua đúng bộ che dùng cho giao diện: file này
   * rời khỏi hệ thống, nên không được lỏng hơn màn hình.
   */
  async exportCsv(query: AdminActivityQueryDto): Promise<string> {
    const rows = await this.applyFilters(
      this.activityRepo
        .createQueryBuilder('activity')
        .leftJoin('users', 'actor', 'actor.id = activity.actor_user_id'),
      query,
      true,
    )
      .orderBy('activity.createdAt', 'DESC')
      .take(EXPORT_ROW_LIMIT)
      .getMany();

    return buildCsv(
      [
        'Thời điểm',
        'Mã hành động',
        'Mức độ',
        'Kết quả',
        'Admin',
        'Hành động',
        'Đối tượng',
        'Mã đối tượng',
        'Lý do',
        'Mã truy vết',
        'Số liệu nghiệp vụ',
        'Thay đổi',
        'Lỗi',
      ],
      rows.map((activity) => [
        activity.createdAt,
        activity.actionCode,
        activity.severity,
        activity.status,
        activity.actorEmail,
        activity.action,
        activity.targetType,
        activity.targetId,
        activity.reason,
        activity.correlationId,
        this.hideInternalReferences(activity.businessData),
        this.toClientChanges(activity.changes),
        activity.errorMessage,
      ]),
    );
  }

  private applyFilters(
    queryBuilder: SelectQueryBuilder<AdminActivityLogEntity>,
    query: AdminActivityQueryDto,
    includeStatus: boolean,
  ): SelectQueryBuilder<AdminActivityLogEntity> {
    if (includeStatus && query.status) {
      queryBuilder.andWhere('activity.status = :status', {
        status: query.status,
      });
    }

    if (query.severity) {
      queryBuilder.andWhere('activity.severity = :severity', {
        severity: query.severity,
      });
    }
    if (query.actionCode) {
      queryBuilder.andWhere('activity.action_code = :actionCode', {
        actionCode: query.actionCode,
      });
    }
    if (query.correlationId) {
      queryBuilder.andWhere('activity.correlation_id = :correlationId', {
        correlationId: query.correlationId,
      });
    }

    const keyword = query.keyword?.trim();
    if (keyword) {
      queryBuilder.andWhere(
        new Brackets((where) => {
          where
            .where('activity.action ILIKE :keyword')
            .orWhere('activity.resource ILIKE :keyword')
            .orWhere('activity.path ILIKE :keyword')
            .orWhere('activity.actor_email ILIKE :keyword')
            .orWhere('actor.full_name ILIKE :keyword');
        }),
        { keyword: `%${keyword}%` },
      );
    }

    if (query.from) {
      queryBuilder.andWhere('activity.created_at >= :from', {
        from: new Date(query.from),
      });
    }
    if (query.to) {
      queryBuilder.andWhere('activity.created_at <= :to', {
        to: new Date(query.to),
      });
    }

    return queryBuilder;
  }

  private toClientChanges(
    changes: Record<string, unknown> | null,
  ): Record<string, unknown> | null {
    if (!changes) return null;
    if ('fields' in changes) {
      return {
        fields: this.hideInternalReferences(changes.fields),
        attempted: changes.attempted === true,
      };
    }
    return 'body' in changes
      ? { body: this.hideInternalReferences(changes.body) }
      : null;
  }

  private toClientTargetLabel(
    changes: Record<string, unknown> | null,
  ): string | null {
    const targetLabel = changes?.targetLabel;
    return typeof targetLabel === 'string' && !UUID_PATTERN.test(targetLabel)
      ? targetLabel
      : null;
  }

  private hideInternalReferences(value: unknown): unknown {
    if (typeof value === 'string') {
      return UUID_PATTERN.test(value) ? '[REFERENCE]' : value;
    }
    if (Array.isArray(value)) {
      return value.map((item) => this.hideInternalReferences(item));
    }
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, item]) => [
          key,
          this.hideInternalReferences(item),
        ]),
      );
    }
    return value;
  }
}
