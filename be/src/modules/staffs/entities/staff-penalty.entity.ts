import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { StaffEntity } from './staff.entity';
import { User } from '../../users/entities/user.entity';
import { PenaltyType } from 'src/common/enums/penalty-type.enum';

@Entity('staff_penalties')
export class StaffPenaltyEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => StaffEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'staff_id' })
  staff!: StaffEntity;

  @Column({ type: 'text' })
  reason!: string;

  @Column({ type: 'enum', enum: PenaltyType })
  type!: PenaltyType;

  @Column({
    name: 'starts_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  startsAt!: Date;

  @Column({ name: 'ends_at', type: 'timestamp', nullable: true })
  endsAt!: Date | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdBy!: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
