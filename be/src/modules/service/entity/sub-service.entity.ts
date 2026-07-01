import { PricingConfigEntity } from 'src/modules/pricing/entity/pricing-config.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  Index,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
} from 'typeorm';
import { PackageSubServiceEntity } from './package-sub-service.entity';

@Entity('sub_services')
export class SubServiceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Không dùng DB default kiểu hàm SQL: nó gây drift giả vĩnh viễn với
  // schema:check (xem [[cleanz-be-migrations]]). Sinh code ở tầng app thay thế.
  @Column({
    type: 'varchar',
    length: 20,
    unique: true,
    name: 'sub_service_code',
  })
  subServiceCode!: string;

  @BeforeInsert()
  generateSubServiceCode(): void {
    if (!this.subServiceCode) {
      const suffix = Math.random().toString(16).slice(2, 8).toUpperCase();
      this.subServiceCode = `SRV-${suffix}`;
    }
  }

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

  @OneToMany(() => PackageSubServiceEntity, (pss) => pss.subService)
  packageSubServices!: PackageSubServiceEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
