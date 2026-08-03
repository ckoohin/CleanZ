import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { IncidentEvidencePurpose } from 'src/common/enums/incident-evidence-purpose.enum';
import { IncidentEntity } from './incident.entity';
import { IncidentDamageItemEntity } from './incident-damage-item.entity';
import { UserEntity } from 'src/modules/users/entities/user.entity';
import { IncidentDecisionResponseEntity } from './incident-decision-response.entity';

export type IncidentEvidenceType = 'IMAGE' | 'VIDEO';

/** Chế độ lưu trên storage — quyết định URL có cần chữ ký của server hay không. */
export type IncidentEvidenceStorageType = 'PUBLIC' | 'AUTHENTICATED';

@Entity('incident_evidences')
@Index('idx_ie_damage_item', ['damageItem'])
@Index('idx_ie_incident', ['incident'])
// Partial index cho vòng quét dọn ảnh bỏ dở (WHERE incident_id IS NULL) — xem migration.
@Index('idx_ie_detached_created', { synchronize: false })
export class IncidentEvidenceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => IncidentEntity, {
    nullable: true,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'incident_id' })
  incident?: IncidentEntity | null;

  @ManyToOne(() => IncidentDamageItemEntity, {
    nullable: true,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'damage_item_id' })
  damageItem?: IncidentDamageItemEntity | null;

  @Column({ name: 'file_url', type: 'text' })
  fileUrl!: string;

  @Column({ name: 'file_type', type: 'varchar', length: 50, nullable: true })
  fileType?: IncidentEvidenceType | null;

  @Column({ name: 'storage_public_id', type: 'text', nullable: true })
  storagePublicId?: string | null;

  /**
   * `AUTHENTICATED` = file chỉ tải được bằng URL do server ký, nên `visibility` mới thật sự
   * có hiệu lực tới tầng file. `PUBLIC` = ảnh cũ upload trước thay đổi này, URL vẫn mở.
   */
  @Column({
    name: 'storage_type',
    type: 'varchar',
    length: 20,
    default: 'PUBLIC',
  })
  storageType!: IncidentEvidenceStorageType;

  @Column({
    type: 'enum',
    enum: IncidentEvidencePurpose,
    enumName: 'incident_evidence_purpose',
    nullable: true,
  })
  purpose?: IncidentEvidencePurpose | null;

  @Column({ name: 'decision_version', type: 'int', nullable: true })
  decisionVersion?: number | null;

  @ManyToOne(() => IncidentDecisionResponseEntity, {
    nullable: true,
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'decision_response_id' })
  decisionResponse?: IncidentDecisionResponseEntity | null;

  @Column({
    type: 'varchar',
    length: 30,
    default: 'INCIDENT_PARTIES',
  })
  visibility!: string;

  @Column({ name: 'is_soft_deleted', type: 'boolean', default: false })
  isSoftDeleted!: boolean;

  @Column({ name: 'soft_deleted_at', type: 'timestamp', nullable: true })
  softDeletedAt?: Date | null;

  @ManyToOne(() => UserEntity, {
    nullable: true,
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'soft_deleted_by_user_id' })
  softDeletedBy?: UserEntity | null;

  @Column({ name: 'is_active_for_response', type: 'boolean', default: true })
  isActiveForResponse!: boolean;

  @ManyToOne(() => IncidentEvidenceEntity, {
    nullable: true,
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'replaced_by_evidence_id' })
  replacedByEvidence?: IncidentEvidenceEntity | null;

  @ManyToOne(() => UserEntity, {
    nullable: true,
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'uploaded_by_user_id' })
  uploadedBy?: UserEntity | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
