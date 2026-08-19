import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BookingWorkPhotoPhase } from 'src/common/enums/booking-work-photo-phase.enum';
import { UserEntity } from 'src/modules/users/entities/user.entity';
import { BookingEntity } from './booking.entity';

@Entity('booking_work_photos')
@Index('idx_bwp_booking_phase', ['booking', 'phase', 'sortOrder'])
export class BookingWorkPhotoEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => BookingEntity, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking!: BookingEntity;

  @Column({
    type: 'enum',
    enum: BookingWorkPhotoPhase,
    enumName: 'booking_work_photo_phase',
  })
  phase!: BookingWorkPhotoPhase;

  @Column({ name: 'file_url', type: 'text' })
  fileUrl!: string;

  @Column({ name: 'storage_public_id', type: 'text', nullable: true })
  storagePublicId?: string | null;

  @ManyToOne(() => UserEntity, {
    nullable: true,
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'uploaded_by_user_id' })
  uploadedBy?: UserEntity | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
