import { PricingConfigEntity } from 'src/modules/pricing/entity/pricing-config.entity';
import { VoucherEntity } from 'src/modules/voucher/entity/voucher.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';

@Entity('services')
export class ServiceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

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

  @OneToMany(() => PricingConfigEntity, (pc) => pc.service)
  pricingConfigs!: PricingConfigEntity[];

  @OneToMany(() => VoucherEntity, (v) => v.service)
  vouchers!: VoucherEntity[];
}
