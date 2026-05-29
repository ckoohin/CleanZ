import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { STAFF_PRESENCE_STATUS } from 'src/common/enums/staff-presence-status.enum';
import { StaffEntity } from './staff.entity';

@Entity('staff_presence')
export class StaffPresenceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne('StaffEntity', (staff: StaffEntity) => staff.staffPresence, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'staff_id' })
  staff!: StaffEntity;

  @Column({
    type: 'enum',
    enum: STAFF_PRESENCE_STATUS,
    default: STAFF_PRESENCE_STATUS.OFFLINE,
  })
  status!: STAFF_PRESENCE_STATUS;

  @Column({ name: 'is_busy', type: 'boolean', default: false })
  isBusy!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
