import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditSeverity } from 'src/common/enums/audit-severity.enum';

export enum AdminActivityStatus {
  SUCCESS = 'SUCCESS',
  WARNING = 'WARNING',
  DANGER = 'DANGER',
}

@Index('idx_admin_activity_created_at', ['createdAt'])
@Index('idx_admin_activity_actor_created', ['actorUserId', 'createdAt'])
@Index('idx_admin_activity_status_created', ['status', 'createdAt'])
@Index('idx_admin_activity_action_code_created', ['actionCode', 'createdAt'])
@Index('idx_admin_activity_severity_created', ['severity', 'createdAt'])
@Index('idx_admin_activity_target', ['targetType', 'targetId'])
@Entity('admin_activity_logs')
export class AdminActivityLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'actor_user_id', type: 'uuid' })
  actorUserId!: string;

  @Column({ name: 'actor_email', type: 'varchar', length: 255 })
  actorEmail!: string;

  /**
   * Nhãn HIỂN THỊ tiếng Việt, ghép ở runtime. Không dùng làm khoá tra cứu —
   * xem `actionCode`.
   */
  @Column({ type: 'varchar', length: 120 })
  action!: string;

  /** Khoá nghiệp vụ ổn định. Xem `audit/audit-action-codes.ts`. */
  @Column({ name: 'action_code', type: 'varchar', length: 80 })
  actionCode!: string;

  @Column({
    type: 'enum',
    enum: AuditSeverity,
    enumName: 'audit_severity',
    default: AuditSeverity.NORMAL,
  })
  severity!: AuditSeverity;

  @Column({ type: 'varchar', length: 120 })
  resource!: string;

  @Column({ type: 'varchar', length: 10 })
  method!: string;

  @Column({ type: 'varchar', length: 500 })
  path!: string;

  @Column({ type: 'varchar', length: 180 })
  handler!: string;

  @Column({ name: 'target_id', type: 'varchar', length: 100, nullable: true })
  targetId!: string | null;

  @Column({ name: 'target_type', type: 'varchar', length: 60, nullable: true })
  targetType!: string | null;

  /**
   * Danh sách id bị tác động khi thao tác KHÔNG có `:id` duy nhất trên route —
   * gán ticket hàng loạt, hết hạn booking theo lô. Thiếu cột này thì những thao
   * tác chạm nhiều bản ghi nhất lại là những thao tác không truy được đối tượng.
   */
  @Column({ name: 'affected_ids', type: 'jsonb', nullable: true })
  affectedIds!: string[] | null;

  @Column({ type: 'jsonb', nullable: true })
  changes!: Record<string, unknown> | null;

  /**
   * Số liệu nghiệp vụ có cấu trúc do `@AuditAction.extract` rút ra (số tiền, số dư
   * trước/sau, id bút toán). Tách khỏi `changes` vì `changes` là diff kỹ thuật
   * theo field, còn đây là dữ kiện để đọc hiểu và đối soát.
   */
  @Column({ name: 'business_data', type: 'jsonb', nullable: true })
  businessData!: Record<string, unknown> | null;

  /** Lý do do admin nhập. Bắt buộc với nhóm CRITICAL. */
  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  /** Khoá nối sang mọi bảng bị thao tác này tác động. */
  @Column({ name: 'correlation_id', type: 'uuid', nullable: true })
  correlationId!: string | null;

  @Column({ type: 'varchar', length: 20 })
  status!: AdminActivityStatus;

  @Column({ name: 'status_code', type: 'int', nullable: true })
  statusCode!: number | null;

  @Column({
    name: 'error_message',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  errorMessage!: string | null;

  @Column({ name: 'duration_ms', type: 'int' })
  durationMs!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
