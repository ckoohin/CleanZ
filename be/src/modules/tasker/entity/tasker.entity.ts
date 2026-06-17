import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TaskerStatus } from 'src/common/enums/tasker-status.enum';
import { TaskerDocumentType } from 'src/common/enums/type-docs-tasker.enum';
import { DocumentStatus } from 'src/common/enums/document-status.enum';
import { TASKER_PRESENCE_STATUS } from 'src/common/enums/tasker-presence-status.enum';
import { UserEntity } from 'src/modules/users/entities/user.entity';

@Entity('taskers')
export class TaskerEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(() => UserEntity, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ name: 'working_address', type: 'text', nullable: true })
  workingAddress?: string | null;

  @Column({ name: 'bio', type: 'text', nullable: true })
  bio?: string | null;

  @Column({
    type: 'enum',
    enum: TaskerStatus,
    enumName: 'tasker_status',
    default: TaskerStatus.PENDING,
  })
  status!: TaskerStatus;

  @Column({
    name: 'deposit_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 400000,
  })
  depositAmount!: number;

  @Column({
    name: 'current_deposit_balance',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 400000,
  })
  currentDepositBalance!: number;

  @Column({
    name: 'rating_avg',
    type: 'numeric',
    precision: 3,
    scale: 2,
    default: 5,
  })
  ratingAvg!: number;

  @Column({ name: 'total_completed_jobs', type: 'int', default: 0 })
  totalCompletedJobs!: number;

  @Column({
    name: 'total_working_hours',
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0,
  })
  totalWorkingHours!: number;

  @Column({ name: 'total_points', type: 'int', default: 0 })
  totalPoints!: number;

  @Column({ name: 'level_id', type: 'uuid', nullable: true })
  levelId?: string | null;

  @Column({
    name: 'doc_type',
    type: 'enum',
    enum: TaskerDocumentType,
    enumName: 'document_type',
    nullable: true,
  })
  docType?: TaskerDocumentType | null;

  @Column({
    name: 'doc_id_number',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  docIdNumber?: string | null;

  @Column({ name: 'doc_front_url', type: 'text', nullable: true })
  docFrontUrl?: string | null;

  @Column({ name: 'doc_back_url', type: 'text', nullable: true })
  docBackUrl?: string | null;

  @Column({ name: 'criminal_record_url', type: 'text', nullable: true })
  criminalRecordUrl?: string | null;

  @Column({ name: 'health_certificate_url', type: 'text', nullable: true })
  healthCertificateUrl?: string | null;

  @Column({ name: 'certificate_url', type: 'text', nullable: true })
  certificateUrl?: string | null;

  @Column({ name: 'doc_issued_date', type: 'date', nullable: true })
  docIssuedDate?: Date | null;

  @Column({ name: 'doc_expired_date', type: 'date', nullable: true })
  docExpiredDate?: Date | null;

  @Column({
    name: 'doc_status',
    type: 'enum',
    enum: DocumentStatus,
    enumName: 'document_status',
    default: DocumentStatus.PENDING,
  })
  docStatus!: DocumentStatus;

  @Column({ name: 'doc_reviewed_at', type: 'timestamp', nullable: true })
  docReviewedAt?: Date | null;

  @Column({ name: 'doc_note', type: 'text', nullable: true })
  docNote?: string | null;

  @Column({ name: 'ban_reason', type: 'varchar', length: 500, nullable: true })
  banReason?: string | null;

  @Column({
    name: 'presence_status',
    type: 'enum',
    enum: TASKER_PRESENCE_STATUS,
    enumName: 'tasker_presence_status',
    default: TASKER_PRESENCE_STATUS.OFFLINE,
  })
  presenceStatus!: TASKER_PRESENCE_STATUS;

  @Column({ name: 'bank_name', type: 'varchar', length: 100, nullable: true })
  bankName?: string | null;

  @Column({
    name: 'bank_account_number',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  bankAccountNumber?: string | null;

  @Column({
    name: 'bank_account_name',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  bankAccountName?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
