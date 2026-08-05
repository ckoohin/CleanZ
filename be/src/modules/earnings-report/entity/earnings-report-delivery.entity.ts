import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EarningsReportDeliveryStatus } from 'src/common/enums/earnings-report-delivery-status.enum';
import { TaskerEntity } from 'src/modules/tasker/entity/tasker.entity';
import { EarningsReportRunEntity } from './earnings-report-run.entity';

/**
 * Trạng thái gửi bảng kê cho từng Tasker trong một lượt.
 *
 * Các cột tiền là **snapshot tại thời điểm gửi** — admin đối chiếu về sau mà không
 * phải tính lại, và không bị lệch nếu đơn được điều chỉnh sau khi đã gửi bản kê.
 */
@Entity('earnings_report_deliveries')
@Index('uq_earnings_report_deliveries_run_tasker', ['runId', 'taskerId'], {
  unique: true,
})
export class EarningsReportDeliveryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'run_id' })
  runId!: string;

  @ManyToOne(() => EarningsReportRunEntity, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'run_id',
    foreignKeyConstraintName: 'FK_earnings_report_deliveries_run',
  })
  run!: EarningsReportRunEntity;

  @Index('idx_earnings_report_deliveries_tasker_id')
  @Column({ type: 'uuid', name: 'tasker_id' })
  taskerId!: string;

  @ManyToOne(() => TaskerEntity, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'tasker_id',
    foreignKeyConstraintName: 'FK_earnings_report_deliveries_tasker',
  })
  tasker!: TaskerEntity;

  /** Email nhận bản kê, chốt tại thời điểm gửi (Tasker có thể đổi email sau đó). */
  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Index('idx_earnings_report_deliveries_status')
  @Column({
    type: 'enum',
    enum: EarningsReportDeliveryStatus,
    enumName: 'earnings_report_delivery_status',
    default: EarningsReportDeliveryStatus.PENDING,
  })
  status!: EarningsReportDeliveryStatus;

  @Column({ type: 'timestamp', name: 'sent_at', nullable: true })
  sentAt!: Date | null;

  /** Cắt còn 2000 ký tự trước khi ghi — theo mẫu notification outbox. */
  @Column({ type: 'text', name: 'last_error', nullable: true })
  lastError!: string | null;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    name: 'gross_revenue',
    default: 0,
  })
  grossRevenue!: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    name: 'platform_fee',
    default: 0,
  })
  platformFee!: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    name: 'net_income',
    default: 0,
  })
  netIncome!: number;

  @Column({ type: 'int', name: 'completed_bookings', default: 0 })
  completedBookings!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
