import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PaymentMethod } from 'src/common/enums/payment-method.enum';
import { PaymentStatus } from 'src/common/enums/payment-status.enum';
import { CustomerEntity } from 'src/modules/customer/entity/customer.entity';
import { BookingEntity } from 'src/modules/booking/entity/booking.entity';

@Entity('payments')
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
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'customer_id' })
  customer!: CustomerEntity;

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

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt?: Date | null;

  @Column({ name: 'refunded_at', type: 'timestamp', nullable: true })
  refundedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
