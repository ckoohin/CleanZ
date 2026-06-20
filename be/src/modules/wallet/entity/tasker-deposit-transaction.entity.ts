import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TaskerDepositTransactionType } from 'src/common/enums/tasker-deposit-transaction-type.enum';
import { BookingEntity } from 'src/modules/booking/entity/booking.entity';
import { TaskerEntity } from 'src/modules/tasker/entity/tasker.entity';

@Entity('tasker_deposit_transactions')
@Index('idx_tasker_deposit_transactions_tasker', ['tasker'])
@Index('idx_tasker_deposit_transactions_booking', ['booking'])
export class TaskerDepositTransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => TaskerEntity, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'tasker_id' })
  tasker!: TaskerEntity;

  @ManyToOne(() => BookingEntity, {
    nullable: true,
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'booking_id' })
  booking?: BookingEntity | null;

  @Column({
    type: 'enum',
    enum: TaskerDepositTransactionType,
    enumName: 'tasker_deposit_transaction_type',
  })
  type!: TaskerDepositTransactionType;

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

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
