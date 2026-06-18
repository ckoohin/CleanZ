import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { NotificationType } from 'src/common/enums/notification-type.enum';
import { NotificationRefType } from 'src/common/enums/notification-ref-type.enum';
import { UserEntity } from 'src/modules/users/entities/user.entity';

@Entity('notifications')
@Index('idx_notifications_user_id', ['user'])
@Index('idx_notifications_user_read', ['user', 'isRead'])
@Index('idx_notifications_user_created', ['user', 'createdAt'])
@Index('idx_notifications_reference', ['referenceId', 'referenceType'])
@Index('idx_notifications_created_at', ['createdAt'])
@Check(
  'CHK_notifications_reference_type',
  `"reference_type" IS NULL OR "reference_type" IN ('BOOKING','INCIDENT','SUPPORT_TICKET','PAYMENT')`,
)
export class NotificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => UserEntity, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({
    type: 'enum',
    enum: NotificationType,
    enumName: 'notification_type',
    default: NotificationType.SYSTEM,
  })
  type!: NotificationType;

  @Column({ name: 'reference_id', type: 'uuid', nullable: true })
  referenceId?: string | null;

  @Column({
    name: 'reference_type',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  referenceType?: NotificationRefType | null;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  content?: string | null;

  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead!: boolean;

  @Column({ name: 'dedupe_key', type: 'varchar', length: 255, nullable: true })
  dedupeKey?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
