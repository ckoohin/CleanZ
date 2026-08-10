import { Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { AuditSeverity } from 'src/common/enums/audit-severity.enum';
import { AdminActivityStatus } from '../entities/admin-activity-log.entity';
import { AuditOutboxEntity } from '../entities/audit-outbox.entity';
import { RecordAdminActivityInput } from '../services/admin-activity.service';
import { sanitizeAuditValue } from '../utils/admin-activity-sanitizer';
import { AUDIT_ACTION_LABELS } from './audit-action-labels';
import { AuditContext } from './audit-context';

export interface TransactionalAuditInput {
  actionCode: string;
  severity: AuditSeverity;
  targetType: string;
  targetId: string | null;
  reason?: string | null;
  businessData?: Record<string, unknown> | null;
}

/**
 * Ghi nhật ký cho các lệnh CHUYỂN TIỀN THẬT, ngay bên trong transaction nghiệp vụ.
 *
 * Interceptor chạy ở tầng HTTP nên luôn nằm NGOÀI transaction của service: lúc nó
 * ghi log thì `COMMIT` đã xong từ trước. Cửa sổ giữa hai thời điểm đó nhỏ, nhưng
 * hậu quả khi rơi vào đúng cửa sổ ấy thì không nhỏ chút nào — tiền đã rời ví và
 * không có dòng nào ghi lại ai ra lệnh. Với bốn lệnh chuyển tiền thật, log phải
 * commit cùng bút toán: cùng sống hoặc cùng chết.
 *
 * Vì sao vẫn qua outbox mà không ghi thẳng `admin_activity_logs`? Vì ghi thẳng
 * đòi hỏi dựng đủ nội dung log ngay trong transaction đang giữ khoá ví
 * (`pessimistic_write`) — kéo dài thời gian giữ khoá vì một việc không thuộc
 * nghiệp vụ. INSERT một dòng payload thì gần như tức thời.
 */
@Injectable()
export class AuditRecorder {
  private readonly logger = new Logger(AuditRecorder.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Enqueue bằng chính `EntityManager` của transaction đang chạy — đó là toàn bộ
   * điểm mấu chốt: rollback nghiệp vụ thì dòng outbox biến mất theo, không để lại
   * nhật ký về một việc chưa từng xảy ra.
   *
   * Ngoài ngữ cảnh admin (cron, worker, hoặc chính người dùng thao tác) thì bỏ
   * qua — đây là nhật ký THAO TÁC ADMIN, không phải nhật ký mọi thay đổi dữ liệu.
   */
  async enqueueInTransaction(
    manager: EntityManager,
    input: TransactionalAuditInput,
  ): Promise<void> {
    const context = AuditContext.current();
    if (!context) return;

    const payload: RecordAdminActivityInput = {
      actorUserId: context.actorUserId,
      actorEmail: context.actorEmail,
      // Nhãn tra từ registry như đường interceptor. Trước đây chỗ này ghép thẳng
      // mã vào nhãn, nên đúng nhóm lệnh chuyển tiền — nhóm được đọc kỹ nhất —
      // lại hiện `FINANCE.WALLET_MANUAL_ADJUSTMENT tài chính` trên giao diện.
      action: (
        AUDIT_ACTION_LABELS[input.actionCode] ??
        `${input.actionCode} ${context.resource}`
      ).slice(0, 120),
      actionCode: input.actionCode,
      severity: input.severity,
      resource: context.resource,
      method: context.method,
      path: context.path,
      handler: context.handler,
      targetId: input.targetId,
      targetType: input.targetType,
      affectedIds: null,
      changes: null,
      businessData: input.businessData
        ? (sanitizeAuditValue(input.businessData) as Record<string, unknown>)
        : null,
      reason: input.reason?.trim().slice(0, 2000) ?? null,
      correlationId: context.correlationId,
      status: AdminActivityStatus.SUCCESS,
      statusCode: 200,
      errorMessage: null,
      durationMs: Date.now() - context.startedAt,
    };

    const outboxRepo = manager.getRepository(AuditOutboxEntity);
    await outboxRepo.save(
      outboxRepo.create({ correlationId: context.correlationId, payload }),
    );

    AuditContext.markRecordedInTransaction();
  }

  /**
   * Đường của interceptor: enqueue ngoài transaction nghiệp vụ, sau khi handler
   * đã xong. Không ném lỗi ra ngoài — tới đây thì response phần lớn đã gửi đi,
   * ném tiếp chỉ tạo tiếng ồn chứ không cứu được dòng log.
   */
  async enqueueDetached(
    payload: RecordAdminActivityInput & { correlationId: string },
  ): Promise<void> {
    try {
      const outboxRepo = this.dataSource.getRepository(AuditOutboxEntity);
      await outboxRepo.save(
        outboxRepo.create({ correlationId: payload.correlationId, payload }),
      );
    } catch (error: unknown) {
      this.logger.error(
        'Không thể đưa nhật ký admin vào outbox',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
