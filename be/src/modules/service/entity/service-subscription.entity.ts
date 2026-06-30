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

@Entity('service_subscriptions')
export class ServiceSubscriptionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'package_id' })
  packageId!: string;

  @ManyToOne(() => ServicePackageEntity, (pkg) => pkg.subscriptions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'package_id' })
  package!: ServicePackageEntity;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'numeric',
    precision: 5,
    scale: 2,
    name: 'discount_percent',
    default: 0.0,
  })
  discountPercent!: number;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    name: 'billing_cycle',
    default: 'monthly',
  })
  billingCycle?: string;

  @Column({ type: 'integer', nullable: true, name: 'sessions_per_cycle' })
  sessionsPerCycle?: number | null;

  @Column({ type: 'integer', nullable: true, name: 'commitment_months' })
  commitmentMonths?: number | null;

  @Column({ type: 'text', nullable: true, name: 'bonus_description' })
  bonusDescription?: string | null;

  @Column({ type: 'boolean', default: false, name: 'is_popular' })
  isPopular!: boolean;

  @Column({ type: 'integer', default: 0, name: 'sort_order' })
  sortOrder!: number;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
