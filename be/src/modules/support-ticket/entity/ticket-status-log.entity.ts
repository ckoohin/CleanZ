import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SupportTicketStatus } from 'src/common/enums/support-ticket-status.enum';
import { UserEntity } from 'src/modules/users/entities/user.entity';
import { SupportTicketEntity } from './support-ticket.entity';

@Entity('ticket_status_logs')
@Index('idx_tsl_ticket', ['ticket', 'createdAt'])
export class TicketStatusLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => SupportTicketEntity, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'ticket_id' })
  ticket!: SupportTicketEntity;

  @Column({
    name: 'old_status',
    type: 'enum',
    enum: SupportTicketStatus,
    enumName: 'support_ticket_status',
    nullable: true,
  })
  oldStatus?: SupportTicketStatus | null;

  @Column({
    name: 'new_status',
    type: 'enum',
    enum: SupportTicketStatus,
    enumName: 'support_ticket_status',
  })
  newStatus!: SupportTicketStatus;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'changed_by_user_id' })
  changedBy?: UserEntity | null;

  @Column({ type: 'text', nullable: true })
  note?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
