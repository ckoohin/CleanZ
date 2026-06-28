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

@Entity('service_addons')
export class ServiceAddonEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'package_id' })
  packageId!: string;

  @ManyToOne(() => ServicePackageEntity, (pkg) => pkg.addons, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'package_id' })
  package!: ServicePackageEntity;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  price!: number;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'price_unit', default: 'per_item' })
  priceUnit?: string;

  @Column({ type: 'integer', nullable: true, name: 'duration_minutes' })
  durationMinutes?: number | null;

  @Column({ type: 'integer', nullable: true, name: 'max_quantity' })
  maxQuantity?: number | null;

  @Column({ type: 'integer', nullable: true, name: 'sort_order', default: 0 })
  sortOrder?: number;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'icon_url' })
  iconUrl?: string | null;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
