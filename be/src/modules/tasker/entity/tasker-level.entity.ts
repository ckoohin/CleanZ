import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Bậc/level của tasker (Đồng, Bạc, Vàng, Kim cương…).
 * Tasker được gán level qua taskers.level_id dựa trên total_points >= min_points.
 */
@Entity('tasker_levels')
export class TaskerLevelEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50 })
  name!: string;

  @Column({ name: 'min_points', type: 'int', default: 0 })
  minPoints!: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  color?: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
