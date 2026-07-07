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
import { IncidentEntity } from './incident.entity';
import { IncidentDamageItemVerificationStatus } from 'src/common/enums/incident-damage-item-verification-status.enum';

@Entity('incident_damage_items')
@Index('idx_idi_incident', ['incident'])
export class IncidentDamageItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => IncidentEntity, (incident) => incident.damageItems, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'incident_id' })
  incident!: IncidentEntity;

  @Column({ type: 'varchar', length: 255 })
  description!: string;

  @Column({ name: 'claimed_amount', type: 'numeric', precision: 12, scale: 2 })
  claimedAmount!: number;

  @Column({
    name: 'verified_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  verifiedAmount?: number | null;

  @Column({
    name: 'approved_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  approvedAmount?: number | null;

  @Column({
    name: 'verification_status',
    type: 'enum',
    enum: IncidentDamageItemVerificationStatus,
    enumName: 'incident_damage_item_verification_status',
    default: IncidentDamageItemVerificationStatus.PENDING,
  })
  verificationStatus!: IncidentDamageItemVerificationStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
