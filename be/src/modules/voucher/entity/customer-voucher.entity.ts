import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { VoucherEntity } from './voucher.entity';

@Entity('customer_vouchers')
@Unique('uq_customer_voucher', ['customerId', 'voucherId'])
export class CustomerVoucherEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'customer_id' })
  customerId?: string;

  @Index('idx_customer_vouchers_voucher_id')
  @Column({ type: 'uuid', name: 'voucher_id' })
  voucherId?: string;

  @Column({ type: 'boolean', default: false, name: 'is_used' })
  isUsed!: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'used_at' })
  usedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => VoucherEntity, (v) => v.customerVouchers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'voucher_id' })
  voucher!: VoucherEntity;
}
