import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { SubServiceEntity } from '../../service/entity/sub-service.entity';

@Entity('pricing_configs')
export class PricingConfigEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

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

  @OneToMany(() => SubServiceEntity, (service) => service.pricingConfig)
  services!: SubServiceEntity[];
}
