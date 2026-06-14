import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PaymentMethod } from 'src/common/enums/payment-method.enum';
import { CustomerAddressEntity } from './customer-address.entity';
import { UserEntity } from 'src/modules/users/entities/user.entity';

@Entity('customers')
export class CustomerEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(() => UserEntity, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({
    name: 'default_payment_method',
    type: 'enum',
    enum: PaymentMethod,
    enumName: 'payment_method',
    default: PaymentMethod.CASH,
  })
  defaultPaymentMethod!: PaymentMethod;

  @Column({ name: 'total_bookings', type: 'int', default: 0 })
  totalBookings!: number;

  @Column({ name: 'total_cancelled', type: 'int', default: 0 })
  totalCancelled!: number;

  @OneToMany(() => CustomerAddressEntity, (address) => address.customer)
  addresses?: CustomerAddressEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
