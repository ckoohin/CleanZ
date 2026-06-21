import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Check,
} from 'typeorm';

@Entity('peak_day_configs')
@Check('chk_peak_day_range', '"start_at" < "end_at"')
export class PeakDayConfigEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'start_time', type: 'time', nullable: true })
  startTime?: string | null;

  @Column({ name: 'end_time', type: 'time', nullable: true })
  endTime?: string | null;

  @Index('idx_peak_day_configs_range')
  @Column({ type: 'timestamp', name: 'start_at', nullable: true })
  startAt?: Date | null;

  @Column({ type: 'timestamp', name: 'end_at', nullable: true })
  endAt?: Date | null;

  @Column({
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: () => '0.1',
    name: 'peak_rate',
    comment: 'Peak surcharge rate (e.g. 0.1 = +10%)',
  })
  peakRate!: number;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
