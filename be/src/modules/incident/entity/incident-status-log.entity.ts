import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { IncidentLogDimension } from 'src/common/enums/incident-log-dimension.enum';
import { IncidentEntity } from './incident.entity';
import { UserEntity } from 'src/modules/users/entities/user.entity';

@Entity('incident_status_logs')
@Index('idx_isl_incident', ['incident', 'createdAt'])
export class IncidentStatusLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => IncidentEntity, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'incident_id' })
  incident!: IncidentEntity;

  @Column({
    type: 'enum',
    enum: IncidentLogDimension,
    enumName: 'incident_log_dimension',
  })
  dimension!: IncidentLogDimension;

  @Column({ name: 'old_value', type: 'varchar', length: 50, nullable: true })
  oldValue?: string | null;

  @Column({ name: 'new_value', type: 'varchar', length: 50 })
  newValue!: string;

  @ManyToOne(() => UserEntity, {
    nullable: true,
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'changed_by_user_id' })
  changedBy?: UserEntity | null;

  @Column({ type: 'text', nullable: true })
  reason?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
