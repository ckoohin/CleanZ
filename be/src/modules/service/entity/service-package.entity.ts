import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
  Index,
} from 'typeorm';
import { PackageSubServiceEntity } from './package-sub-service.entity';
import { CoverageAreaEntity } from './coverage-area.entity';
import { Policy } from '../../policy/entity/policy.entity';
import {
  PricingTierEntity,
  PricingMode,
} from '../../pricing/entity/pricing-tier.entity';
import { ServiceDurationEntity } from './service-duration.entity';
import { ServiceAddonEntity } from './service-addon.entity';
import { ServiceSubscriptionEntity } from './service-subscription.entity';
import { ServicePeakHourEntity } from './service-peak-hour.entity';
import { ServiceSubServiceEntity } from './service-sub-service.entity';

@Entity('service_packages')
export class ServicePackageEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Index('idx_service_packages_code', { unique: true })
  @Column({ type: 'varchar', length: 255, unique: true, name: 'package_code' })
  packageCode!: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'icon_url' })
  iconUrl?: string | null;

  @Column({ type: 'jsonb', nullable: true, name: 'gallery_urls' })
  galleryUrls?: string[] | null;

  @Column({ type: 'int', default: 0, name: 'sort_order' })
  sortOrder!: number;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean;

  /**
   * Chế độ tính giá cho gói:
   * - HOURLY: giá = pricePerHour × durationHours
   * - AREA_HOURLY: giá = pricePerM2 × areaM2 × durationHours
   * - FIXED: giá cố định
   */
  @Column({
    type: 'enum',
    enum: PricingMode,
    enumName: 'pricing_mode',
    default: PricingMode.HOURLY,
    name: 'pricing_mode',
    nullable: true,
  })
  pricingMode?: PricingMode | null;

  @Column({
    type: 'numeric',
    precision: 4,
    scale: 1,
    name: 'max_hours',
    default: 8.0,
  })
  maxHours!: number;

  @Column({ type: 'text', nullable: true, name: 'terms_and_conditions' })
  termsAndConditions?: string | null;

  @Column({ type: 'text', nullable: true, name: 'policy_description' })
  policyDescription?: string | null;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    name: 'night_surcharge',
    default: 0.0,
  })
  nightSurcharge!: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    name: 'pet_surcharge',
    default: 0.0,
  })
  petSurcharge!: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    name: 'waiting_surcharge',
    default: 0.0,
  })
  waitingSurcharge!: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    name: 'tool_fee',
    default: 0.0,
  })
  toolFee!: number;

  @Column({
    type: 'numeric',
    precision: 5,
    scale: 2,
    name: 'peak_rate_percent',
    default: 0.0,
  })
  peakRatePercent!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;

  /**
   * Xóa mềm: giữ bản ghi để đơn cũ (bookings.package_id) vẫn tra cứu được tên
   * gói và chính sách, đồng thời TypeORM tự loại gói đã xóa khỏi mọi truy vấn
   * đặt đơn mới. Tra cứu lịch sử phải dùng `withDeleted: true`.
   */
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt?: Date | null;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    name: 'base_hourly_rate',
    default: 0.0,
  })
  baseHourlyRate!: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    name: 'premium_hourly_rate',
    default: 0.0,
  })
  premiumHourlyRate!: number;

  @Column({ type: 'boolean', default: false, name: 'allow_multiple_taskers' })
  allowMultipleTaskers!: boolean;

  @Column({ type: 'boolean', default: false, name: 'allow_subscription' })
  allowSubscription!: boolean;

  @Column({ type: 'boolean', default: true, name: 'allow_single_service' })
  allowSingleService!: boolean;

  @OneToMany(() => PackageSubServiceEntity, (pss) => pss.package)
  packageSubServices!: PackageSubServiceEntity[];

  /** Cấu hình mức giá theo m² / giờ / cố định */
  @OneToMany(() => PricingTierEntity, (tier) => tier.package, { cascade: true })
  pricingTiers!: PricingTierEntity[];

  @OneToMany(() => ServiceDurationEntity, (sd) => sd.package, { cascade: true })
  durations!: ServiceDurationEntity[];

  @OneToMany(() => ServiceAddonEntity, (sa) => sa.package, { cascade: true })
  addons!: ServiceAddonEntity[];

  @OneToMany(() => ServiceSubscriptionEntity, (ss) => ss.package, {
    cascade: true,
  })
  subscriptions!: ServiceSubscriptionEntity[];

  @OneToMany(() => ServicePeakHourEntity, (sph) => sph.package, {
    cascade: true,
  })
  peakHours!: ServicePeakHourEntity[];

  @OneToMany(() => ServiceSubServiceEntity, (sss) => sss.package, {
    cascade: true,
  })
  subServices!: ServiceSubServiceEntity[];

  @ManyToMany(() => CoverageAreaEntity, (area) => area.packages)
  @JoinTable({
    name: 'package_coverage_areas',
    joinColumn: { name: 'package_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'area_id', referencedColumnName: 'id' },
  })
  coverageAreas!: CoverageAreaEntity[];

  /** Chính sách được gán cho gói dịch vụ này */
  @ManyToMany(() => Policy, (policy) => policy.packages)
  @JoinTable({
    name: 'package_policies',
    joinColumn: { name: 'package_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'policy_id', referencedColumnName: 'id' },
  })
  policies!: Policy[];
}
