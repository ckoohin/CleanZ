import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CustomerEntity } from '../../customers/entities/customer.entity';
import { WorkerServiceEntity } from '../../workers/entities/worker-service.entity';
import { BookingType } from 'src/common/enums/booking-type.enum';
import { BookingStatus } from 'src/common/enums/booking-status.enum';
import { ServiceLocationType } from 'src/common/enums/service-location-type.enum';
import { PaymentStatus } from 'src/common/enums/payment-status.enum';

@Entity('bookings')
export class BookingEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ─── Relations ────────────────────────
  @ManyToOne(() => CustomerEntity)
  @JoinColumn({ name: 'customer_id' })
  customer!: CustomerEntity;

  @ManyToOne(() => WorkerServiceEntity)
  @JoinColumn({ name: 'worker_service_id' })
  workerService!: WorkerServiceEntity;

  // ─── Booking Info ────────────────────
  @Column({ name: 'booking_type', type: 'enum', enum: BookingType })
  bookingType!: BookingType;

  @Column({
    name: 'service_location_type',
    type: 'enum',
    enum: ServiceLocationType,
  })
  serviceLocationType!: ServiceLocationType;

  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.PENDING,
  })
  status!: BookingStatus;

  // ─── Thời gian ──────────────────────
  @Column({ name: 'scheduled_date', type: 'date', nullable: true })
  scheduledDate?: string;

  @Column({ name: 'scheduled_time', type: 'time', nullable: true })
  scheduledTime?: string;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt?: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt?: Date;

  // ─── Địa điểm ──────────────────────
  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude?: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude?: number;

  // ─── Thanh toán (sẵn sàng cho tích hợp bên thứ ba) ─────
  @Column({ name: 'total_price', type: 'decimal', precision: 10, scale: 2 })
  totalPrice!: number;

  @Column({
    name: 'payment_status',
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.UNPAID,
  })
  paymentStatus!: PaymentStatus;

  @Column({
    name: 'payment_method',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  paymentMethod?: string;

  @Column({
    name: 'transaction_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  transactionId?: string;

  @Column({ name: 'payment_data', type: 'jsonb', nullable: true })
  paymentData?: Record<string, any>;

  // ─── Ghi chú & đánh giá ────────────
  @Column({ name: 'customer_note', type: 'text', nullable: true })
  customerNote?: string;

  @Column({ type: 'int', nullable: true })
  rating?: number;

  @Column({ type: 'text', nullable: true })
  review?: string;

  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellationReason?: string;

  @Column({
    name: 'cancelled_by',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  cancelledBy?: string;

  // ─── Timestamps ────────────────────
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
