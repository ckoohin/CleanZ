import { AuditActorType } from 'src/common/enums/audit-actor-type.enum';
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

  /**
   * Ai gây ra bản ghi này. Được đóng dấu tự động bởi `AuditCorrelationSubscriber`.
   * NULL với bản ghi tạo trước khi có cột này — không backfill vì suy ngược sẽ
   * là bịa dữ liệu.
   */
  @Column({
    name: 'actor_type',
    type: 'enum',
    enum: AuditActorType,
    enumName: 'audit_actor_type',
    nullable: true,
  })
  actorType?: AuditActorType | null;

  /**
   * Thao tác admin nào sinh ra bản ghi này. NULL = không phát sinh từ admin
   * (người dùng tự thao tác, hoặc cron/worker chạy nền). Được đóng dấu tự động
   * bởi `AuditCorrelationSubscriber`.
   */
  @Column({ name: 'audit_correlation_id', type: 'uuid', nullable: true })
  auditCorrelationId?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
