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

@Entity('service_peak_hours')
export class ServicePeakHourEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'package_id' })
  packageId!: string;

  @ManyToOne(() => ServicePackageEntity, (pkg) => pkg.peakHours, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'package_id' })
  package!: ServicePackageEntity;

  @Column({ type: 'int', name: 'day_of_week' })
  dayOfWeek!: number;

  @Column({ type: 'varchar', length: 10, name: 'start_hour' })
  startHour!: string;

  @Column({ type: 'varchar', length: 10, name: 'end_hour' })
  endHour!: string;

  @Column({
    type: 'numeric',
    precision: 5,
    scale: 2,
    name: 'multiplier',
    default: 1.0,
  })
  multiplier!: number;

  @Column({ type: 'timestamp', nullable: true, name: 'start_date' })
  startDate?: Date | null;

  @Column({ type: 'timestamp', nullable: true, name: 'end_date' })
  endDate?: Date | null;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title?: string | null;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
