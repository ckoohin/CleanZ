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
import { BookingAbsenceReportStatus } from 'src/common/enums/booking-absence-report-status.enum';
import { CustomerEntity } from 'src/modules/customer/entity/customer.entity';
import { TaskerEntity } from 'src/modules/tasker/entity/tasker.entity';
import { UserEntity } from 'src/modules/users/entities/user.entity';
import { BookingEntity } from './booking.entity';

@Entity('booking_absence_reports')
@Index('idx_booking_absence_status_due', ['status', 'reviewDueAt'])
@Index('idx_booking_absence_customer_status', ['customer', 'status'])
@Index('uq_booking_absence_pending', { synchronize: false })
export class BookingAbsenceReportEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => BookingEntity, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking!: BookingEntity;

  @ManyToOne(() => TaskerEntity, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'tasker_id' })
  tasker!: TaskerEntity;

  @ManyToOne(() => CustomerEntity, {
    nullable: true,
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'customer_id' })
  customer?: CustomerEntity | null;

  @Column({ name: 'is_guest', type: 'boolean', default: false })
  isGuest!: boolean;

  @Column({
    type: 'enum',
    enum: BookingAbsenceReportStatus,
    enumName: 'booking_absence_report_status',
    default: BookingAbsenceReportStatus.PENDING_REVIEW,
  })
  status!: BookingAbsenceReportStatus;

  @Column({ name: 'review_due_at', type: 'timestamp' })
  reviewDueAt!: Date;

  @Column({ name: 'proof_photo_url', type: 'text' })
  proofPhotoUrl!: string;

  /** Ảnh chụp lịch sử cuộc gọi; nullable để đọc được hồ sơ tạo trước migration. */
  @Column({ name: 'call_history_photo_url', type: 'text', nullable: true })
  callHistoryPhotoUrl?: string | null;

  @Column({ name: 'tasker_note', type: 'text', nullable: true })
  taskerNote?: string | null;

  @Column({ name: 'reported_at', type: 'timestamp' })
  reportedAt!: Date;

  @Column({ name: 'waited_minutes', type: 'int' })
  waitedMinutes!: number;

  @Column({
    name: 'compensation_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
  })
  compensationAmount!: number;

  @Column({
    name: 'subtotal_snapshot',
    type: 'numeric',
    precision: 12,
    scale: 2,
  })
  subtotalSnapshot!: number;

  @Column({ name: 'policy_snapshot', type: 'jsonb' })
  policySnapshot!: Record<string, unknown>;

  @Column({
    name: 'checkin_distance_meters',
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  checkinDistanceMeters?: number | null;

  @Column({ name: 'checkin_far', type: 'boolean', default: false })
  checkinFar!: boolean;

  @ManyToOne(() => UserEntity, {
    nullable: true,
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'reviewed_by_admin_id' })
  reviewedByAdmin?: UserEntity | null;

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt?: Date | null;

  @Column({ name: 'review_reason', type: 'text', nullable: true })
  reviewReason?: string | null;

  @Column({
    name: 'refunded_upfront',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  refundedUpfront!: number;

  @Column({
    name: 'debt_recovered_upfront',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  debtRecoveredUpfront!: number;

  @Column({
    name: 'held_for_review',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  heldForReview!: number;

  @Column({
    name: 'paid_from_escrow',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  paidFromEscrow!: number;

  @Column({
    name: 'paid_from_customer_wallet',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  paidFromCustomerWallet!: number;

  @Column({
    name: 'advanced_by_platform',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  advancedByPlatform!: number;

  @Column({
    name: 'platform_borne_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  platformBorneAmount!: number;

  @Column({
    name: 'refunded_on_close',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  refundedOnClose!: number;

  @Column({
    name: 'debt_recovered_on_close',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  debtRecoveredOnClose!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
