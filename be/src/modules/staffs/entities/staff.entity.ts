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
import { StaffPenaltyEntity } from './staff-penalty.entity';

@Entity('staff_profiles')
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

  @Column({ name: 'address_resident', type: 'text', nullable: true })
  addressResident?: string;

  @Column({ name: 'address_current', type: 'text', nullable: true })
  addressCurrent?: string;

  @Column({ name: 'bank_name', type: 'varchar', length: 100, nullable: true })
  bankName?: string;

  @Column({
    name: 'bank_account_number',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  bankAccountNumber?: string;

  @Column({
    name: 'bank_account_name',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  bankAccountName?: string;

  @OneToMany(
    'StaffDocumentEntity',
    (document: StaffDocumentEntity) => document.staff,
    {
      cascade: true,
    },
  )
  documents?: StaffDocumentEntity[];

  @OneToMany('StaffServiceEntity', (ws: StaffServiceEntity) => ws.staff, {
    cascade: true,
  })
  staffServices?: StaffServiceEntity[];

  @OneToMany(
    'StaffPenaltyEntity',
    (penalty: StaffPenaltyEntity) => penalty.staff,
  )
  penalties?: StaffPenaltyEntity[];

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

  @OneToOne(
    'StaffPresenceEntity',
    (staffPresence: StaffPresenceEntity) => staffPresence.staff,
  )
  staffPresence?: StaffPresenceEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ name: 'last_changed_by_admin_id', type: 'uuid', nullable: true })
  lastChangedByAdminId?: string;

  @Column({ name: 'last_changed_by_admin_name', type: 'text', nullable: true })
  lastChangedByAdminName?: string;

  @Column({ name: 'admin_notes', type: 'text', nullable: true })
  adminNotes?: string;
}
