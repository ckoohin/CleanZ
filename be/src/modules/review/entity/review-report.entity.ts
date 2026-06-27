import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ReviewReportReason } from 'src/common/enums/review-report-reason.enum';
import { ReviewReportStatus } from 'src/common/enums/review-report-status.enum';

@Entity('review_reports')
@Index('idx_review_reports_review', ['reviewId'])
@Index('idx_review_reports_status', ['status'])
export class ReviewReportEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'review_id', type: 'uuid' })
  reviewId!: string;

  @Column({ name: 'reported_by', type: 'uuid' })
  reportedBy!: string;

  @Column({ type: 'enum', enum: ReviewReportReason })
  reason!: ReviewReportReason;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({
    type: 'enum',
    enum: ReviewReportStatus,
    default: ReviewReportStatus.PENDING,
  })
  status!: ReviewReportStatus;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy?: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt?: Date | null;

  @Column({ name: 'admin_note', type: 'text', nullable: true })
  adminNote?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
