import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { IncidentEntity } from './incident.entity';
import { UserEntity } from 'src/modules/users/entities/user.entity';

@Entity('incident_statements')
@Index('idx_ist_incident', ['incident', 'createdAt'])
export class IncidentStatementEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => IncidentEntity, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'incident_id' })
  incident!: IncidentEntity;

  @ManyToOne(() => UserEntity, {
    nullable: true,
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'submitted_by_user_id' })
  submittedBy?: UserEntity | null;

  @Column({ type: 'text' })
  body!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
