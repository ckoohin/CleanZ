import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ResolutionType } from 'src/common/enums/resolution-type.enum';
import { UserEntity } from 'src/modules/users/entities/user.entity';
import { SupportTicketEntity } from './support-ticket.entity';

@Entity('ticket_resolutions')
@Index('idx_tr_ticket', ['ticket'])
export class TicketResolutionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => SupportTicketEntity, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'ticket_id' })
  ticket!: SupportTicketEntity;

  @Column({
    type: 'enum',
    enum: ResolutionType,
    enumName: 'resolution_type',
  })
  type!: ResolutionType;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  amount?: string | null;

  @Column({ name: 'voucher_id', type: 'uuid', nullable: true })
  voucherId?: string | null;

  @Column({ name: 'reclean_booking_id', type: 'uuid', nullable: true })
  recleanBookingId?: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'proposed_by_user_id' })
  proposedBy?: UserEntity | null;

  @Column({ name: 'wallet_transaction_id', type: 'uuid', nullable: true })
  walletTransactionId?: string | null;

  @Column({ type: 'text', nullable: true })
  note?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
