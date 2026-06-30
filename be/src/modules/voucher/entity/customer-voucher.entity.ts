import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { VoucherEntity } from './voucher.entity';
import { CustomerEntity } from 'src/modules/customer/entity/customer.entity';
import { BookingEntity } from 'src/modules/booking/entity/booking.entity';

export enum CustomerVoucherStatus {
  ISSUED = 'ISSUED',
  RESERVED = 'RESERVED',
  USED = 'USED',
  RELEASED = 'RELEASED',
}

@Entity('customer_vouchers')
export class CustomerVoucherEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId!: string;

  @Column({ name: 'voucher_id', type: 'uuid' })
  voucherId!: string;

  @ManyToOne(() => CustomerEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer!: CustomerEntity;

  @ManyToOne(() => VoucherEntity, (v) => v.customerVouchers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'voucher_id' })
  voucher!: VoucherEntity;

  @Column({ name: 'is_used', type: 'boolean', default: false })
  isUsed!: boolean;

  @Column({
    type: 'varchar',
    length: 20,
    default: CustomerVoucherStatus.ISSUED,
  })
  status!: CustomerVoucherStatus;

  @Column({ name: 'booking_id', type: 'uuid', nullable: true })
  bookingId!: string | null;

  @ManyToOne(() => BookingEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'booking_id' })
  booking?: BookingEntity | null;

  @Column({ name: 'reserved_at', type: 'timestamp', nullable: true })
  reservedAt!: Date | null;

  @Column({ name: 'used_at', type: 'timestamp', nullable: true })
  usedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
