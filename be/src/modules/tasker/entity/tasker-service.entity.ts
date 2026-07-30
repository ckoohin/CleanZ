import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { TaskerEntity } from './tasker.entity';
import { ServicePackageEntity } from '../../service/entity/service-package.entity';

@Entity('tasker_services')
@Index(['taskerId', 'serviceId'], { unique: true })
export class TaskerServiceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tasker_id', type: 'uuid' })
  taskerId!: string;

  @Column({ name: 'service_id', type: 'uuid' })
  serviceId!: string;

  @ManyToOne(() => TaskerEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tasker_id' })
  tasker!: TaskerEntity;

  @ManyToOne(() => ServicePackageEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_id' })
  service!: ServicePackageEntity;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'tested_at', type: 'timestamptz', nullable: true })
  testedAt?: Date | null;

  @Column({ name: 'certificate_url', type: 'text', nullable: true })
  certificateUrl?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
