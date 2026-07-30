import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { TaskerEntity } from './tasker.entity';

@Entity('tasker_coverages')
@Index(['taskerId', 'districtCode'], { unique: true })
export class TaskerCoverageEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tasker_id', type: 'uuid' })
  taskerId!: string;

  @ManyToOne(() => TaskerEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tasker_id' })
  tasker!: TaskerEntity;

  @Column({ name: 'district_code', type: 'varchar', length: 20 })
  districtCode!: string;

  @Column({ name: 'city_code', type: 'varchar', length: 20, nullable: true })
  cityCode?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
