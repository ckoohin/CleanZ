import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { StaffEntity } from './staff.entity';
import { StaffDocumentType } from 'src/common/enums/type-docs-staff.enum';

@Entity('staff_documents')
export class StaffDocumentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne('StaffEntity', (staff: StaffEntity) => staff.documents, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'staff_id' })
  staff!: StaffEntity;

  @Column({ type: 'enum', enum: StaffDocumentType })
  type!: StaffDocumentType;

  @Column({ name: 'file_public_id', type: 'text', nullable: true })
  filePublicId!: string | null;

  @Column({ name: 'file_url', type: 'text', nullable: true })
  fileUrl!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
