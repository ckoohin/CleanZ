import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CustomerEntity } from './customer.entity';

@Entity('customer_addresses')
export class CustomerAddressEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => CustomerEntity, (customer) => customer.addresses, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'customer_id' })
  customer!: CustomerEntity;

  @Column({ type: 'varchar', length: 100, nullable: true })
  label?: string | null;

  @Column({ name: 'full_address', type: 'text' })
  fullAddress!: string;

  @Column({ name: 'ward_detail', type: 'varchar', length: 255, nullable: true })
  wardDetail?: string | null;

  @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true })
  latitude?: number | null;

  @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true })
  longitude?: number | null;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault!: boolean;

  @Column({ name: 'has_pet', type: 'boolean', default: false })
  hasPet!: boolean;

  @Column({
    name: 'contact_name',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  contactName?: string | null;

  @Column({
    name: 'contact_phone',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  contactPhone?: string | null;

  @Column({
    name: 'building_floor',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  buildingFloor?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  gate?: string | null;

  @Column({ name: 'driver_note', type: 'text', nullable: true })
  driverNote?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
