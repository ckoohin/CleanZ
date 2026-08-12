import {
  Check,
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
import { IncidentClosureReason } from 'src/common/enums/incident-closure-reason.enum';
import { IncidentSeverity } from 'src/common/enums/incident-severity.enum';
import { IncidentResponsibilityParty } from 'src/common/enums/incident-responsibility-party.enum';
import { IncidentDecisionOutcome } from 'src/common/enums/incident-decision-outcome.enum';
import { IncidentSource } from 'src/common/enums/incident-source.enum';
import { IncidentType } from 'src/common/enums/incident-type.enum';
import { IncidentRespondentParty } from 'src/common/enums/incident-respondent-party.enum';
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
// Danh sách luôn sắp theo `reportedAt`, nên index phải theo cột đó chứ không phải
// `createdAt` — xem migration 1787200000000.
@Index('idx_inc_reported_at', ['reportedAt'])
@Index('idx_inc_status_reported', ['status', 'reportedAt'])
@Index('idx_inc_customer_reported', ['customer', 'reportedAt'])
@Index('idx_inc_tasker_reported', ['tasker', 'reportedAt'])
@Index('idx_inc_severity_created', ['severity', 'createdAt'])
// Partial index — khai báo ở migration, TypeORM không diễn tả được mệnh đề WHERE.
@Index('idx_inc_status_decision_due', { synchronize: false })
@Index('idx_incidents_type_source', { synchronize: false })
@Index('idx_incidents_respondent_response_deadline', ['taskerResponseDeadline'])
@Index('idx_incidents_customer_unreachable_queue', { synchronize: false })
@Index('idx_incidents_customer_no_show_appeal', { synchronize: false })
@Index('uq_checkin_reconciliation_active_per_booking', {
  synchronize: false,
})
@Index('uq_inc_active_per_booking_generic', { synchronize: false })
@Check(
  'CHK_incident_customer_no_show_amounts_non_negative',
  '("customer_borne_amount" IS NULL OR "customer_borne_amount" >= 0) AND ' +
    '("platform_advance_amount" IS NULL OR "platform_advance_amount" >= 0) AND ' +
    '("travel_distance_meters" IS NULL OR "travel_distance_meters" >= 0)',
)
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

  @Column({ name: 'decision_version', type: 'int', default: 0 })
  decisionVersion!: number;

  /**
   * Hạn bên bị yêu cầu phản hồi. Tên thuộc tính Tasker được giữ để không phá hợp đồng
   * service/API hiện tại; cột DB đã được tổng quát hoá cho cả Tasker và Customer.
   * Trạng thái cửa sổ được SUY RA, không lưu:
   *  - `status = AWAITING_RESPONSE` ∧ `now < deadline` → đang mở
   *  - `status = AWAITING_RESPONSE` ∧ `now >= deadline` → đã hết hạn (được chốt)
   */
  @Column({
    name: 'respondent_response_deadline',
    type: 'timestamp',
    nullable: true,
  })
  taskerResponseDeadline?: Date | null;

  /**
   * Mốc số tiền bên phản hồi phải chịu của bản quyết định đã gửi. Tên thuộc tính cũ
   * được giữ để toàn bộ luồng quyết định Tasker tiếp tục hoạt động không đổi.
   * Dùng để biết
   * admin có TĂNG phần Tasker chịu sau khi nghe phản hồi hay không (tăng → phải gửi lại).
   * Null = chưa từng gửi bản nào ở version hiện tại.
   */
  @Column({
    name: 'sent_respondent_borne_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  sentTaskerBorneAmount?: number | null;

  @Column({
    name: 'respondent_party',
    type: 'enum',
    enum: IncidentRespondentParty,
    enumName: 'incident_respondent_party',
    default: IncidentRespondentParty.TASKER,
    select: false,
  })
  respondentParty!: IncidentRespondentParty;

  // Các cột dưới đây thuộc luồng CUSTOMER_UNREACHABLE cũ. Ánh xạ nhưng không select
  // mặc định để bảo toàn dữ liệu/schema mà không làm thay đổi payload các API hiện tại.
  @Column({
    name: 'wait_started_at',
    type: 'timestamp',
    nullable: true,
    select: false,
  })
  waitStartedAt?: Date | null;

  @Column({
    name: 'final_submission_eligible_at',
    type: 'timestamp',
    nullable: true,
    select: false,
  })
  finalSubmissionEligibleAt?: Date | null;

  @Column({
    name: 'final_report_submitted_at',
    type: 'timestamp',
    nullable: true,
    select: false,
  })
  finalReportSubmittedAt?: Date | null;

  @Column({
    name: 'customer_responded_at',
    type: 'timestamp',
    nullable: true,
    select: false,
  })
  customerRespondedAt?: Date | null;

  @Column({
    name: 'verification_snapshot',
    type: 'jsonb',
    nullable: true,
    select: false,
  })
  verificationSnapshot?: Record<string, unknown> | null;

  @Column({
    name: 'no_show_policy_snapshot',
    type: 'jsonb',
    nullable: true,
    select: false,
  })
  noShowPolicySnapshot?: Record<string, unknown> | null;

  @Column({
    name: 'travel_distance_meters',
    type: 'numeric',
    precision: 12,
    scale: 1,
    nullable: true,
    select: false,
  })
  travelDistanceMeters?: number | null;

  @Column({
    name: 'distance_method',
    type: 'varchar',
    length: 32,
    nullable: true,
    select: false,
  })
  distanceMethod?: string | null;

  @Column({
    name: 'customer_borne_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    select: false,
  })
  customerBorneAmount?: number | null;

  @Column({
    name: 'platform_advance_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    select: false,
  })
  platformAdvanceAmount?: number | null;

  @Column({
    name: 'tasker_compensated_at',
    type: 'timestamp',
    nullable: true,
    select: false,
  })
  taskerCompensatedAt?: Date | null;

  @Column({
    name: 'customer_appealed_at',
    type: 'timestamp',
    nullable: true,
    select: false,
  })
  customerAppealedAt?: Date | null;

  @Column({
    name: 'customer_appeal_resolved_at',
    type: 'timestamp',
    nullable: true,
    select: false,
  })
  customerAppealResolvedAt?: Date | null;

  @Column({
    name: 'customer_appeal_resolution',
    type: 'varchar',
    length: 16,
    nullable: true,
    select: false,
  })
  customerAppealResolution?: string | null;

  @Column({
    name: 'customer_appeal_resolution_note',
    type: 'text',
    nullable: true,
    select: false,
  })
  customerAppealResolutionNote?: string | null;

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

  /** Kết cục quyết định (COMPENSATE / NO_COMPENSATION / REJECT) — phân biệt được hai
   * nhánh approved=0. Null khi chưa soạn quyết định nào. */
  @Column({
    name: 'decision_outcome',
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  decisionOutcome?: IncidentDecisionOutcome | null;

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

  /**
   * Khoản bồi thường công ty chi NGOÀI ví (chuyển khoản ngân hàng thủ công). Không có bút
   * toán ví tương ứng — luồng thủ công chạy đúng lúc ví SYSTEM cạn nên không thể debit nó.
   * Đây là sổ chi ngoài; cộng với sổ ví mới ra tổng chi thật của nền tảng.
   */
  @Column({
    name: 'external_payout_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  externalPayoutAmount?: number | null;

  @Column({ name: 'external_payout_at', type: 'timestamp', nullable: true })
  externalPayoutAt?: Date | null;

  @Column({ name: 'external_payout_note', type: 'text', nullable: true })
  externalPayoutNote?: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'external_payout_by_admin_id' })
  externalPayoutByAdmin?: UserEntity | null;

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
