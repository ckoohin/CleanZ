import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PaymentMethod } from 'src/common/enums/payment-method.enum';
import { PaymentStatus } from 'src/common/enums/payment-status.enum';
import { CustomerEntity } from 'src/modules/customer/entity/customer.entity';
import { BookingEntity } from 'src/modules/booking/entity/booking.entity';

@Entity('payments')
@Index('uq_payments_paid_online_transaction_code', { synchronize: false })
export class PaymentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => BookingEntity, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'booking_id' })
  booking!: BookingEntity;

  @ManyToOne(() => CustomerEntity, {
    nullable: true,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'customer_id' })
  customer?: CustomerEntity | null;

  @Column({ type: 'enum', enum: PaymentMethod, enumName: 'payment_method' })
  method!: PaymentMethod;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    enumName: 'payment_status',
    default: PaymentStatus.PENDING,
  })
  status!: PaymentStatus;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount!: number;

  @Column({
    name: 'transaction_code',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  transactionCode?: string | null;

  @Column({
    name: 'qr_code',
    type: 'text',
    nullable: true,
  })
  qrCode?: string | null;

  @Column({
    name: 'checkout_url',
    type: 'text',
    nullable: true,
  })
  checkoutUrl?: string | null;

  /** BIN ngân hàng thụ hưởng PayOS (dùng để build VietQR URL). */
  @Column({ name: 'bin', type: 'varchar', length: 10, nullable: true })
  bin?: string | null;

  /** Số tài khoản thụ hưởng PayOS. */
  @Column({
    name: 'account_number',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  accountNumber?: string | null;

  /** Tên chủ tài khoản thụ hưởng PayOS. */
  @Column({
    name: 'account_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  accountName?: string | null;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt?: Date | null;

  @Column({ name: 'refunded_at', type: 'timestamp', nullable: true })
  refundedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
