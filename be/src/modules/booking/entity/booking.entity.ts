import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BookingStatus } from 'src/common/enums/booking-status.enum';
import { PaymentMethod } from 'src/common/enums/payment-method.enum';
import { PaymentStatus } from 'src/common/enums/payment-status.enum';
import { CancelledBy } from 'src/common/enums/cancelled-by.enum';
import { CustomerAddressEntity } from 'src/modules/customer/entity/customer-address.entity';
import { CustomerEntity } from 'src/modules/customer/entity/customer.entity';
import { TaskerEntity } from 'src/modules/tasker/entity/tasker.entity';
import { ServicePackageEntity } from 'src/modules/service/entity/service-package.entity';
import { BookingSubServiceEntity } from './booking-sub-service.entity';

@Entity('bookings')
export class BookingEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'booking_code', type: 'varchar', length: 20, unique: true })
  bookingCode!: string;

  @ManyToOne(() => CustomerEntity, {
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'customer_id' })
  customer!: CustomerEntity;

  @ManyToOne(() => TaskerEntity, {
    nullable: true,
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'tasker_id' })
  tasker?: TaskerEntity | null;

  @Column({ name: 'package_id', type: 'uuid' })
  packageId!: string;

  @ManyToOne(() => ServicePackageEntity, {
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'package_id' })
  package!: ServicePackageEntity;

  @OneToMany(() => BookingSubServiceEntity, (bss) => bss.booking)
  bookingSubServices!: BookingSubServiceEntity[];

  @Column({ type: 'text' })
  address!: string;

  // Quận/huyện chuẩn hoá để thống kê theo khu vực (dashboard area-performance).
  @Column({ name: 'district', type: 'varchar', length: 100, nullable: true })
  district?: string | null;

  @ManyToOne(() => CustomerAddressEntity, {
    nullable: true,
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'address_id' })
  addressRef?: CustomerAddressEntity | null;

  @Column({ type: 'text', nullable: true })
  note?: string | null;

  @Column({ name: 'scheduled_start', type: 'timestamp', nullable: true })
  scheduledStart?: Date | null;

  @Column({ name: 'scheduled_end', type: 'timestamp', nullable: true })
  scheduledEnd?: Date | null;

  @Column({ name: 'scheduled_start_date', type: 'date', nullable: true })
  scheduledStartDate?: string | null;

  @Column({ name: 'scheduled_start_time', type: 'time', nullable: true })
  scheduledStartTime?: string | null;

  @Column({ name: 'scheduled_end_date', type: 'date', nullable: true })
  scheduledEndDate?: string | null;

  @Column({ name: 'scheduled_end_time', type: 'time', nullable: true })
  scheduledEndTime?: string | null;

  @Column({
    name: 'duration_hours',
    type: 'numeric',
    precision: 4,
    scale: 1,
  })
  durationHours!: number;

  /** Diện tích m² khách nhập khi đặt (dùng khi pricingMode = AREA_HOURLY) */
  @Column({ name: 'area_m2', type: 'numeric', precision: 7, scale: 1, nullable: true })
  areaM2?: number | null;

  /** Mức giá (pricing tier) được chọn khi đặt booking */
  @Column({ name: 'pricing_tier_id', type: 'uuid', nullable: true })
  pricingTierId?: string | null;

  @Column({
    type: 'enum',
    enum: BookingStatus,
    enumName: 'booking_status',
    default: BookingStatus.POSTED,
  })
  status!: BookingStatus;

  @Column({
    name: 'base_price',
    type: 'numeric',
    precision: 12,
    scale: 2,
  })
  basePrice!: number;

  @Column({
    name: 'addon_price',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  addonPrice!: number;

  @Column({
    name: 'peak_fee',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  peakFee!: number;

  @Column({
    name: 'pet_fee',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  petFee!: number;

  @Column({
    name: 'waiting_fee',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  waitingFee!: number;

  @Column({
    name: 'discount_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  discountAmount!: number;

  @Column({
    name: 'total_price',
    type: 'numeric',
    precision: 12,
    scale: 2,
  })
  totalPrice!: number;

  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: PaymentMethod,
    enumName: 'payment_method',
    default: PaymentMethod.CASH,
  })
  paymentMethod!: PaymentMethod;

  @Column({
    name: 'payment_status',
    type: 'enum',
    enum: PaymentStatus,
    enumName: 'payment_status',
    default: PaymentStatus.PENDING,
  })
  paymentStatus!: PaymentStatus;

  @Column({ name: 'voucher_id', type: 'uuid', nullable: true })
  voucherId?: string | null;

  @Column({ name: 'is_recurring', type: 'boolean', default: false })
  isRecurring!: boolean;

  @Column({
    name: 'recurring_rule',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  recurringRule?: string | null;

  @Column({
    name: 'cancelled_by',
    type: 'enum',
    enum: CancelledBy,
    enumName: 'cancelled_by',
    nullable: true,
  })
  cancelledBy?: CancelledBy | null;

  @Column({ name: 'cancelled_by_user_id', type: 'uuid', nullable: true })
  cancelledByUserId?: string | null;

  @Column({ name: 'checked_in_at', type: 'timestamp', nullable: true })
  checkedInAt?: Date | null;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt?: Date | null;

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
