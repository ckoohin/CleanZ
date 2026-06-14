import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum SupportTicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  CLOSED = 'CLOSED',
}

@Entity('support_tickets')
export class SupportTicketEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  subject!: string;

  @Column({
    type: 'enum',
    enum: SupportTicketStatus,
    enumName: 'support_ticket_status',
    default: SupportTicketStatus.OPEN,
  })
  status!: SupportTicketStatus;

  @Column({ name: 'overdue_at', type: 'timestamp', nullable: true })
  overdueAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
