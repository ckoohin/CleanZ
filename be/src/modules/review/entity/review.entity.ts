import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Đánh giá của khách hàng cho một booking đã hoàn thành.
 * overall_rating: điểm tổng (1.0–5.0). 4 tiêu chí phụ: 1–5.
 */
@Entity('reviews')
@Index('idx_reviews_tasker', ['taskerId'])
@Index('idx_reviews_created', ['createdAt'])
export class ReviewEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'booking_id', type: 'uuid' })
  bookingId!: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId!: string;

  @Column({ name: 'tasker_id', type: 'uuid' })
  taskerId!: string;

  @Column({
    name: 'overall_rating',
    type: 'numeric',
    precision: 2,
    scale: 1,
  })
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

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
