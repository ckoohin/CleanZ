import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { IncidentStatus } from 'src/common/enums/incident-status.enum';
import { IncidentCompensationStatus } from 'src/common/enums/incident-compensation-status.enum';
import { IncidentClosureReason } from 'src/common/enums/incident-closure-reason.enum';
import { IncidentSeverity } from 'src/common/enums/incident-severity.enum';
import { BookingEntity } from 'src/modules/booking/entity/booking.entity';
import { CustomerEntity } from 'src/modules/customer/entity/customer.entity';
import { TaskerEntity } from 'src/modules/tasker/entity/tasker.entity';
import { UserEntity } from 'src/modules/users/entities/user.entity';
import { IncidentDamageItemEntity } from './incident-damage-item.entity';

export type IncidentCompensationSource =
  | 'TASKER_DEPOSIT'
  | 'PLATFORM_FUND'
  | 'MIXED';

@Entity('incidents')
@Index('idx_inc_status_comp', ['status', 'compensationStatus'])
@Index('idx_inc_severity_created', ['severity', 'createdAt'])
export class IncidentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'incident_code',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  incidentCode?: string | null;

  @ManyToOne(() => BookingEntity, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking!: BookingEntity;

  @ManyToOne(() => CustomerEntity, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer!: CustomerEntity;

  @ManyToOne(() => TaskerEntity, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'tasker_id' })
  tasker!: TaskerEntity;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({
    type: 'enum',
    enum: IncidentSeverity,
    enumName: 'incident_severity',
    default: IncidentSeverity.MINOR,
  })
  severity!: IncidentSeverity;

  @Column({
    type: 'enum',
    enum: IncidentStatus,
    enumName: 'incident_status',
    default: IncidentStatus.REPORTED,
  })
  status!: IncidentStatus;

  @Column({
    name: 'compensation_status',
    type: 'enum',
    enum: IncidentCompensationStatus,
    enumName: 'incident_compensation_status',
    default: IncidentCompensationStatus.NONE,
  })
  compensationStatus!: IncidentCompensationStatus;

  @Column({
    name: 'closure_reason',
    type: 'enum',
    enum: IncidentClosureReason,
    enumName: 'incident_closure_reason',
    nullable: true,
  })
  closureReason?: IncidentClosureReason | null;

  @Column({
    name: 'claimed_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  claimedAmount?: number | null;

  @Column({
    name: 'approved_compensation_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  approvedCompensationAmount?: number | null;

  @Column({
    name: 'tasker_borne_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  taskerBorneAmount?: number | null;

  @Column({
    name: 'platform_borne_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  platformBorneAmount?: number | null;

  @Column({ name: 'allocation_reason', type: 'text', nullable: true })
  allocationReason?: string | null;

  @Column({
    name: 'compensation_source',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  compensationSource?: IncidentCompensationSource | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'decided_by_investigator_id' })
  decidedByInvestigator?: UserEntity | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'approved_by_checker_id' })
  approvedByChecker?: UserEntity | null;

  @Column({ name: 'cooling_until', type: 'timestamp', nullable: true })
  coolingUntil?: Date | null;

  @Column({ name: 'received_due_at', type: 'timestamp', nullable: true })
  receivedDueAt?: Date | null;

  @Column({ name: 'statement_due_at', type: 'timestamp', nullable: true })
  statementDueAt?: Date | null;

  @Column({ name: 'decision_due_at', type: 'timestamp', nullable: true })
  decisionDueAt?: Date | null;

  @Column({ name: 'report_window_until', type: 'timestamp', nullable: true })
  reportWindowUntil?: Date | null;

  @Column({
    name: 'reported_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  reportedAt!: Date;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt?: Date | null;

  @OneToMany(() => IncidentDamageItemEntity, (item) => item.incident)
  damageItems?: IncidentDamageItemEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
