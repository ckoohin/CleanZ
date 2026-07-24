import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { TaskerEntity } from 'src/modules/tasker/entity/tasker.entity';
import { CustomerEntity } from './customer.entity';

/**
 * Danh sách tasker "yêu thích" do customer tự lưu. Dùng để ưu tiên ghép đơn:
 * đơn PREMIUM có `preferred_tasker_id` sẽ được mời riêng cho tasker đó trước
 * (ring 0), và các tasker yêu thích khác được xếp lên đầu ở các ring sau.
 *
 * Chỉ được thêm tasker đã từng hoàn thành ít nhất 1 đơn cho chính customer này
 * (kiểm tra ở FavoriteTaskerService) — tránh spam và đảm bảo có cơ sở đánh giá.
 */
@Entity('customer_favorite_taskers')
@Unique('UQ_customer_favorite_taskers', ['customerId', 'taskerId'])
export class CustomerFavoriteTaskerEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('IDX_customer_favorite_taskers_customer_id')
  @Column({ name: 'customer_id', type: 'uuid' })
  customerId!: string;

  @ManyToOne(() => CustomerEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer?: CustomerEntity;

  @Column({ name: 'tasker_id', type: 'uuid' })
  taskerId!: string;

  @ManyToOne(() => TaskerEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tasker_id' })
  tasker?: TaskerEntity;

  /** Ghi chú riêng của khách, ví dụ "làm bếp rất kỹ" */
  @Column({ name: 'note', type: 'varchar', length: 255, nullable: true })
  note?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
