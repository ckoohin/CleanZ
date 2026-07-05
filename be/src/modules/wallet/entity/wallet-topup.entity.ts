import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TopupProvider } from 'src/common/enums/topup-provider.enum';
import { TopupStatus } from 'src/common/enums/topup-status.enum';
import { TaskerEntity } from 'src/modules/tasker/entity/tasker.entity';
import { WalletEntity } from './wallet.entity';

/**
 * Đơn nạp tiền vào ví tasker qua cổng thanh toán (mô hình 1 ví).
 * PayPal tính bằng USD (không hỗ trợ VND) nên lưu cả amountVnd/amountUsd/fxRate.
 * Ví chỉ được cộng đúng 1 lần/đơn (idempotent qua provider_order_id UNIQUE + status).
 */
@Entity('wallet_topups')
@Index('idx_wallet_topups_tasker', ['tasker'])
@Index('idx_wallet_topups_status', ['status'])
export class WalletTopupEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => TaskerEntity, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'tasker_id' })
  tasker!: TaskerEntity;

  @ManyToOne(() => WalletEntity, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'wallet_id' })
  wallet!: WalletEntity;

  @Column({ name: 'amount_vnd', type: 'numeric', precision: 12, scale: 2 })
  amountVnd!: number;

  @Column({ name: 'amount_usd', type: 'numeric', precision: 12, scale: 2 })
  amountUsd!: number;

  /** Tỷ giá quy đổi VND / 1 USD tại thời điểm tạo đơn. */
  @Column({ name: 'fx_rate', type: 'numeric', precision: 12, scale: 4 })
  fxRate!: number;

  @Column({
    type: 'enum',
    enum: TopupProvider,
    enumName: 'topup_provider',
    default: TopupProvider.PAYPAL,
  })
  provider!: TopupProvider;

  /** Mã đơn bên cổng (PayPal order id) — idempotency key. */
  @Index('uq_wallet_topups_provider_order', { unique: true })
  @Column({
    name: 'provider_order_id',
    type: 'varchar',
    length: 128,
    nullable: true,
  })
  providerOrderId?: string | null;

  /** Mã capture bên cổng (điền khi PAID). */
  @Column({
    name: 'provider_capture_id',
    type: 'varchar',
    length: 128,
    nullable: true,
  })
  providerCaptureId?: string | null;

  @Column({
    type: 'enum',
    enum: TopupStatus,
    enumName: 'topup_status',
    default: TopupStatus.PENDING,
  })
  status!: TopupStatus;

  /** Link thanh toán/redirect trả về cho FE. */
  @Column({ name: 'approve_url', type: 'text', nullable: true })
  approveUrl?: string | null;

  /** Payload webhook/verify gốc, phục vụ đối soát. */
  @Column({ name: 'raw_payload', type: 'jsonb', nullable: true })
  rawPayload?: Record<string, unknown> | null;

  /** Bút toán ví đã sinh (audit, chống cộng trùng). */
  @Column({ name: 'wallet_transaction_id', type: 'uuid', nullable: true })
  walletTransactionId?: string | null;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
