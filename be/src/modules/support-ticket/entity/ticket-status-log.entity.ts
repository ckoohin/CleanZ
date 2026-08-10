import { AuditActorType } from 'src/common/enums/audit-actor-type.enum';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SupportTicketStatus } from 'src/common/enums/support-ticket-status.enum';
import { UserEntity } from 'src/modules/users/entities/user.entity';
import { SupportTicketEntity } from './support-ticket.entity';

@Entity('ticket_status_logs')
@Index('idx_tsl_ticket', ['ticket', 'createdAt'])
export class TicketStatusLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => SupportTicketEntity, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'ticket_id' })
  ticket!: SupportTicketEntity;

  @Column({
    name: 'old_status',
    type: 'enum',
    enum: SupportTicketStatus,
    enumName: 'support_ticket_status',
    nullable: true,
  })
  oldStatus?: SupportTicketStatus | null;

  @Column({
    name: 'new_status',
    type: 'enum',
    enum: SupportTicketStatus,
    enumName: 'support_ticket_status',
  })
  newStatus!: SupportTicketStatus;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'changed_by_user_id' })
  changedBy?: UserEntity | null;

  @Column({ type: 'text', nullable: true })
  note?: string | null;

  /**
   * Ai gây ra bản ghi này. Được đóng dấu tự động bởi `AuditCorrelationSubscriber`.
   * NULL với bản ghi tạo trước khi có cột này — không backfill vì suy ngược sẽ
   * là bịa dữ liệu.
   */
  @Column({
    name: 'actor_type',
    type: 'enum',
    enum: AuditActorType,
    enumName: 'audit_actor_type',
    nullable: true,
  })
  actorType?: AuditActorType | null;

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
