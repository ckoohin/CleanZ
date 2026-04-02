import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { WorkerEntity } from './worker.entity';
import { WorkerDocumentType } from 'src/common/enums/type-docs-worker.enum';

@Entity('worker_documents')
export class WorkerDocumentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => WorkerEntity, (worker) => worker.documents, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'worker_id' })
  worker!: WorkerEntity;

  @Column({ type: 'enum', enum: WorkerDocumentType })
  type!: WorkerDocumentType;

  @Column({ name: 'file_public_id', type: 'text', nullable: true })
  filePublicId!: string | null;

  @Column({ name: 'file_url', type: 'text', nullable: true })
  fileUrl!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
