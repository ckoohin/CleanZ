import { User } from 'src/modules/users/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

@Entity('customer_profiles')
export class CustomerEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ nullable: true, type: 'varchar', length: 255 })
  address?: string;

  @Column({ nullable: true, type: 'varchar', length: 11 })
  phone?: string;

  @Column({ type: 'enum', enum: Gender, nullable: true })
  gender?: Gender;

  @Column({ name: 'total_booking', type: 'int', default: 0 })
  totalBooking!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
