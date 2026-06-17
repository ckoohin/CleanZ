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
import { SupportTicketStatus } from 'src/common/enums/support-ticket-status.enum';
import { TicketCategory } from 'src/common/enums/ticket-category.enum';
import { TicketPriority } from 'src/common/enums/ticket-priority.enum';
import { TicketSource } from 'src/common/enums/ticket-source.enum';
import { TicketPendingReason } from 'src/common/enums/ticket-pending-reason.enum';
import { UserEntity } from 'src/modules/users/entities/user.entity';
import { BookingEntity } from 'src/modules/booking/entity/booking.entity';

export { SupportTicketStatus } from 'src/common/enums/support-ticket-status.enum';

@Entity('support_tickets')
@Index('idx_st_status_priority_created', ['status', 'priority', 'createdAt'])
@Index('idx_st_reporter', ['reporter'])
@Index('idx_st_booking', ['booking'])
@Index('idx_st_assigned', ['assignedAdmin'])
export class SupportTicketEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'ticket_code', type: 'varchar', length: 20, nullable: true })
  ticketCode?: string | null;

  @Column({ type: 'varchar', length: 255 })
  subject!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({
    type: 'enum',
    enum: TicketCategory,
    enumName: 'ticket_category',
    default: TicketCategory.OTHER,
  })
  category!: TicketCategory;

  @Column({ type: 'varchar', length: 100, nullable: true })
  subtype?: string | null;

  @Column({
    type: 'enum',
    enum: TicketPriority,
    enumName: 'ticket_priority',
    default: TicketPriority.MEDIUM,
  })
  priority!: TicketPriority;

  @Column({
    type: 'enum',
    enum: SupportTicketStatus,
    enumName: 'support_ticket_status',
    default: SupportTicketStatus.NEW,
  })
  status!: SupportTicketStatus;

  @Column({
    type: 'enum',
    enum: TicketSource,
    enumName: 'ticket_source',
    default: TicketSource.CUSTOMER_APP,
  })
  source!: TicketSource;

  @ManyToOne(() => BookingEntity, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking?: BookingEntity | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'reporter_user_id' })
  reporter!: UserEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'counterparty_user_id' })
  counterparty?: UserEntity | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'assigned_admin_id' })
  assignedAdmin?: UserEntity | null;

  @Column({ name: 'first_response_due_at', type: 'timestamp', nullable: true })
  firstResponseDueAt?: Date | null;

  @Column({ name: 'resolution_due_at', type: 'timestamp', nullable: true })
  resolutionDueAt?: Date | null;

  @Column({ name: 'first_responded_at', type: 'timestamp', nullable: true })
  firstRespondedAt?: Date | null;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt?: Date | null;

  @Column({ name: 'closed_at', type: 'timestamp', nullable: true })
  closedAt?: Date | null;

  @Column({ name: 'sla_paused_at', type: 'timestamp', nullable: true })
  slaPausedAt?: Date | null;

  @Column({ name: 'sla_paused_accum_ms', type: 'bigint', default: 0 })
  slaPausedAccumMs!: string;

  @Column({ name: 'sla_breached', type: 'boolean', default: false })
  slaBreached!: boolean;

  @Column({
    name: 'pending_reason',
    type: 'enum',
    enum: TicketPendingReason,
    enumName: 'ticket_pending_reason',
    nullable: true,
  })
  pendingReason?: TicketPendingReason | null;

  @Column({ name: 'incident_id', type: 'uuid', nullable: true })
  incidentId?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
