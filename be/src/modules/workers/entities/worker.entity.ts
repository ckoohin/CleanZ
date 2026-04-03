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
import { WorkerDocumentEntity } from './worker-document.entity';
import { APPROVAL_STATUS } from 'src/common/enums/approval-status.enum';
import { WorkerPresenceEntity } from './worker-presence.entity';
import { WorkerServiceEntity } from './worker-service.entity';

export enum WorkerStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('worker_profiles')
export class WorkerEntity {
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

  @OneToMany(() => WorkerDocumentEntity, (document) => document.worker, {
    cascade: true,
  })
  documents?: WorkerDocumentEntity[];

  @OneToMany(() => WorkerServiceEntity, (ws) => ws.worker, {
    cascade: true,
  })
  workerServices?: WorkerServiceEntity[];

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
    () => WorkerPresenceEntity,
    (workerPresence) => workerPresence.worker,
  )
  workerPresence?: WorkerPresenceEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ name: 'last_changed_by_admin_id', type: 'uuid', nullable: true })
  lastChangedByAdminId?: string;

  @Column({ name: 'last_changed_by_admin_name', type: 'text', nullable: true })
  lastChangedByAdminName?: string;
}
