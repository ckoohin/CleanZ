import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { WorkerEntity } from './worker.entity';
import { ServiceEntity } from '../../services/entities/service.entity';
import { ServiceLocationType } from 'src/common/enums/service-location-type.enum';

@Entity('worker_services')
export class WorkerServiceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => WorkerEntity, (worker) => worker.workerServices, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'worker_id' })
  worker!: WorkerEntity;

  @ManyToOne(() => ServiceEntity, { eager: true })
  @JoinColumn({ name: 'service_id' })
  service!: ServiceEntity;

  @Column({
    name: 'location_types',
    type: 'enum',
    enum: ServiceLocationType,
    array: true,
  })
  locationTypes!: ServiceLocationType[];

  @Column({
    name: 'custom_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  customPrice?: number;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'shop_address', type: 'text', nullable: true })
  shopAddress?: string;

  @Column({ name: 'is_available', type: 'boolean', default: true })
  isAvailable!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
