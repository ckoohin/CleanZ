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
import { ServicePackageEntity } from '../../service/entity/service-package.entity';

export enum PricingMode {
  HOURLY = 'HOURLY', // Tính theo giờ: pricePerHour × durationHours
  AREA_HOURLY = 'AREA_HOURLY', // Tính theo m² × giờ: pricePerM2 × areaM2 × durationHours
  FIXED = 'FIXED', // Giá cố định: fixedPrice
}

@Entity('pricing_tiers')
@Index('idx_pricing_tiers_package_id', ['packageId'])
export class PricingTierEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'package_id' })
  packageId!: string;

  @ManyToOne(() => ServicePackageEntity, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'package_id',
    foreignKeyConstraintName: 'FK_pricing_tiers_package',
  })
  package!: ServicePackageEntity;

  /** Tên mức (ví dụ: "Nhà 30-60m²", "Gói 2 giờ") */
  @Column({ type: 'varchar', length: 100, name: 'name' })
  name!: string;

  /** Mô tả ngắn cho customer */
  @Column({ type: 'varchar', length: 255, name: 'description', nullable: true })
  description?: string | null;

  @Column({
    type: 'enum',
    enum: PricingMode,
    enumName: 'pricing_mode',
    default: PricingMode.HOURLY,
    name: 'pricing_mode',
  })
  pricingMode!: PricingMode;

  // ─── AREA_HOURLY fields ────────────────────────────────────────────────────
  /** m² tối thiểu của dải này (chỉ dùng khi pricingMode = AREA_HOURLY) */
  @Column({
    type: 'numeric',
    precision: 7,
    scale: 1,
    nullable: true,
    name: 'area_min_m2',
  })
  areaMinM2?: number | null;

  /** m² tối đa của dải này */
  @Column({
    type: 'numeric',
    precision: 7,
    scale: 1,
    nullable: true,
    name: 'area_max_m2',
  })
  areaMaxM2?: number | null;

  /** Đơn giá / m² / giờ (VND) */
  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    name: 'price_per_m2',
  })
  pricePerM2?: number | null;

  // ─── HOURLY fields ─────────────────────────────────────────────────────────
  /** Đơn giá / giờ (VND) — dùng khi pricingMode = HOURLY */
  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    name: 'price_per_hour',
  })
  pricePerHour?: number | null;

  // ─── FIXED fields ──────────────────────────────────────────────────────────
  /** Giá cố định (VND) — dùng khi pricingMode = FIXED */
  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    name: 'fixed_price',
  })
  fixedPrice?: number | null;

  // ─── Common fields ─────────────────────────────────────────────────────────
  /** Số giờ tối thiểu customer phải chọn */
  @Column({
    type: 'numeric',
    precision: 3,
    scale: 1,
    default: 1.0,
    name: 'min_hours',
  })
  minHours!: number;

  /** Số giờ tối đa cho phép */
  @Column({
    type: 'numeric',
    precision: 3,
    scale: 1,
    default: 8.0,
    name: 'max_hours',
  })
  maxHours!: number;

  /** Số giờ mặc định gợi ý */
  @Column({
    type: 'numeric',
    precision: 3,
    scale: 1,
    nullable: true,
    name: 'default_hours',
  })
  defaultHours?: number | null;

  @Column({ type: 'int', default: 0, name: 'sort_order' })
  sortOrder!: number;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
