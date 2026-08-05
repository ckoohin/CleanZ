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
import { EarningsReportPeriodType } from 'src/common/enums/earnings-report-period-type.enum';
import { EarningsReportRunStatus } from 'src/common/enums/earnings-report-run-status.enum';
import { EarningsReportTriggerSource } from 'src/common/enums/earnings-report-trigger-source.enum';
import { UserEntity } from 'src/modules/users/entities/user.entity';

/**
 * Một lượt gửi bảng kê thu nhập cho Tasker (tự động theo lịch hoặc admin bấm tay).
 *
 * Partial unique index `(period_type, period_start_key) WHERE trigger_source = 'SCHEDULER'`
 * chính là cơ chế **claim**: nhiều instance cùng tick chỉ có một INSERT thành công,
 * các instance còn lại nhận lỗi unique và bỏ qua lượt đó. Admin gửi tay không vướng
 * index này nên gửi lại được bao nhiêu lần tuỳ ý.
 */
@Entity('earnings_report_runs')
@Index(
  'uq_earnings_report_runs_scheduler_period',
  ['periodType', 'periodStartKey'],
  { unique: true, where: `"trigger_source" = 'SCHEDULER'` },
)
export class EarningsReportRunEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: EarningsReportPeriodType,
    enumName: 'earnings_report_period_type',
    name: 'period_type',
  })
  periodType!: EarningsReportPeriodType;

  /** Ngày đầu kỳ theo giờ VN, dạng `YYYY-MM-DD` — khoá định danh kỳ. */
  @Column({ type: 'varchar', length: 10, name: 'period_start_key' })
  periodStartKey!: string;

  @Column({ type: 'timestamp', name: 'period_start' })
  periodStart!: Date;

  @Column({ type: 'timestamp', name: 'period_end' })
  periodEnd!: Date;

  @Index('idx_earnings_report_runs_trigger_source')
  @Column({
    type: 'enum',
    enum: EarningsReportTriggerSource,
    enumName: 'earnings_report_trigger_source',
    name: 'trigger_source',
  })
  triggerSource!: EarningsReportTriggerSource;

  @Column({ type: 'uuid', name: 'triggered_by_user_id', nullable: true })
  triggeredByUserId!: string | null;

  @ManyToOne(() => UserEntity, {
    nullable: true,
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'triggered_by_user_id',
    foreignKeyConstraintName: 'FK_earnings_report_runs_triggered_by',
  })
  triggeredBy!: UserEntity | null;

  @Index('idx_earnings_report_runs_status')
  @Column({
    type: 'enum',
    enum: EarningsReportRunStatus,
    enumName: 'earnings_report_run_status',
    default: EarningsReportRunStatus.PENDING,
  })
  status!: EarningsReportRunStatus;

  @Column({ type: 'int', name: 'total_taskers', default: 0 })
  totalTaskers!: number;

  @Column({ type: 'int', name: 'sent_count', default: 0 })
  sentCount!: number;

  @Column({ type: 'int', name: 'failed_count', default: 0 })
  failedCount!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
