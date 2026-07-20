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
 * Đơn nạp tiền vào ví Customer hoặc Tasker qua cổng thanh toán (PAYPAL | ADYEN).
 * Vòng đời: CREATED → COMPLETED | FAILED | CANCELLED | EXPIRED;
 * COMPLETED → REFUND_PENDING (Adyen refund bất đồng bộ) → REFUNDED.
 * Chỉ cộng ví khi gateway xác nhận thành công — chốt idempotency bằng `walletTxId`.
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

  @Column({ type: 'varchar', length: 20, default: 'PAYPAL' })
  provider!: string;

  @Index('uq_topup_paypal_order_id', { unique: true })
  @Column({
    type: 'varchar',
    length: 64,
    nullable: true,
    name: 'paypal_order_id',
  })
  paypalOrderId!: string | null;

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

  /** Số tiền charge qua PayPal (USD — sandbox). NULL với đơn VNPay (VND trực tiếp). */
  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    name: 'amount_usd',
  })
  amountUsd!: number | null;

  /** Tỉ giá VND/USD tại thời điểm tạo đơn (để đối soát). NULL với đơn VNPay. */
  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    name: 'fx_rate',
  })
  fxRate!: number | null;

  @Column({
    type: 'varchar',
    length: 64,
    nullable: true,
    name: 'capture_id',
  })
  captureId!: string | null;

  // ── Legacy VNPay (đã ngừng, giữ để tra cứu lịch sử) ─────────────────────
  /** vnp_transaction_no — mã giao dịch phía VNPay (cần khi refund/đối soát). */
  @Column({
    type: 'varchar',
    length: 32,
    nullable: true,
    name: 'gateway_txn_no',
  })
  gatewayTxnNo!: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true, name: 'bank_code' })
  bankCode!: string | null;

  /** vnp_pay_date raw (yyyyMMddHHmmss GMT+7) — bắt buộc khi gọi refund API. */
  @Column({ type: 'varchar', length: 14, nullable: true, name: 'pay_date' })
  payDate!: string | null;

  /** Thẻ đã lưu dùng cho đơn này (token_pay); NULL nếu nhập thẻ mới/PayPal. */
  @Column({ type: 'uuid', nullable: true, name: 'card_token_id' })
  cardTokenId!: string | null;

  // ── Adyen ────────────────────────────────────────────────────────────────
  /** id của Checkout Session Adyen dùng để mount Drop-in / đối chiếu return-confirm. */
  @Column({
    type: 'varchar',
    length: 48,
    nullable: true,
    name: 'adyen_session_id',
  })
  adyenSessionId!: string | null;

  /** pspReference của payment Adyen đã AUTHORISATION thành công (cần khi refund). */
  @Column({
    type: 'varchar',
    length: 32,
    nullable: true,
    name: 'adyen_psp_reference',
  })
  adyenPspReference!: string | null;

  /** pspReference của yêu cầu refund Adyen — dùng để khớp webhook REFUND trả về. */
  @Column({
    type: 'varchar',
    length: 32,
    nullable: true,
    name: 'adyen_refund_psp_reference',
  })
  adyenRefundPspReference!: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'refunded_at' })
  refundedAt!: Date | null;

  /** Mã giao dịch hoàn tiền VNPay trả về. */
  @Column({
    type: 'varchar',
    length: 32,
    nullable: true,
    name: 'refund_txn_no',
  })
  refundTxnNo!: string | null;

  /** Bút toán REFUND đã trừ ví — có giá trị ⇒ đã hoàn, không hoàn lần 2. */
  @Column({ type: 'uuid', nullable: true, name: 'refund_wallet_tx_id' })
  refundWalletTxId!: string | null;

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
