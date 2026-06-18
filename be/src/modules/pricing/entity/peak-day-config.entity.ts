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

  @Index('idx_peak_day_configs_range')
  @Column({ type: 'timestamp', name: 'start_at' })
  startAt!: Date;

  @Column({ type: 'timestamp', name: 'end_at' })
  endAt!: Date;

  @Column({
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: 1.0,
    name: 'peak_rate',
    comment: 'Price multiplier >= 1.0 (e.g. 1.2 = +20%)',
  })
  peakRate!: number;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
