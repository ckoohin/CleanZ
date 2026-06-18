import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { ServiceEntity } from '../../service/entity/service.entity';

@Entity('pricing_configs')
@Unique('uq_pricing_service_province_duration', [
  'serviceId',
  'provinceCode',
  'durationHours',
])
export class PricingConfigEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'service_id' })
  serviceId!: string;

  @Index('idx_pricing_configs_lookup')
  @Column({ type: 'varchar', length: 20, name: 'province_code' })
  provinceCode!: string;

  @Column({ type: 'numeric', precision: 4, scale: 1, name: 'duration_hours' })
  durationHours!: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'base_price' })
  basePrice!: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    name: 'peak_price',
  })
  peakPrice!: number | null;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    name: 'pet_fee',
  })
  petFee!: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    name: 'waiting_fee',
  })
  waitingFee!: number;

  @Column({
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: 20.0,
    name: 'platform_commission_rate',
  })
  platformCommissionRate!: number;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => ServiceEntity, (s) => s.pricingConfigs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'service_id' })
  service!: ServiceEntity;
}
