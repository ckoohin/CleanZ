import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { StaffDocumentEntity } from './staff-document.entity';
import { APPROVAL_STATUS } from 'src/common/enums/approval-status.enum';
import { StaffPresenceEntity } from './staff-presence.entity';
import { StaffServiceEntity } from './staff-service.entity';

export enum StaffStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('staff')
export class StaffEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ nullable: true, type: 'text' })
  skills!: string;

  @Column({ type: 'varchar', length: 11, nullable: true })
  phone?: string;

  @Column({ nullable: true, type: 'text' })
  experience!: string;

  @Column({ nullable: true, type: 'text' })
  bio!: string;

  @Column({ name: 'avatar_public_id', type: 'text', nullable: true })
  avatarPublicId!: string | null;

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl!: string | null;

  @OneToMany(() => StaffDocumentEntity, (document) => document.staff, {
    cascade: true,
  })
  documents?: StaffDocumentEntity[];

  @OneToMany(() => StaffServiceEntity, (ws) => ws.staff, {
    cascade: true,
  })
  staffServices?: StaffServiceEntity[];

  @Column({ name: 'total_jobs', type: 'int', default: 0 })
  totalJobs!: number;

  @Column({ name: 'avg_rating', type: 'float', default: 0 })
  avgRating!: number;

  @Column({
    name: 'approval_status',
    type: 'enum',
    enum: APPROVAL_STATUS,
    default: APPROVAL_STATUS.PENDING,
  })
  approvalStatus!: APPROVAL_STATUS;

  @OneToOne(() => StaffPresenceEntity, (staffPresence) => staffPresence.staff)
  staffPresence?: StaffPresenceEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ name: 'last_changed_by_admin_id', type: 'uuid', nullable: true })
  lastChangedByAdminId?: string;

  @Column({ name: 'last_changed_by_admin_name', type: 'text', nullable: true })
  lastChangedByAdminName?: string;
}
