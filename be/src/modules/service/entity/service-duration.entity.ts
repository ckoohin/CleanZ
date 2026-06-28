import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ServicePackageEntity } from './service-package.entity';

@Entity('service_durations')
export class ServiceDurationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'package_id' })
  packageId!: string;

  @ManyToOne(() => ServicePackageEntity, (pkg) => pkg.durations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'package_id' })
  package!: ServicePackageEntity;

  @Column({ type: 'numeric', precision: 4, scale: 1, name: 'duration_hours' })
  durationHours!: number;

  @Column({
    type: 'numeric',
    precision: 5,
    scale: 2,
    name: 'price_multiplier',
    default: 1.0,
  })
  priceMultiplier!: number;

  @Column({ type: 'boolean', default: false, name: 'is_popular' })
  isPopular!: boolean;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean;

  @Column({ type: 'int', nullable: true, name: 'suggested_area' })
  suggestedArea?: number | null;

  @Column({ type: 'int', default: 1, name: 'tasker_count' })
  taskerCount!: number;

  @Column({ type: 'varchar', nullable: true, name: 'title' })
  title?: string | null;

  @Column({ type: 'text', nullable: true, name: 'description' })
  description?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
