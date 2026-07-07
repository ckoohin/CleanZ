import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { NotificationOutboxStatus } from 'src/common/enums/notification-outbox-status.enum';
import { UserEntity } from 'src/modules/users/entities/user.entity';

@Entity('notification_outbox')
@Index('idx_notification_outbox_status_retry', ['status', 'nextRetryAt'])
@Index('idx_notification_outbox_ref', ['refType', 'refId'])
@Index('uq_notification_outbox_dedupe_key', ['dedupeKey'], { unique: true })
export class NotificationOutboxEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'event_type', type: 'varchar', length: 80 })
  eventType!: string;

  @Column({ name: 'ref_type', type: 'varchar', length: 40 })
  refType!: string;

  @Column({ name: 'ref_id', type: 'uuid' })
  refId!: string;

  @ManyToOne(() => UserEntity, {
    nullable: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'recipient_user_id' })
  recipient!: UserEntity;

  @Column({ name: 'decision_version', type: 'int', nullable: true })
  decisionVersion?: number | null;

  @Column({ type: 'jsonb' })
  payload!: Record<string, unknown>;

  @Column({ name: 'dedupe_key', type: 'varchar', length: 180 })
  dedupeKey!: string;

  @Column({
    type: 'enum',
    enum: NotificationOutboxStatus,
    enumName: 'notification_outbox_status',
    default: NotificationOutboxStatus.PENDING,
  })
  status!: NotificationOutboxStatus;

  @Column({ name: 'retry_count', type: 'int', default: 0 })
  retryCount!: number;

  @Column({ name: 'next_retry_at', type: 'timestamp', nullable: true })
  nextRetryAt?: Date | null;

  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt?: Date | null;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
