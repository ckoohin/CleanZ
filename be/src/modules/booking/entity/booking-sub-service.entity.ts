import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BookingEntity } from './booking.entity';
import { SubServiceEntity } from 'src/modules/service/entity/sub-service.entity';

@Entity('booking_sub_services')
export class BookingSubServiceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'booking_id' })
  bookingId!: string;

  @Column({ type: 'uuid', name: 'sub_service_id' })
  subServiceId!: string;

  @ManyToOne(() => BookingEntity, (booking) => booking.bookingSubServices, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'booking_id' })
  booking!: BookingEntity;

  @ManyToOne(() => SubServiceEntity, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'sub_service_id' })
  subService!: SubServiceEntity;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
  })
  price!: number;

  @Column({
    type: 'numeric',
    precision: 4,
    scale: 1,
    name: 'duration_hours',
  })
  durationHours!: number;

  @Column({ type: 'int', default: 1 })
  quantity!: number;

  /**
   * true = dịch vụ này nằm trong gói mặc định
   * false = khách thêm thủ công
   */
  @Column({ name: 'is_default', type: 'boolean', default: true })
  isDefault!: boolean;

  /**
   * Khách bỏ tick (false) hay giữ (true) dịch vụ này
   */
  @Column({ name: 'is_selected', type: 'boolean', default: true })
  isSelected!: boolean;

  /**
   * Phụ phí riêng của dịch vụ con này (nếu có)
   */
  @Column({ name: 'extra_fee', type: 'numeric', precision: 12, scale: 2, default: 0 })
  extraFee!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
