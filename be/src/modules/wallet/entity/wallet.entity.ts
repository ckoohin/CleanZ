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
import { WalletOwnerType } from 'src/common/enums/wallet-owner-type.enum';
import { CustomerEntity } from 'src/modules/customer/entity/customer.entity';
import { TaskerEntity } from 'src/modules/tasker/entity/tasker.entity';

@Entity('wallets')
@Index('idx_wallets_owner_type', ['ownerType'])
@Index('uq_wallets_customer', ['customer'], {
  unique: true,
  where: 'customer_id IS NOT NULL',
})
@Index('uq_wallets_tasker', ['tasker'], {
  unique: true,
  where: 'tasker_id IS NOT NULL',
})
@Index('uq_wallets_system', ['ownerType'], {
  unique: true,
  where: "owner_type = 'SYSTEM'",
})
@Check(
  'chk_wallet_owner',
  `
  (
    owner_type = 'CUSTOMER'
    AND customer_id IS NOT NULL
    AND tasker_id IS NULL
  )
  OR
  (
    owner_type = 'TASKER'
    AND tasker_id IS NOT NULL
    AND customer_id IS NULL
  )
  OR
  (
    owner_type = 'SYSTEM'
    AND customer_id IS NULL
    AND tasker_id IS NULL
  )
`,
)
export class WalletEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'owner_type',
    type: 'enum',
    enum: WalletOwnerType,
    enumName: 'wallet_owner_type',
  })
  ownerType!: WalletOwnerType;

  @ManyToOne(() => CustomerEntity, {
    nullable: true,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'customer_id' })
  customer?: CustomerEntity | null;

  @ManyToOne(() => TaskerEntity, {
    nullable: true,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'tasker_id' })
  tasker?: TaskerEntity | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  balance!: number;

  @Column({
    name: 'hold_balance',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  holdBalance!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
