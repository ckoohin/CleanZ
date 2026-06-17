import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SupportTicketEntity } from './support-ticket.entity';

@Entity('ticket_surveys')
@Check('CHK_ticket_survey_rating', `"rating" BETWEEN 1 AND 5`)
export class TicketSurveyEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(() => SupportTicketEntity, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'ticket_id' })
  ticket!: SupportTicketEntity;

  @Column({ type: 'smallint', nullable: true })
  rating?: number | null;

  @Column({ type: 'text', nullable: true })
  comment?: string | null;

  @Column({ name: 'submitted_at', type: 'timestamp', nullable: true })
  submittedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
