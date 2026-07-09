import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BookingEntity } from './booking.entity';
import { ServiceAddonEntity } from 'src/modules/service/entity/service-addon.entity';

/**
 * Snapshot tên/giá của addon tại thời điểm đặt booking — không chỉ FK,
 * để báo cáo lịch sử vẫn đúng dù addon sau này bị đổi giá hoặc bị xoá.
 */
@Entity('booking_addons')
export class BookingAddonEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'booking_id' })
  bookingId!: string;

  @ManyToOne(() => BookingEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking!: BookingEntity;

  @Column({ type: 'uuid', name: 'addon_id', nullable: true })
  addonId?: string | null;

  @ManyToOne(() => ServiceAddonEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'addon_id' })
  addon?: ServiceAddonEntity | null;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  price!: number;

  @Column({ type: 'varchar', length: 50, name: 'price_unit', nullable: true })
  priceUnit?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
