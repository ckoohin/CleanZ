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

@Entity('workerDocuments')
export class WorkerDocumentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => WorkerEntity, (worker) => worker.documents, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'workerId' })
  worker!: WorkerEntity;

  @Column({ type: 'enum', enum: WorkerDocumentType })
  type!: WorkerDocumentType;

  @Column({ type: 'text' })
  filePath!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
