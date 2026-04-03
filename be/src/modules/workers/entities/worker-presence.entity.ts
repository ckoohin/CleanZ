import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { WORKER_PRESENCE_STATUS } from 'src/common/enums/worker-presence-status.enum';
import { WorkerEntity } from './worker.entity';

@Entity('worker_presence')
export class WorkerPresenceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(() => WorkerEntity, (worker) => worker.workerPresence, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'worker_id' })
  worker!: WorkerEntity;

  @Column({
    type: 'enum',
    enum: WORKER_PRESENCE_STATUS,
    default: WORKER_PRESENCE_STATUS.OFFLINE,
  })
  status!: WORKER_PRESENCE_STATUS;

  @Column({ name: 'is_busy', type: 'boolean', default: false })
  isBusy!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
