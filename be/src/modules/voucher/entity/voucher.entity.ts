import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { VoucherType } from '../../../common/enums/voucher-type.enum';
import { CustomerVoucherEntity } from './customer-voucher.entity';

@Entity('vouchers')
export class VoucherEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('uq_voucher_code', { unique: true })
  @Column({ type: 'varchar', length: 50, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'enum', enum: VoucherType })
  type!: VoucherType;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  value!: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    name: 'max_discount',
  })
  maxDiscount!: number | null;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    name: 'min_order_amount',
  })
  minOrderAmount!: number;

  @Column({ type: 'int', nullable: true, name: 'usage_limit' })
  usageLimit!: number | null;

  @Column({ type: 'int', nullable: true, name: 'per_customer_limit' })
  perCustomerLimit!: number | null;

  @Column({ type: 'int', default: 0, name: 'used_count' })
  usedCount!: number;

  @Column({ type: 'int', default: 0, name: 'reserved_count' })
  reservedCount!: number;

  @Column({ type: 'jsonb', nullable: true, name: 'package_ids' })
  packageIds!: string[] | null;

  @Column({ type: 'jsonb', nullable: true, name: 'customer_ids' })
  customerIds!: string[] | null;

  @Index('idx_vouchers_active_dates')
  @Column({ type: 'timestamp', nullable: true, name: 'start_date' })
  startDate!: Date | null;

  @Column({ type: 'timestamp', nullable: true, name: 'end_date' })
  endDate!: Date | null;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @OneToMany(() => CustomerVoucherEntity, (cv) => cv.voucher)
  customerVouchers!: CustomerVoucherEntity[];
}
