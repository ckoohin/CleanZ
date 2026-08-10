import {
  Column,
  CreateDateColumn,
  Entity,
  EntityManager,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { CustomerEntity } from 'src/modules/customer/entity/customer.entity';
import { UserEntity } from 'src/modules/users/entities/user.entity';

export enum CustomerDebtSource {
  /** Nguồn đã tồn tại trên một số DB từ luồng customer no-show cũ; giữ để không làm hỏng dữ liệu lịch sử. */
  CUSTOMER_NO_SHOW_TRAVEL = 'CUSTOMER_NO_SHOW_TRAVEL',
  ABSENCE_COMPENSATION = 'ABSENCE_COMPENSATION',
}

export enum CustomerDebtStatus {
  OUTSTANDING = 'OUTSTANDING',
  RECOVERED = 'RECOVERED',
  WRITTEN_OFF = 'WRITTEN_OFF',
}

@Entity('customer_debts')
@Unique('uq_customer_debt_source', ['source', 'sourceRefId'])
@Index('idx_customer_debt_outstanding', ['customer', 'status'])
export class CustomerDebtEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => CustomerEntity, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer!: CustomerEntity;

  @Column({
    type: 'enum',
    enum: CustomerDebtSource,
    enumName: 'customer_debt_source',
  })
  source!: CustomerDebtSource;

  @Column({ name: 'source_ref_id', type: 'uuid' })
  sourceRefId!: string;

  @Column({ name: 'source_code', type: 'varchar', length: 40, nullable: true })
  sourceCode?: string | null;

  @Column({ name: 'original_amount', type: 'numeric', precision: 12, scale: 2 })
  originalAmount!: number;

  @Column({
    name: 'recovered_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  recoveredAmount!: number;

  @Column({
    name: 'written_off_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  writtenOffAmount!: number;

  @Column({
    type: 'enum',
    enum: CustomerDebtStatus,
    enumName: 'customer_debt_status',
    default: CustomerDebtStatus.OUTSTANDING,
  })
  status!: CustomerDebtStatus;

  @Column({ name: 'written_off_at', type: 'timestamp', nullable: true })
  writtenOffAt?: Date | null;

  @Column({ name: 'write_off_reason', type: 'text', nullable: true })
  writeOffReason?: string | null;

  @ManyToOne(() => UserEntity, {
    nullable: true,
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'written_off_by_admin_id' })
  writtenOffByAdmin?: UserEntity | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}

export function customerDebtOutstanding(debt: CustomerDebtEntity): number {
  return Math.max(
    0,
    Number(debt.originalAmount) -
      Number(debt.recoveredAmount) -
      Number(debt.writtenOffAmount),
  );
}

export async function sumOutstandingCustomerDebt(
  manager: EntityManager,
  customerId: string,
): Promise<number> {
  const row = await manager
    .getRepository(CustomerDebtEntity)
    .createQueryBuilder('d')
    .select(
      'COALESCE(SUM(d.original_amount - d.recovered_amount - d.written_off_amount), 0)',
      'total',
    )
    .where('d.customer_id = :customerId', { customerId })
    .andWhere('d.status = :status', {
      status: CustomerDebtStatus.OUTSTANDING,
    })
    .andWhere('d.source = :source', {
      source: CustomerDebtSource.ABSENCE_COMPENSATION,
    })
    .getRawOne<{ total: string }>();
  return Math.max(0, Number(row?.total ?? 0));
}
