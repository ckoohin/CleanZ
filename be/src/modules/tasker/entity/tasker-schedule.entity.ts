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
import { TaskerShift } from 'src/common/enums/tasker-shift.enum';

@Entity('tasker_schedules')
@Index(['taskerId', 'dayOfWeek', 'shift'], { unique: true })
export class TaskerScheduleEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tasker_id', type: 'uuid' })
  taskerId!: string;

  @ManyToOne(() => TaskerEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tasker_id' })
  tasker!: TaskerEntity;

  @Column({ name: 'day_of_week', type: 'smallint' })
  dayOfWeek!: number;

  @Column({
    name: 'shift',
    type: 'enum',
    enum: TaskerShift,
    enumName: 'tasker_shift_enum',
  })
  shift!: TaskerShift;

  @Column({ name: 'is_available', type: 'boolean', default: true })
  isAvailable!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
