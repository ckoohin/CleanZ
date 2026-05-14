import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { StaffEntity } from './staff.entity';
import { ServiceEntity } from '../../services/entities/service.entity';
import { ServiceLocationType } from 'src/common/enums/service-location-type.enum';

@Entity('staff_services')
export class StaffServiceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => StaffEntity, (staff) => staff.staffServices, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'staff_id' })
  staff!: StaffEntity;

  @ManyToOne(() => ServiceEntity, { eager: true })
  @JoinColumn({ name: 'service_id' })
  service!: ServiceEntity;

  @Column({
    name: 'location_types',
    type: 'enum',
    enum: ServiceLocationType,
    array: true,
  })
  locationTypes!: ServiceLocationType[];

  @Column({
    name: 'custom_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  customPrice?: number;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'shop_address', type: 'text', nullable: true })
  shopAddress?: string;

  @Column({ name: 'is_available', type: 'boolean', default: true })
  isAvailable!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
