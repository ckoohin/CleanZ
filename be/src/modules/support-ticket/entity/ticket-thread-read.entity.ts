import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from 'src/modules/users/entities/user.entity';
import { TicketMessageAudience } from 'src/common/enums/ticket-message-audience.enum';
import { SupportTicketEntity } from './support-ticket.entity';
import { TicketMessageEntity } from './ticket-message.entity';

/**
 * Mốc "đã đọc" theo từng luồng (per-thread last-read) phục vụ read-receipt.
 * Mỗi (ticket, user, audience) giữ 1 dòng trỏ tới message cuối đã đọc.
 * Nhẹ hơn nhiều so với đánh dấu đã đọc từng message.
 */
@Entity('ticket_thread_reads')
@Unique('uq_ttr_ticket_user_audience', ['ticket', 'user', 'audience'])
@Index('idx_ttr_ticket', ['ticket'])
export class TicketThreadReadEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => SupportTicketEntity, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'ticket_id' })
  ticket!: SupportTicketEntity;

  @ManyToOne(() => UserEntity, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({
    name: 'audience',
    type: 'enum',
    enum: TicketMessageAudience,
    enumName: 'ticket_message_audience',
  })
  audience!: TicketMessageAudience;

  @ManyToOne(() => TicketMessageEntity, {
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'last_read_message_id' })
  lastReadMessage?: TicketMessageEntity | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'read_at', type: 'timestamp' })
  readAt!: Date;
}
