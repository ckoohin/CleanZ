import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { IncidentDecisionResponseReviewResult } from 'src/common/enums/incident-decision-response-review-result.enum';
import { IncidentDecisionResponseType } from 'src/common/enums/incident-decision-response-type.enum';
import { UserEntity } from 'src/modules/users/entities/user.entity';
import { IncidentEntity } from './incident.entity';
import { IncidentEvidenceEntity } from './incident-evidence.entity';

@Entity('incident_decision_responses')
@Index('idx_idr_incident_version', ['incident', 'decisionVersion'])
@Index(
  'uq_idr_incident_version_tasker',
  ['incident', 'decisionVersion', 'tasker'],
  {
    unique: true,
  },
)
export class IncidentDecisionResponseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => IncidentEntity, {
    nullable: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'incident_id' })
  incident!: IncidentEntity;

  @Column({ name: 'decision_version', type: 'int' })
  decisionVersion!: number;

  @ManyToOne(() => UserEntity, {
    nullable: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'tasker_id' })
  tasker!: UserEntity;

  @Column({
    name: 'response_type',
    type: 'enum',
    enum: IncidentDecisionResponseType,
    enumName: 'incident_decision_response_type',
  })
  responseType!: IncidentDecisionResponseType;

  @Column({ type: 'text', nullable: true })
  content?: string | null;

  @Column({ name: 'response_revision', type: 'int', default: 1 })
  responseRevision!: number;

  @Column({
    name: 'submitted_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  submittedAt!: Date;

  @ManyToOne(() => UserEntity, {
    nullable: true,
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'reviewed_by_admin_id' })
  reviewedByAdmin?: UserEntity | null;

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt?: Date | null;

  @Column({
    name: 'review_result',
    type: 'enum',
    enum: IncidentDecisionResponseReviewResult,
    enumName: 'incident_decision_response_review_result',
    nullable: true,
  })
  reviewResult?: IncidentDecisionResponseReviewResult | null;

  @Column({ name: 'admin_review_note', type: 'text', nullable: true })
  adminReviewNote?: string | null;

  @OneToMany(
    () => IncidentEvidenceEntity,
    (evidence) => evidence.decisionResponse,
  )
  evidences?: IncidentEvidenceEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
