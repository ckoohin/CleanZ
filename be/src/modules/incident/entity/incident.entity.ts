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
import { IncidentDecisionStatus } from 'src/common/enums/incident-decision-status.enum';
import { IncidentResponsibilityParty } from 'src/common/enums/incident-responsibility-party.enum';
import { IncidentResponseWindowStatus } from 'src/common/enums/incident-response-window-status.enum';
import { IncidentSource } from 'src/common/enums/incident-source.enum';
import { IncidentType } from 'src/common/enums/incident-type.enum';
import { BookingEntity } from 'src/modules/booking/entity/booking.entity';
import { CustomerEntity } from 'src/modules/customer/entity/customer.entity';
import { TaskerEntity } from 'src/modules/tasker/entity/tasker.entity';
import { UserEntity } from 'src/modules/users/entities/user.entity';
import { IncidentDamageItemEntity } from './incident-damage-item.entity';
import { IncidentDecisionResponseEntity } from './incident-decision-response.entity';

export type IncidentCompensationSource =
  | 'TASKER_DEPOSIT'
  | 'PLATFORM_FUND'
  | 'MIXED';

@Entity('incidents')
@Index('idx_inc_status_comp', ['status', 'compensationStatus'])
@Index('idx_inc_severity_created', ['severity', 'createdAt'])
@Index('idx_incidents_type_source', { synchronize: false })
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
    enum: IncidentType,
    enumName: 'incident_type',
    default: IncidentType.PROPERTY_DAMAGE,
  })
  type!: IncidentType;

  @Column({
    type: 'enum',
    enum: IncidentSource,
    enumName: 'incident_source',
    default: IncidentSource.CUSTOMER_REPORT,
  })
  source!: IncidentSource;

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
    name: 'decision_status',
    type: 'enum',
    enum: IncidentDecisionStatus,
    enumName: 'incident_decision_status',
    default: IncidentDecisionStatus.NONE,
  })
  decisionStatus!: IncidentDecisionStatus;

  @Column({ name: 'decision_version', type: 'int', default: 0 })
  decisionVersion!: number;

  @Column({
    name: 'response_window_status',
    type: 'enum',
    enum: IncidentResponseWindowStatus,
    enumName: 'incident_response_window_status',
    default: IncidentResponseWindowStatus.NONE,
  })
  responseWindowStatus!: IncidentResponseWindowStatus;

  @Column({
    name: 'tasker_response_deadline',
    type: 'timestamp',
    nullable: true,
  })
  taskerResponseDeadline?: Date | null;

  @Column({
    name: 'tasker_response_reviewed_at',
    type: 'timestamp',
    nullable: true,
  })
  taskerResponseReviewedAt?: Date | null;

  // C6 — thời điểm Admin cấp lần gia hạn bắt buộc cho Tasker phản hồi (null = chưa gia hạn).
  @Column({
    name: 'tasker_response_extended_at',
    type: 'timestamp',
    nullable: true,
  })
  taskerResponseExtendedAt?: Date | null;

  // P0.2 — số tiền ví Tasker đã tạm giữ (hold) khi accept; release khi chốt/bồi thường/đóng.
  @Column({
    name: 'tasker_wallet_hold_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  taskerWalletHoldAmount?: number | null;

  @Column({
    name: 'closure_reason',
    type: 'enum',
    enum: IncidentClosureReason,
    enumName: 'incident_closure_reason',
    nullable: true,
  })
  closureReason?: IncidentClosureReason | null;

  /** P2 — outcome quyết định (APPROVE / APPROVE_NO_COMPENSATION / REJECT) để finalize
   * phân biệt được nhánh approved=0. Null khi chưa có quyết định. */
  @Column({
    name: 'decision_outcome',
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  decisionOutcome?: string | null;

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

  @Column({
    name: 'responsibility_party',
    type: 'enum',
    enum: IncidentResponsibilityParty,
    enumName: 'incident_responsibility_party',
    nullable: true,
  })
  responsibilityParty?: IncidentResponsibilityParty | null;

  @Column({ name: 'responsibility_reason', type: 'text', nullable: true })
  responsibilityReason?: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'responsibility_decided_by_admin_id' })
  responsibilityDecidedByAdmin?: UserEntity | null;

  @Column({
    name: 'responsibility_decided_at',
    type: 'timestamp',
    nullable: true,
  })
  responsibilityDecidedAt?: Date | null;

  @Column({ name: 'internal_decision_note', type: 'text', nullable: true })
  internalDecisionNote?: string | null;

  @Column({ name: 'tasker_decision_reason', type: 'text', nullable: true })
  taskerDecisionReason?: string | null;

  @Column({ name: 'customer_decision_summary', type: 'text', nullable: true })
  customerDecisionSummary?: string | null;

  @Column({
    name: 'deposit_balance_snapshot',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  depositBalanceSnapshot?: number | null;

  @Column({
    name: 'recoverable_from_deposit_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  recoverableFromDepositAmount?: number | null;

  @Column({
    name: 'uncovered_liability_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  uncoveredLiabilityAmount?: number | null;

  @Column({
    name: 'uncovered_recovered_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  uncoveredRecoveredAmount!: number;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'decided_by_investigator_id' })
  decidedByInvestigator?: UserEntity | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'decided_by_admin_id' })
  decidedByAdmin?: UserEntity | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'approved_by_checker_id' })
  approvedByChecker?: UserEntity | null;

  @Column({ name: 'cooling_until', type: 'timestamp', nullable: true })
  coolingUntil?: Date | null;

  @Column({ name: 'second_approval_note', type: 'text', nullable: true })
  secondApprovalNote?: string | null;

  @Column({
    name: 'second_approval_requested_at',
    type: 'timestamp',
    nullable: true,
  })
  secondApprovalRequestedAt?: Date | null;

  @Column({ name: 'second_approval_due_at', type: 'timestamp', nullable: true })
  secondApprovalDueAt?: Date | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'second_approved_by_admin_id' })
  secondApprovedByAdmin?: UserEntity | null;

  @Column({ name: 'second_approved_at', type: 'timestamp', nullable: true })
  secondApprovedAt?: Date | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'finalized_by_admin_id' })
  finalizedByAdmin?: UserEntity | null;

  @Column({ name: 'finalized_at', type: 'timestamp', nullable: true })
  finalizedAt?: Date | null;

  @Column({
    name: 'policy_version',
    type: 'varchar',
    length: 80,
    nullable: true,
  })
  policyVersion?: string | null;

  @Column({
    name: 'dual_approval_threshold_snapshot',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  dualApprovalThresholdSnapshot?: number | null;

  @Column({
    name: 'policy_cap_snapshot',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  policyCapSnapshot?: number | null;

  @Column({
    name: 'response_window_hours_snapshot',
    type: 'int',
    nullable: true,
  })
  responseWindowHoursSnapshot?: number | null;

  @Column({ name: 'severity_rule_snapshot', type: 'jsonb', nullable: true })
  severityRuleSnapshot?: Record<string, unknown> | null;

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
    default: () => "(NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')",
  })
  reportedAt!: Date;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt?: Date | null;

  @OneToMany(() => IncidentDamageItemEntity, (item) => item.incident)
  damageItems?: IncidentDamageItemEntity[];

  @OneToMany(
    () => IncidentDecisionResponseEntity,
    (response) => response.incident,
  )
  decisionResponses?: IncidentDecisionResponseEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
