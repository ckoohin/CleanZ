import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ServiceEntity } from 'src/modules/pricing/entity/service.entity';

export enum VoucherType {
  PERCENT = 'PERCENT',
  FIXED = 'FIXED',
}

@Entity('vouchers')
export class VoucherEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'enum', enum: VoucherType, enumName: 'voucher_type' })
  type!: VoucherType;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  value!: number;

  @Column({
    name: 'max_discount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  maxDiscount?: number | null;

  @Column({
    name: 'min_order_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  minOrderAmount!: number;

  @Column({ name: 'usage_limit', type: 'int', nullable: true })
  usageLimit?: number | null;

  @Column({ name: 'used_count', type: 'int', default: 0 })
  usedCount!: number;

  @ManyToOne(() => ServiceEntity, {
    nullable: true,
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'service_id' })
  service?: ServiceEntity | null;

  @Column({ name: 'start_date', type: 'timestamp', nullable: true })
  startDate?: Date | null;

  @Column({ name: 'end_date', type: 'timestamp', nullable: true })
  endDate?: Date | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
