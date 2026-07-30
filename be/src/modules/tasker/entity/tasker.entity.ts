import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TaskerStatus } from 'src/common/enums/tasker-status.enum';
import { TaskerDocumentType } from 'src/common/enums/type-docs-tasker.enum';
import { DocumentStatus } from 'src/common/enums/document-status.enum';
import { TASKER_PRESENCE_STATUS } from 'src/common/enums/tasker-presence-status.enum';
import { TaskerEquipmentStatus } from 'src/common/enums/tasker-equipment-status.enum';
import { UserEntity } from 'src/modules/users/entities/user.entity';

import { TaskerServiceEntity } from './tasker-service.entity';
import { TaskerEquipmentEntity } from './tasker-equipment.entity';
import { TaskerEquipmentDebtEntity } from './tasker-equipment-debt.entity';
import { TaskerScheduleEntity } from './tasker-schedule.entity';
import { TaskerCoverageEntity } from './tasker-coverage.entity';

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

  @Column({ name: 'experience', type: 'text', nullable: true })
  experience?: string | null;

  @Column({ name: 'skills', type: 'text', nullable: true })
  skills?: string | null;

  @Column({
    type: 'enum',
    enum: TaskerStatus,
    enumName: 'tasker_status',
    default: TaskerStatus.PENDING,
  })
  status!: TaskerStatus;

  // Ký quỹ đã bị bỏ — Tasker chỉ còn MỘT ví (wallets). Sàn số dư để nhận đơn nằm ở
  // system_configs.TASKER_MIN_ACCEPT_BALANCE_VND. Xem migration MergeTaskerDepositIntoWallet.

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

  @Column({ name: 'warning_points', type: 'int', default: 0 })
  warningPoints!: number;

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

  // ── Xác minh bộ dụng cụ chuyên dụng (điều kiện nhận đơn PREMIUM) ──────────
  // Mirror đúng luồng duyệt giấy tờ ở trên: status + ảnh + audit người duyệt.
  @Column({
    name: 'equipment_status',
    type: 'enum',
    enum: TaskerEquipmentStatus,
    enumName: 'tasker_equipment_status',
    default: TaskerEquipmentStatus.NONE,
  })
  equipmentStatus!: TaskerEquipmentStatus;

  @Column({ name: 'equipment_photo_urls', type: 'jsonb', nullable: true })
  equipmentPhotoUrls?: string[] | null;

  @Column({ name: 'equipment_reviewed_at', type: 'timestamp', nullable: true })
  equipmentReviewedAt?: Date | null;

  @Column({ name: 'equipment_reviewed_by', type: 'uuid', nullable: true })
  equipmentReviewedBy?: string | null;

  @Column({ name: 'equipment_note', type: 'text', nullable: true })
  equipmentNote?: string | null;

  @Column({ name: 'ban_reason', type: 'varchar', length: 500, nullable: true })
  banReason?: string | null;

  /** Hạn mở khóa cho ban có thời hạn (TEMPORARY). NULL = không hạn (hoặc TERMINATED). */
  @Column({ name: 'ban_ends_at', type: 'timestamp', nullable: true })
  banEndsAt?: Date | null;

  // Audit: admin (users.id) đã DUYỆT/xử lý hồ sơ gần nhất (approve/reject/request-info).
  @Column({ name: 'doc_reviewed_by', type: 'uuid', nullable: true })
  docReviewedBy?: string | null;

  // Audit: admin (users.id) đã tác động gần nhất (duyệt/khóa/sửa...).
  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string | null;

  /** Hạn khóa do tự hủy quá 3 lần/tuần. NULL = không bị khóa theo luồng này. */
  @Column({ name: 'cancel_suspended_until', type: 'timestamp', nullable: true })
  cancelSuspendedUntil?: Date | null;

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

  @Index('idx_taskers_location_online', {
    spatial: true,
    where: `"presence_status" = 'ONLINE' AND "status" = 'ACTIVE'`,
  })
  @Column({
    name: 'current_location',
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
    select: false,
  })
  currentLocation?: { type: 'Point'; coordinates: [number, number] } | null;

  @Column({ name: 'location_updated_at', type: 'timestamptz', nullable: true })
  locationUpdatedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;

  // --- Relations (Tasker 360 View) ---
  @OneToMany(() => TaskerServiceEntity, (service) => service.tasker)
  services?: TaskerServiceEntity[];

  @OneToMany(() => TaskerEquipmentEntity, (eq) => eq.tasker)
  equipments?: TaskerEquipmentEntity[];

  @OneToOne(() => TaskerEquipmentDebtEntity, (debt) => debt.tasker)
  equipmentDebt?: TaskerEquipmentDebtEntity;

  @OneToMany(() => TaskerScheduleEntity, (schedule) => schedule.tasker)
  schedules?: TaskerScheduleEntity[];

  @OneToMany(() => TaskerCoverageEntity, (coverage) => coverage.tasker)
  coverages?: TaskerCoverageEntity[];
}
