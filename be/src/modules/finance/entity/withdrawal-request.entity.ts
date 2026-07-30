import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { WithdrawalStatus } from '../../../common/enums/with-drawal-status.enum';
import { WalletEntity } from '../../wallet/entity/wallet.entity';
import { TaskerEntity } from '../../tasker/entity/tasker.entity';

@Entity('tasker_withdrawal_requests')
export class WithdrawalRequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_tasker_withdrawal_tasker_id')
  @Column({ type: 'uuid', name: 'tasker_id' })
  taskerId!: string;

  @ManyToOne(() => TaskerEntity, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'tasker_id' })
  tasker!: TaskerEntity;

  @Index('idx_tasker_withdrawal_wallet_id')
  @Column({ type: 'uuid', name: 'wallet_id' })
  walletId!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount!: number;

  @Index('idx_tasker_withdrawal_status')
  @Column({
    type: 'enum',
    enum: WithdrawalStatus,
    default: WithdrawalStatus.PENDING,
  })
  status!: WithdrawalStatus;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'bank_account',
  })
  bankAccount!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'bank_name' })
  bankName!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'bank_bin' })
  bankBin!: string | null;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ type: 'text', nullable: true, name: 'admin_note' })
  adminNote!: string | null;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    name: 'proof_image_url',
  })
  proofImageUrl!: string | null;

  @Column({ type: 'timestamp', nullable: true, name: 'reviewed_at' })
  reviewedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true, name: 'processed_at' })
  processedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => WalletEntity, (w) => w.withdrawalRequests, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'wallet_id' })
  wallet!: WalletEntity;
}
