import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { WalletTransactionType } from 'src/common/enums/wallet-transaction-type.enum';
import { BookingEntity } from 'src/modules/booking/entity/booking.entity';
import { WalletEntity } from './wallet.entity';

@Entity('wallet_transactions')
@Index('idx_wallet_transactions_wallet_id', ['wallet'])
@Index('idx_wallet_transactions_booking_id', ['booking'])
@Index('idx_wallet_transactions_reference', ['referenceId', 'referenceType'])
@Index('idx_wallet_transactions_type', ['type'])
@Index('idx_wallet_transactions_created_at', ['createdAt'])
@Index('idx_wallet_transactions_wallet_type_created', [
  'wallet',
  'type',
  'createdAt',
])
export class WalletTransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => WalletEntity, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'wallet_id' })
  wallet!: WalletEntity;

  @ManyToOne(() => BookingEntity, {
    nullable: true,
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'booking_id' })
  booking?: BookingEntity | null;

  @Column({ name: 'reference_id', type: 'uuid', nullable: true })
  referenceId?: string | null;

  @Column({
    name: 'reference_type',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  referenceType?: string | null;

  @Column({
    type: 'enum',
    enum: WalletTransactionType,
    enumName: 'wallet_transaction_type',
  })
  type!: WalletTransactionType;

  /**
   * LUÔN là giá trị DƯƠNG, kể cả với bút toán trừ tiền — dấu nằm ở `balanceAfter -
   * balanceBefore`. Đừng cộng trực tiếp cột này để ra dòng tiền ròng; dùng
   * `signedAmount()` / `SIGNED_AMOUNT_SQL` bên dưới.
   */
  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount!: number;

  @Column({
    name: 'balance_before',
    type: 'numeric',
    precision: 12,
    scale: 2,
  })
  balanceBefore!: number;

  @Column({
    name: 'balance_after',
    type: 'numeric',
    precision: 12,
    scale: 2,
  })
  balanceAfter!: number;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  /**
   * Thao tác admin nào sinh ra bản ghi này. NULL = không phát sinh từ admin
   * (người dùng tự thao tác, hoặc cron/worker chạy nền). Được đóng dấu tự động
   * bởi `AuditCorrelationSubscriber`.
   */
  @Column({ name: 'audit_correlation_id', type: 'uuid', nullable: true })
  auditCorrelationId?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}

/**
 * Tác động RÒNG có dấu của một bút toán lên số dư ví: âm = tiền ra, dương = tiền vào.
 *
 * Cột `amount` luôn dương nên `SUM(amount)` cho ra tổng vô nghĩa (cộng cả tiền vào lẫn
 * tiền ra). Quy ước này trước đây chỉ nằm trong comment của service đối soát; tách ra
 * thành helper để mọi báo cáo mới dùng đúng ngay từ đầu.
 */
export function signedAmount(
  tx: Pick<WalletTransactionEntity, 'balanceBefore' | 'balanceAfter'>,
): number {
  return Number(tx.balanceAfter) - Number(tx.balanceBefore);
}

/** Bản SQL của `signedAmount` — dùng trong raw query/đối soát. */
export const SIGNED_AMOUNT_SQL = (alias = ''): string => {
  const p = alias ? `${alias}.` : '';
  return `(${p}balance_after - ${p}balance_before)`;
};
