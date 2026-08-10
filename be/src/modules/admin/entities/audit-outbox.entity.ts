import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditOutboxStatus } from 'src/common/enums/audit-outbox-status.enum';
import type { RecordAdminActivityInput } from '../services/admin-activity.service';

@Entity('audit_outbox')
@Index('idx_audit_outbox_due', ['status', 'nextRetryAt'])
@Index('idx_audit_outbox_correlation', ['correlationId'])
export class AuditOutboxEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'correlation_id', type: 'uuid' })
  correlationId!: string;

  /** Nội dung đã sẵn sàng ghi vào `admin_activity_logs`, không cần diễn giải lại. */
  @Column({ type: 'jsonb' })
  payload!: RecordAdminActivityInput;

  /**
   * Thời điểm THAO TÁC xảy ra — sẽ thành `created_at` của dòng nhật ký. Không
   * được để worker tự lấy `now()`: giờ ghi của worker lệch ít nhất một chu kỳ
   * quét so với giờ thao tác, và lệch tới vài phút nếu bản ghi phải retry.
   */
  @Column({
    name: 'occurred_at',
    type: 'timestamp',
    default: () => 'now()',
  })
  occurredAt!: Date;

  @Column({
    type: 'enum',
    enum: AuditOutboxStatus,
    enumName: 'audit_outbox_status',
    default: AuditOutboxStatus.PENDING,
  })
  status!: AuditOutboxStatus;

  @Column({ name: 'retry_count', type: 'int', default: 0 })
  retryCount!: number;

  @Column({ name: 'next_retry_at', type: 'timestamp', nullable: true })
  nextRetryAt?: Date | null;

  @Column({ name: 'applied_at', type: 'timestamp', nullable: true })
  appliedAt?: Date | null;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
