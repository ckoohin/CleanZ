import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('peak_day_configs')
export class PeakDayConfigEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'start_at', type: 'timestamp', nullable: true })
  startAt?: Date | null;

  @Column({ name: 'end_at', type: 'timestamp', nullable: true })
  endAt?: Date | null;

  @Column({ name: 'start_time', type: 'time', nullable: true })
  startTime?: string | null;

  @Column({ name: 'end_time', type: 'time', nullable: true })
  endTime?: string | null;

  @Column({
    name: 'peak_rate',
    type: 'numeric',
    precision: 5,
    scale: 4,
    default: '0.1',
  })
  peakRate!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
