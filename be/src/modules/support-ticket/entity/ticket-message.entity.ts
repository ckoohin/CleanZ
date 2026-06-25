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
import { TicketMessageAudience } from 'src/common/enums/ticket-message-audience.enum';
import { SupportTicketEntity } from './support-ticket.entity';

@Entity('ticket_messages')
@Index('idx_tm_ticket', ['ticket', 'createdAt'])
export class TicketMessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => SupportTicketEntity, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'ticket_id' })
  ticket!: SupportTicketEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'sender_user_id' })
  sender?: UserEntity | null;

  @Column({ type: 'text' })
  body!: string;

  @Column({ name: 'is_internal', type: 'boolean', default: false })
  isInternal!: boolean;

  // Luồng hiển thị của message (REPORTER / COUNTERPARTY / INTERNAL).
  // Nguồn sự thật để định tuyến thread + scope realtime; `is_internal` giữ
  // đồng bộ (= audience===INTERNAL) cho tương thích logic cũ tới khi S2 refactor.
  @Column({
    name: 'audience',
    type: 'enum',
    enum: TicketMessageAudience,
    enumName: 'ticket_message_audience',
    default: TicketMessageAudience.REPORTER,
  })
  audience!: TicketMessageAudience;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
