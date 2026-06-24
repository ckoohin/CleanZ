import { PricingConfigEntity } from 'src/modules/pricing/entity/pricing-config.entity';
import { VoucherEntity } from 'src/modules/voucher/entity/voucher.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PackageSubServiceEntity } from './package-sub-service.entity';

@Entity('sub_services')
export class SubServiceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'varchar',
    length: 20,
    unique: true,
    name: 'sub_service_code',
    default: () => "'SRV-' || upper(substr(md5(random()::text), 1, 6))",
  })
  subServiceCode!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({
    type: 'numeric',
    precision: 4,
    scale: 1,
    nullable: true,
    name: 'duration_hours',
    default: 1.0,
  })
  durationHours!: number | null;

  @Column({ type: 'text', nullable: true, name: 'coverage_area' })
  coverageArea!: string | null;

  @Index('idx_sub_services_is_active')
  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean;

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

  @Column({ type: 'text', nullable: true, name: 'terms_and_conditions' })
  termsAndConditions?: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'FIXED',
    name: 'pricing_type',
  })
  pricingType!: string; // 'FIXED', 'UNIT'

  @Column({ type: 'uuid', name: 'pricing_config_id', nullable: true })
  pricingConfigId?: string | null;

  @ManyToOne(() => PricingConfigEntity, (pricing) => pricing.services, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'pricing_config_id' })
  pricingConfig?: PricingConfigEntity | null;

  @OneToMany(() => VoucherEntity, (v) => v.service)
  vouchers!: VoucherEntity[];

  @OneToMany(() => PackageSubServiceEntity, (pss) => pss.subService)
  packageSubServices!: PackageSubServiceEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
