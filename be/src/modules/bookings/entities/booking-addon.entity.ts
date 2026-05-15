import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BookingEntity } from './booking.entity';

@Entity('booking_addons')
export class BookingAddonEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => BookingEntity, (booking) => booking.addons, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'booking_id' })
  booking!: BookingEntity;

  @Column({ name: 'addon_name', type: 'varchar', length: 255 })
  addonName!: string;

  @Column({
    name: 'addon_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  addonPrice!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
