import { AuditActorType } from 'src/common/enums/audit-actor-type.enum';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BookingStatus } from 'src/common/enums/booking-status.enum';
import { CancelledBy } from 'src/common/enums/cancelled-by.enum';
import { UserEntity } from 'src/modules/users/entities/user.entity';
import { PaymentEntity } from 'src/modules/payment/entity/payment.entity';
import { BookingEntity } from './booking.entity';

@Entity('booking_status_logs')
export class BookingStatusLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => BookingEntity, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'booking_id' })
  booking!: BookingEntity;

  @Column({
    name: 'old_status',
    type: 'enum',
    enum: BookingStatus,
    enumName: 'booking_status',
    nullable: true,
  })
  oldStatus?: BookingStatus | null;

  @Column({
    name: 'new_status',
    type: 'enum',
    enum: BookingStatus,
    enumName: 'booking_status',
  })
  newStatus!: BookingStatus;

  @ManyToOne(() => UserEntity, {
    nullable: true,
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'changed_by_user_id' })
  changedByUser?: UserEntity | null;

  @Column({ type: 'text', nullable: true })
  note?: string | null;

  @Column({
    name: 'cancelled_by',
    type: 'enum',
    enum: CancelledBy,
    enumName: 'cancelled_by',
    nullable: true,
  })
  cancelledBy?: CancelledBy | null;

  @ManyToOne(() => UserEntity, {
    nullable: true,
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'cancelled_by_user_id' })
  cancelledByUser?: UserEntity | null;

  @Column({ name: 'cancel_reason', type: 'text', nullable: true })
  cancelReason?: string | null;

  @Column({
    name: 'cancellation_fee',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  cancellationFee!: number;

  @Column({
    name: 'refund_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  refundAmount!: number;

  @Column({ name: 'policy_snapshot', type: 'jsonb', nullable: true })
  policySnapshot?: Record<string, unknown> | null;

  @ManyToOne(() => PaymentEntity, {
    nullable: true,
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'payment_id' })
  payment?: PaymentEntity | null;

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
