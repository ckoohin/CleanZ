import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BanType } from 'src/common/enums/ban-type.enum';
import { TaskerEntity } from './tasker.entity';

/**
 * Lịch sử kỷ luật của tasker — mỗi lần khóa (ban) tạo 1 record. Dùng cho
 * getPenalties (màn Tasker360View). Không xóa khi mở khóa để giữ lịch sử.
 */
@Entity('tasker_penalties')
@Index('idx_tasker_penalties_tasker', ['tasker'])
export class TaskerPenaltyEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => TaskerEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'tasker_id',
    foreignKeyConstraintName: 'fk_tasker_penalties_tasker',
  })
  tasker!: TaskerEntity;

  @Column({ name: 'type', type: 'enum', enum: BanType, enumName: 'ban_type' })
  type!: BanType;

  @Column({ name: 'reason', type: 'text' })
  reason!: string;

  /** Hạn mở khóa (chỉ với TEMPORARY); NULL với PERMANENT. */
  @Column({ name: 'ban_ends_at', type: 'timestamp', nullable: true })
  banEndsAt?: Date | null;

  /** Admin (users.id) thực hiện khóa. */
  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string | null;

  /**
   * Thao tác admin nào sinh ra bản ghi này. NULL = không phát sinh từ admin
   * (người dùng tự thao tác, hoặc cron/worker chạy nền). Được đóng dấu tự động
   * bởi `AuditCorrelationSubscriber`.
   */
  @Column({ name: 'audit_correlation_id', type: 'uuid', nullable: true })
  auditCorrelationId?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
