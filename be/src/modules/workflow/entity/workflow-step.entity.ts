import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ServiceWorkflowEntity } from './service-workflow.entity';

/**
 * Một bước trong quy trình làm việc (workflow step).
 * VD: "Bước 1 — Kiểm tra thiết bị", "Bước 2 — Lau sàn"...
 */
@Entity('workflow_steps')
export class WorkflowStepEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'workflow_id', type: 'uuid' })
  @Index()
  workflowId!: string;

  @ManyToOne(() => ServiceWorkflowEntity, (wf) => wf.steps, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'workflow_id' })
  workflow!: ServiceWorkflowEntity;

  /** Thứ tự bước (sắp xếp ASC) */
  @Column({ name: 'step_order', type: 'int', default: 1 })
  stepOrder!: number;

  /** Tiêu đề bước VD: "Kiểm tra dụng cụ" */
  @Column({ type: 'varchar', length: 200 })
  title!: string;

  /** Mô tả chi tiết việc cần làm trong bước này */
  @Column({ type: 'text', nullable: true })
  description?: string | null;

  /** Ước tính thời gian thực hiện bước (phút) */
  @Column({ name: 'duration_minutes', type: 'int', nullable: true })
  durationMinutes?: number | null;

  /** Bước bắt buộc phải hoàn thành (tasker không thể bỏ qua) */
  @Column({ name: 'is_required', type: 'boolean', default: true })
  isRequired!: boolean;

  /** Icon emoji hoặc tên icon (tuỳ FE quyết định render) */
  @Column({ type: 'varchar', length: 50, nullable: true })
  icon?: string | null;

  /**
   * Danh sách checklist con cho bước này.
   * VD: ["Kiểm tra máy hút bụi", "Kiểm tra dung dịch tẩy rửa"]
   */
  @Column({ name: 'checklist_items', type: 'jsonb', default: [] })
  checklistItems!: string[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
