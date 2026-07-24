import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PeakBreakdownItem } from 'src/modules/pricing/services/pricing.service';
import { BookingServiceTier } from 'src/common/enums/booking-service-tier.enum';

/**
 * Snapshot giá tại thời điểm quote để "lock" giá cho tới khi customer xác nhận
 * đặt booking — tránh trường hợp admin đổi giá gói giữa lúc khách xem chi tiết
 * booking và lúc khách bấm xác nhận khiến giá hiển thị khác giá thực tính.
 */
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
    precision: 4,
    scale: 1,
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

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
