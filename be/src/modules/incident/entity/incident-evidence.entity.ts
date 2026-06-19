import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { IncidentEntity } from './incident.entity';
import { IncidentDamageItemEntity } from './incident-damage-item.entity';
import { UserEntity } from 'src/modules/users/entities/user.entity';

export type IncidentEvidenceType = 'IMAGE' | 'VIDEO';

@Entity('incident_evidences')
@Index('idx_ie_damage_item', ['damageItem'])
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
