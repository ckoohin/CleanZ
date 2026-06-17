import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ServiceEntity } from './service.entity';

@Entity('pricing_configs')
export class PricingConfigEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => ServiceEntity, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'service_id' })
  service!: ServiceEntity;

  @Column({ name: 'base_price', type: 'numeric', precision: 12, scale: 2 })
  basePrice!: number;

  @Column({
    name: 'peak_price',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  peakPrice?: number | null;

  @Column({
    name: 'pet_fee',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  petFee!: number;

  @Column({
    name: 'waiting_fee',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  waitingFee!: number;

  @Column({
    name: 'platform_commission_rate',
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: 20,
  })
  platformCommissionRate!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
