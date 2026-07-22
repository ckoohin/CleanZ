import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BookingSource } from 'src/common/enums/booking-source.enum';
import { BookingStatus } from 'src/common/enums/booking-status.enum';
import { PaymentMethod } from 'src/common/enums/payment-method.enum';
import { PaymentStatus } from 'src/common/enums/payment-status.enum';
import { CancelledBy } from 'src/common/enums/cancelled-by.enum';
import { BookingSurchargeStatus } from 'src/common/enums/booking-surcharge-status.enum';
import { BookingOvertimeRequestStatus } from 'src/common/enums/booking-overtime-request-status.enum';
import { CustomerAddressEntity } from 'src/modules/customer/entity/customer-address.entity';
import { CustomerEntity } from 'src/modules/customer/entity/customer.entity';
import { TaskerEntity } from 'src/modules/tasker/entity/tasker.entity';
import { ServicePackageEntity } from 'src/modules/service/entity/service-package.entity';
import { BookingSubServiceEntity } from './booking-sub-service.entity';

@Entity('bookings')
@Index('idx_bookings_tasker_status_completed', [
  'tasker',
  'status',
  'completedAt',
])
export class BookingEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'booking_code', type: 'varchar', length: 20, unique: true })
  bookingCode!: string;

  @ManyToOne(() => CustomerEntity, {
    nullable: true,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'customer_id' })
  customer?: CustomerEntity | null;

  @Column({ name: 'guest_name', type: 'varchar', length: 100, nullable: true })
  guestName?: string | null;

  @Column({ name: 'guest_phone', type: 'varchar', length: 20, nullable: true })
  guestPhone?: string | null;

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

  // Toạ độ đích của đơn. Đơn guest không có addressRef (không lưu sổ địa chỉ)
  // nên giữ lat/lng ngay trên đơn để tracking bản đồ hoạt động.
  @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true })
  latitude?: number | null;

  @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true })
  longitude?: number | null;

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
  @Column({
    name: 'area_m2',
    type: 'numeric',
    precision: 7,
    scale: 1,
    nullable: true,
  })
  areaM2?: number | null;

  /** Mức giá (pricing tier) được chọn khi đặt booking */
  @Column({ name: 'pricing_tier_id', type: 'uuid', nullable: true })
  pricingTierId?: string | null;

  @Column({ name: 'addon_ids', type: 'jsonb', nullable: true })
  addonIds?: string[] | null;

  @Column({
    type: 'enum',
    enum: BookingSource,
    enumName: 'booking_source',
    default: BookingSource.CUSTOMER_APP,
  })
  source!: BookingSource;

  @Column({ name: 'confirmation_deadline', type: 'timestamp', nullable: true })
  confirmationDeadline?: Date | null;

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

  /** Thời điểm tasker bấm checkout (yêu cầu hoàn thành) — mốc đo thời gian làm việc. */
  @Column({ name: 'checked_out_at', type: 'timestamp', nullable: true })
  checkedOutAt?: Date | null;

  /** Số phút làm vượt thời lượng đặt được tính tiền chính xác theo từng phút. */
  @Column({ name: 'overtime_minutes', type: 'int', default: 0 })
  overtimeMinutes!: number;

  /** Số phút kết thúc sớm so với thời lượng đặt. 0 nếu không sớm. */
  @Column({ name: 'early_minutes', type: 'int', default: 0 })
  earlyMinutes!: number;

  /** Trạng thái thu phần phát sinh: chờ khách, chờ tasker xác nhận, đã thu, tranh chấp... */
  @Column({
    name: 'surcharge_status',
    type: 'enum',
    enum: BookingSurchargeStatus,
    enumName: 'booking_surcharge_status',
    default: BookingSurchargeStatus.NONE,
  })
  surchargeStatus!: BookingSurchargeStatus;

  /** Lý do khách từ chối trả phần phát sinh (nếu có). */
  @Column({ name: 'surcharge_dispute_reason', type: 'text', nullable: true })
  surchargeDisputeReason?: string | null;

  /** Số tiền nền tảng đã ứng trả tasker khi khách không trả phần phát sinh. */
  @Column({
    name: 'platform_advance_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  platformAdvanceAmount!: number;

  // ── Yêu cầu thêm giờ gửi khách TRƯỚC khi làm ────────────────────────────────
  @Column({
    name: 'overtime_request_status',
    type: 'enum',
    enum: BookingOvertimeRequestStatus,
    enumName: 'booking_overtime_request_status',
    default: BookingOvertimeRequestStatus.NONE,
  })
  overtimeRequestStatus!: BookingOvertimeRequestStatus;

  /** Số phút tasker đang xin thêm ở yêu cầu gần nhất. */
  @Column({ name: 'overtime_request_minutes', type: 'int', default: 0 })
  overtimeRequestMinutes!: number;

  /** Báo giá của yêu cầu duyệt cũ; luồng thông báo mới luôn bằng 0. */
  @Column({
    name: 'overtime_request_fee',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  overtimeRequestFee!: number;

  @Column({ name: 'overtime_requested_at', type: 'timestamp', nullable: true })
  overtimeRequestedAt?: Date | null;

  @Column({ name: 'overtime_responded_at', type: 'timestamp', nullable: true })
  overtimeRespondedAt?: Date | null;

  /** Tổng số phút thêm giờ khách đã duyệt trước — thu chắc chắn, không hỏi lại. */
  @Column({ name: 'approved_overtime_minutes', type: 'int', default: 0 })
  approvedOvertimeMinutes!: number;

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
