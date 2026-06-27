import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { SubServiceEntity } from '../../service/entity/sub-service.entity';
import { ServicePackageEntity } from '../../service/entity/service-package.entity';
import { WorkflowStepEntity } from './workflow-step.entity';

/**
 * Định nghĩa quy trình làm việc (workflow) cho một dịch vụ con hoặc gói dịch vụ.
 * Mỗi workflow gồm nhiều bước tuần tự (WorkflowStepEntity).
 */
@Entity('service_workflows')
export class ServiceWorkflowEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Workflow thuộc về dịch vụ con nào (nullable — có thể gắn vào package) */
  @Column({ name: 'sub_service_id', type: 'uuid', nullable: true })
  @Index('IDX_workflows_sub_service_id')
  subServiceId?: string | null;

  @ManyToOne(() => SubServiceEntity, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'sub_service_id',
    foreignKeyConstraintName: 'FK_workflows_sub_service',
  })
  subService?: SubServiceEntity;

  /** Workflow thuộc về gói dịch vụ nào (nullable) */
  @Column({ name: 'package_id', type: 'uuid', nullable: true })
  @Index('IDX_workflows_package_id')
  packageId?: string | null;

  @ManyToOne(() => ServicePackageEntity, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'package_id',
    foreignKeyConstraintName: 'FK_workflows_package',
  })
  package?: ServicePackageEntity;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @OneToMany(() => WorkflowStepEntity, (step) => step.workflow, {
    cascade: true,
    eager: false,
  })
  steps!: WorkflowStepEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
