import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { CustomerEntity } from '../../customers/entities/customer.entity';
import { StaffServiceEntity } from '../../staffs/entities/staff-service.entity';
import { ServiceEntity } from '../../services/entities/service.entity';
import { BookingStatus } from '../../../common/enums/booking-status.enum';
import { PaymentStatus } from '../../../common/enums/payment-status.enum';
import { BookingType } from '../../../common/enums/booking-type.enum';
import { ServiceLocationType } from '../../../common/enums/service-location-type.enum';
import { BookingAddonEntity } from './booking-addon.entity';

@Entity('bookings')
export class BookingEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'order_code', type: 'varchar', length: 20, unique: true })
  orderCode!: string;

  @ManyToOne(() => CustomerEntity, { eager: true })
  @JoinColumn({ name: 'customer_id' })
  customer!: CustomerEntity;

  @ManyToOne(() => ServiceEntity, { eager: true })
  @JoinColumn({ name: 'service_id' })
  service!: ServiceEntity;

  @ManyToOne(() => StaffServiceEntity, { eager: true, nullable: true })
  @JoinColumn({ name: 'staff_service_id' })
  staffService?: StaffServiceEntity;

  @Column({
    name: 'booking_type',
    type: 'enum',
    enum: BookingType,
    default: BookingType.SCHEDULED,
  })
  bookingType!: BookingType;

  @Column({
    name: 'location_type',
    type: 'enum',
    enum: ServiceLocationType,
  })
  locationType!: ServiceLocationType;

  @Column({ type: 'text' })
  address!: string;

  @Column({ name: 'booking_date', type: 'date' })
  bookingDate!: Date;

  @Column({ name: 'booking_time', type: 'time' })
  bookingTime!: string;

  @Column({
    name: 'estimated_hours',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  estimatedHours?: number;

  @Column({
    name: 'actual_hours',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  actualHours?: number;

  @Column({
    name: 'hourly_rate',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  hourlyRate?: number;

  @Column({
    name: 'quoted_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  quotedPrice!: number;

  @Column({
    name: 'total_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  totalPrice!: number;

  @OneToMany(() => BookingAddonEntity, (addon) => addon.booking, {
    cascade: true,
    eager: true,
  })
  addons?: BookingAddonEntity[];

  @Column({ name: 'special_requests', type: 'text', nullable: true })
  specialRequests?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.PENDING,
  })
  status!: BookingStatus;

  @Column({
    name: 'payment_status',
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.UNPAID,
  })
  paymentStatus!: PaymentStatus;

  @Column({ name: 'confirmed_at', type: 'timestamp', nullable: true })
  confirmedAt?: Date;

  @Column({ name: 'cancelled_by', type: 'uuid', nullable: true })
  cancelledBy?: string;

  @Column({ name: 'rescheduled_from', type: 'uuid', nullable: true })
  rescheduledFrom?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
