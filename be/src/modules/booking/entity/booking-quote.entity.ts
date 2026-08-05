import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PeakBreakdownItem } from 'src/modules/pricing/services/pricing.service';
import { BookingServiceTier } from 'src/common/enums/booking-service-tier.enum';
import { PaymentStatus } from 'src/common/enums/payment-status.enum';
import { BookingEntity } from './booking.entity';
import { CreateBookingDto } from '../dto/create-booking.dto';

/**
 * Snapshot giá tại thời điểm quote để "lock" giá cho tới khi customer xác nhận
 * đặt booking — tránh trường hợp admin đổi giá gói giữa lúc khách xem chi tiết
 * booking và lúc khách bấm xác nhận khiến giá hiển thị khác giá thực tính.
 *
 * Với thanh toán ONLINE (PayOS QR), quote còn đóng vai trò ĐƠN NHÁP: booking chỉ
 * được ghi vào bảng `bookings` sau khi cổng xác nhận đã thu tiền. Các cột
 * `payload` + `payos*` + `paymentState` chỉ có giá trị cho luồng này; quote
 * thường (chỉ khoá giá) để null.
 */
// Job dọn đơn nháp quét theo (payment_state, expires_at); partial index để quote
// thường (payment_state NULL) không làm phình index.
@Index('IDX_booking_quotes_draft_sweep', ['paymentState', 'expiresAt'], {
  where: '"payment_state" IS NOT NULL',
})
@Entity('booking_quotes')
export class BookingQuoteEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('IDX_booking_quotes_customer_id')
  @Column({ name: 'customer_id', type: 'uuid' })
  customerId!: string;

  // Hash các field ảnh hưởng tới giá — dùng để phát hiện customer đổi lựa chọn
  // (gói/addon/lịch...) so với lúc quote trước khi cho phép áp giá đã lock.
  @Column({ name: 'request_hash', type: 'varchar', length: 64 })
  requestHash!: string;

  @Column({ name: 'package_id', type: 'uuid', nullable: true })
  packageId?: string | null;

  /**
   * Hạng dịch vụ tại thời điểm quote. BẮT BUỘC lưu: `applyLockedQuote` ghi đè
   * `context.basePrice` bằng giá đã khoá, thiếu cột này thì khách quote PREMIUM
   * rồi tạo đơn STANDARD (hoặc ngược lại) sẽ nhận sai giá mà không có lỗi nào.
   */
  @Column({
    name: 'service_tier',
    type: 'enum',
    enum: BookingServiceTier,
    enumName: 'booking_service_tier',
    default: BookingServiceTier.STANDARD,
  })
  serviceTier!: BookingServiceTier;

  /** Phần chênh lệch do hạng PREMIUM, đã nằm trong `basePrice`. */
  @Column({
    name: 'premium_fee',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  premiumFee!: number;

  @Column({ name: 'pricing_tier_id', type: 'uuid', nullable: true })
  pricingTierId?: string | null;

  @Column({
    name: 'duration_hours',
    type: 'numeric',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  durationHours?: number | null;

  @Column({
    name: 'area_m2',
    type: 'numeric',
    precision: 7,
    scale: 1,
    nullable: true,
  })
  areaM2?: number | null;

  @Column({ name: 'base_price', type: 'numeric', precision: 12, scale: 2 })
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

  @Column({ name: 'peak_breakdown', type: 'jsonb', nullable: true })
  peakBreakdown?: PeakBreakdownItem[] | null;

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

  @Column({ name: 'subtotal', type: 'numeric', precision: 12, scale: 2 })
  subtotal!: number;

  @Column({
    name: 'discount_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  discountAmount!: number;

  @Column({ name: 'total_price', type: 'numeric', precision: 12, scale: 2 })
  totalPrice!: number;

  @Column({ name: 'voucher_id', type: 'uuid', nullable: true })
  voucherId?: string | null;

  @Index('IDX_booking_quotes_expires_at')
  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt!: Date;

  @Column({ name: 'used_at', type: 'timestamp', nullable: true })
  usedAt?: Date | null;

  // ── Chỉ dùng cho đơn nháp ONLINE (PayOS) ───────────────────────────────────

  /**
   * DTO gốc của khách. Giữ nguyên để lúc cổng báo PAID có thể validate lại toàn
   * bộ (lịch, quota, địa chỉ) trước khi tạo booking thật.
   */
  @Column({ name: 'payload', type: 'jsonb', nullable: true })
  payload?: CreateBookingDto | null;

  /** User đặt đơn — cần để ghi booking_status_logs và emit socket lúc materialize. */
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string | null;

  /** orderCode gửi PayOS — webhook tra ngược về đúng quote qua cột này. */
  @Index('UQ_booking_quotes_payos_order_code', { unique: true })
  @Column({ name: 'payos_order_code', type: 'bigint', nullable: true })
  payosOrderCode?: number | null;

  @Column({
    name: 'payment_link_id',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  paymentLinkId?: string | null;

  @Column({ name: 'qr_code', type: 'text', nullable: true })
  qrCode?: string | null;

  @Column({ name: 'checkout_url', type: 'text', nullable: true })
  checkoutUrl?: string | null;

  @Column({ name: 'bin', type: 'varchar', length: 10, nullable: true })
  bin?: string | null;

  @Column({
    name: 'account_number',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  accountNumber?: string | null;

  @Column({
    name: 'account_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  accountName?: string | null;

  /**
   * Trạng thái thu tiền của đơn nháp:
   * PENDING  — đang chờ khách quét QR
   * PAID     — đã thu tiền và đã tạo booking (`bookingId` có giá trị)
   * FAILED   — hết hạn/huỷ thanh toán, link đã đóng, không tạo booking
   * REFUNDED — đã thu tiền nhưng không tạo được booking → đã hoàn vào ví khách
   */
  @Column({
    name: 'payment_state',
    type: 'enum',
    enum: PaymentStatus,
    enumName: 'payment_status',
    nullable: true,
  })
  paymentState?: PaymentStatus | null;

  /** Booking được tạo ra từ đơn nháp này. */
  @Column({ name: 'booking_id', type: 'uuid', nullable: true })
  bookingId?: string | null;

  @ManyToOne(() => BookingEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'booking_id' })
  booking?: BookingEntity | null;

  /** Lý do đã thu tiền nhưng không tạo được booking — dùng để đối soát. */
  @Column({ name: 'fail_reason', type: 'text', nullable: true })
  failReason?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
