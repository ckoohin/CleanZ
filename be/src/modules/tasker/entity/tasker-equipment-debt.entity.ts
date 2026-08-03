import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  PrimaryColumn,
} from 'typeorm';
import { TaskerEntity } from './tasker.entity';

@Entity('tasker_equipment_debts')
export class TaskerEquipmentDebtEntity {
  @PrimaryColumn({ name: 'tasker_id', type: 'uuid' })
  taskerId!: string;

  @OneToOne(() => TaskerEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tasker_id' })
  tasker!: TaskerEntity;

  @Column({
    name: 'total_debt',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  totalDebt!: number;

  @Column({
    name: 'paid_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  paidAmount!: number;

  @Column({ name: 'is_cleared', type: 'boolean', default: false })
  isCleared!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
