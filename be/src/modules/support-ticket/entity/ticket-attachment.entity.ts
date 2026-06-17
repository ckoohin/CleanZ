import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from 'src/modules/users/entities/user.entity';
import { SupportTicketEntity } from './support-ticket.entity';
import { TicketMessageEntity } from './ticket-message.entity';

@Entity('ticket_attachments')
@Index('idx_ta_ticket', ['ticket'])
export class TicketAttachmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => SupportTicketEntity, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'ticket_id' })
  ticket!: SupportTicketEntity;

  @ManyToOne(() => TicketMessageEntity, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'message_id' })
  message?: TicketMessageEntity | null;

  @Column({ type: 'text' })
  url!: string;

  @Column({ name: 'public_id', type: 'varchar', length: 255, nullable: true })
  publicId?: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'uploaded_by_user_id' })
  uploadedBy?: UserEntity | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
