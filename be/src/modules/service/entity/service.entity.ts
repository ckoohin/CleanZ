import { PricingConfigEntity } from 'src/modules/pricing/entity/pricing-config.entity';
import { VoucherEntity } from 'src/modules/voucher/entity/voucher.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  OneToOne,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CategoryEntity } from './category.entity';

@Entity('services')
export class ServiceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'varchar',
    length: 20,
    unique: true,
    name: 'service_code',
    default: () => "'SRV-' || upper(substr(md5(random()::text), 1, 6))",
  })
  serviceCode!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({
    type: 'numeric',
    precision: 4,
    scale: 1,
    nullable: true,
    name: 'base_duration_hours',
  })
  baseDurationHours!: number | null;

  @Column({ type: 'text', nullable: true, name: 'coverage_area' })
  coverageArea!: string | null;

  @Index('idx_services_is_active')
  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    name: 'thumbnail_url',
  })
  thumbnailUrl?: string;

  @Column({ type: 'jsonb', nullable: true, name: 'gallery_urls' })
  galleryUrls?: string[];

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    name: 'short_description',
  })
  shortDescription?: string;

  @Column({ type: 'jsonb', nullable: true, name: 'included_tasks' })
  includedTasks?: string[];

  @Column({ type: 'jsonb', nullable: true, name: 'excluded_tasks' })
  excludedTasks?: string[];

  @OneToOne(() => PricingConfigEntity, (pricing) => pricing.service)
  pricingConfig?: PricingConfigEntity;

  @OneToMany(() => VoucherEntity, (v) => v.service)
  vouchers!: VoucherEntity[];

  @ManyToOne(() => CategoryEntity, (category) => category.services, {
    nullable: true,
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'category_id' })
  category?: CategoryEntity | null;
}

