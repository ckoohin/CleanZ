import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TopupStatus } from 'src/common/enums/topup-status.enum';
import { CustomerEntity } from 'src/modules/customer/entity/customer.entity';
import { TaskerEntity } from 'src/modules/tasker/entity/tasker.entity';
import { WalletEntity } from './wallet.entity';

/**
 * Đơn nạp tiền vào ví Customer qua cổng thanh toán (hiện tại: PayOS).
 * Vòng đời: CREATED → COMPLETED | FAILED | CANCELLED | EXPIRED.
 * Chỉ cộng ví khi PayOS trả PAID — chốt idempotency bằng `walletTxId`.
 */
@Entity('wallet_topup_orders')
@Check(
  'CHK_topup_exactly_one_owner',
  `num_nonnulls("customer_id", "tasker_id") = 1`,
)
export class WalletTopupOrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_topup_customer_id')
  @Column({ type: 'uuid', name: 'customer_id', nullable: true })
  customerId!: string | null;

  @ManyToOne(() => CustomerEntity, {
    nullable: true,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'customer_id' })
  customer!: CustomerEntity | null;

  @Index('idx_topup_tasker_id')
  @Column({ type: 'uuid', name: 'tasker_id', nullable: true })
  taskerId!: string | null;

  @ManyToOne(() => TaskerEntity, {
    nullable: true,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'tasker_id',
    foreignKeyConstraintName: 'FK_topup_tasker',
  })
  tasker!: TaskerEntity | null;

  @Column({ type: 'uuid', name: 'wallet_id' })
  walletId!: string;

  @ManyToOne(() => WalletEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wallet_id' })
  wallet!: WalletEntity;

  /**
   * Cổng thanh toán. Đơn mới luôn là 'PAYOS' — đây là cổng duy nhất còn dùng.
   * Bản ghi cũ có thể mang 'PAYPAL'/'ADYEN'; giữ kiểu varchar để đọc lại được
   * lịch sử, không dựng enum để khỏi ràng buộc thêm giá trị đã chết.
   */
  @Column({ type: 'varchar', length: 20, default: 'PAYOS' })
  provider!: string;

  /** PayOS order code (số nguyên). */
  @Index('uq_topup_payos_order_code', { unique: true })
  @Column({
    type: 'bigint',
    nullable: true,
    name: 'payos_order_code',
  })
  payosOrderCode!: number | null;

  /** PayOS payment link ID. */
  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    name: 'payment_link_id',
  })
  paymentLinkId!: string | null;

  @Index('idx_topup_status')
  @Column({
    type: 'enum',
    enum: TopupStatus,
    enumName: 'topup_status',
    default: TopupStatus.CREATED,
  })
  status!: TopupStatus;

  /** Số tiền cộng vào ví (VND). */
  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'amount_vnd' })
  amountVnd!: number;

  /** Bút toán DEPOSIT đã ghi khi cộng ví — có giá trị ⇒ đã cộng, không cộng lần 2. */
  @Column({ type: 'uuid', nullable: true, name: 'wallet_tx_id' })
  walletTxId!: string | null;

  /** Nếu đơn nạp phát sinh từ luồng "thiếu tiền khi trả booking" (gợi ý UX). */
  @Column({ type: 'uuid', nullable: true, name: 'booking_id' })
  bookingId!: string | null;

  @Column({ type: 'text', nullable: true, name: 'fail_reason' })
  failReason!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
