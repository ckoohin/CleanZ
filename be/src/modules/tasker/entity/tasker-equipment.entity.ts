import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TaskerEntity } from './tasker.entity';
import { TaskerEquipmentType } from 'src/common/enums/tasker-equipment-type.enum';

export enum TaskerEquipmentIssueStatus {
  ISSUED = 'ISSUED',
  RETURNED = 'RETURNED',
  LOST = 'LOST',
}

@Entity('tasker_equipments')
export class TaskerEquipmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tasker_id', type: 'uuid' })
  taskerId!: string;

  @ManyToOne(() => TaskerEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tasker_id' })
  tasker!: TaskerEntity;

  @Column({
    name: 'equipment_type',
    type: 'enum',
    enum: TaskerEquipmentType,
    enumName: 'tasker_equipment_type_enum',
  })
  equipmentType!: TaskerEquipmentType;

  @Column({ name: 'size', type: 'varchar', length: 10, nullable: true })
  size?: string | null;

  @Column({
    name: 'status',
    type: 'enum',
    enum: TaskerEquipmentIssueStatus,
    enumName: 'tasker_equipment_issue_status_enum',
    default: TaskerEquipmentIssueStatus.ISSUED,
  })
  status!: TaskerEquipmentIssueStatus;

  @Column({
    name: 'unit_price',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  unitPrice!: number;

  @Column({
    name: 'issued_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  issuedAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
