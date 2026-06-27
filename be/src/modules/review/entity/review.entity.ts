import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('reviews')
@Index('idx_reviews_tasker', ['taskerId'])
@Index('idx_reviews_created', ['createdAt'])
@Index('idx_reviews_booking', ['bookingId'], { unique: true })
@Index('idx_reviews_package', ['packageId'])
export class ReviewEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'booking_id', type: 'uuid' })
  bookingId!: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId!: string;

  @Column({ name: 'tasker_id', type: 'uuid' })
  taskerId!: string;

  @Column({ name: 'package_id', type: 'uuid', nullable: true })
  packageId?: string | null;

  @Column({ name: 'overall_rating', type: 'numeric', precision: 2, scale: 1 })
  overallRating!: number;

  @Column({ name: 'punctuality', type: 'int', default: 5 })
  punctuality!: number;

  @Column({ name: 'cleanliness', type: 'int', default: 5 })
  cleanliness!: number;

  @Column({ name: 'friendliness', type: 'int', default: 5 })
  friendliness!: number;

  @Column({ name: 'satisfaction', type: 'int', default: 5 })
  satisfaction!: number;

  @Column({ type: 'text', nullable: true })
  comment?: string | null;

  @Column({ name: 'is_anonymous', type: 'boolean', default: false })
  isAnonymous!: boolean;

  @Column({ name: 'images', type: 'simple-json', nullable: true })
  images?: string[] | null;

  @Column({ name: 'is_hidden', type: 'boolean', default: false })
  isHidden!: boolean;

  @Column({ name: 'admin_reply', type: 'text', nullable: true })
  adminReply?: string | null;

  @Column({ name: 'tasker_reply', type: 'text', nullable: true })
  taskerReply?: string | null;

  @Column({ name: 'tasker_replied_at', type: 'timestamp', nullable: true })
  taskerRepliedAt?: Date | null;

  @Column({ name: 'report_count', type: 'int', default: 0 })
  reportCount!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
