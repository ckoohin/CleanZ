import {
  EntityManager,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { TaskerEntity } from 'src/modules/tasker/entity/tasker.entity';
import { UserEntity } from 'src/modules/users/entities/user.entity';

/** Nghiệp vụ sinh ra khoản nợ. Thêm loại mới chỉ cần thêm một giá trị ở đây. */
export enum TaskerDebtSource {
  /** Quỹ nền tảng đã ứng thay phần bồi thường mà ví Tasker không đủ. */
  INCIDENT_COMPENSATION = 'INCIDENT_COMPENSATION',
}

export enum TaskerDebtStatus {
  /** Còn phải trả. */
  OUTSTANDING = 'OUTSTANDING',
  /** Đã thu đủ bằng tiền thật. */
  RECOVERED = 'RECOVERED',
  /** Admin ghi nhận không thu được — nền tảng chịu mất. */
  WRITTEN_OFF = 'WRITTEN_OFF',
}

/**
 * SỔ NỢ của Tasker — vòng đời độc lập với hồ sơ sinh ra nó.
 *
 * Trước đây nợ sống ký sinh trên bảng `incidents` (3 cột), kéo theo ba hệ quả:
 *  1. Vòng đời sự cố và vòng đời nợ đánh nhau — auto-close phải bị chặn, rồi phải thêm
 *     luồng xoá nợ chỉ để gỡ tắc.
 *  2. Mọi truy vấn nợ phải đi vòng qua trạng thái sự cố (`status IN (…) AND resolved_at
 *     IS NOT NULL`) — điều kiện dễ vỡ, từng phải sửa ở 4 nơi.
 *  3. `wallet` phải import ngược vào `incident` chỉ để mượn công thức tính nợ — vi phạm
 *     phân tầng, vì tiền là việc của ví chứ không phải của sự cố.
 *
 * Tách ra: sự cố CHỈ phát sinh một khoản nợ rồi buông; ví sở hữu và tự thu.
 *
 * Lưu ý phân vai: `incidents.uncovered_liability_amount` vẫn ở lại bên sự cố vì đó là
 * ẢNH CHỤP tại thời điểm chi trả (thuộc hồ sơ quyết định, phục vụ đối soát). Còn phần
 * "đã thu / đã xoá / còn nợ" là dữ liệu SỐNG và thuộc về sổ này.
 */
@Entity('tasker_debts')
@Unique('uq_tasker_debt_source', ['source', 'sourceRefId'])
@Index('idx_tasker_debt_outstanding', ['tasker', 'status'])
export class TaskerDebtEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => TaskerEntity, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'tasker_id' })
  tasker!: TaskerEntity;

  @Column({
    type: 'enum',
    enum: TaskerDebtSource,
    enumName: 'tasker_debt_source',
  })
  source!: TaskerDebtSource;

  /** Id bản ghi nghiệp vụ gốc (vd: incident id). Cùng `source` là duy nhất. */
  @Column({ name: 'source_ref_id', type: 'uuid' })
  sourceRefId!: string;

  /** Mã hiển thị của bản ghi gốc (vd: IC-20260803-0001) — để log/UI không phải join. */
  @Column({ name: 'source_code', type: 'varchar', length: 40, nullable: true })
  sourceCode?: string | null;

  @Column({
    name: 'original_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
  })
  originalAmount!: number;

  /** Tiền THẬT đã thu lại được. */
  @Column({
    name: 'recovered_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  recoveredAmount!: number;

  /** Phần Admin xoá nợ — tách khỏi `recoveredAmount` để báo cáo thu hồi không bị thổi phồng. */
  @Column({
    name: 'written_off_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  writtenOffAmount!: number;

  @Column({
    type: 'enum',
    enum: TaskerDebtStatus,
    enumName: 'tasker_debt_status',
    default: TaskerDebtStatus.OUTSTANDING,
  })
  status!: TaskerDebtStatus;

  @Column({ name: 'written_off_at', type: 'timestamp', nullable: true })
  writtenOffAt?: Date | null;

  @Column({ name: 'write_off_reason', type: 'text', nullable: true })
  writeOffReason?: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'written_off_by_admin_id' })
  writtenOffByAdmin?: UserEntity | null;

  /**
   * Thao tác admin nào sinh ra bản ghi này. NULL = không phát sinh từ admin
   * (người dùng tự thao tác, hoặc cron/worker chạy nền). Được đóng dấu tự động
   * bởi `AuditCorrelationSubscriber`.
   */
  @Column({ name: 'audit_correlation_id', type: 'uuid', nullable: true })
  auditCorrelationId?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}

/** Nợ còn lại của một khoản. Một chỗ duy nhất định nghĩa, không rải rác SQL nữa. */
export function debtOutstanding(debt: TaskerDebtEntity): number {
  return Math.max(
    0,
    Number(debt.originalAmount) -
      Number(debt.recoveredAmount) -
      Number(debt.writtenOffAmount),
  );
}

/**
 * Tổng nợ còn phải trả của một Tasker.
 *
 * Để ở đây (cạnh entity) thay vì chỉ nằm trong `TaskerDebtService` vì `WalletService` và
 * `TaskerBalanceService` cũng cần — mà `TaskerDebtService` lại phụ thuộc ngược vào chúng.
 * Truy vấn thẳng repository nên không sinh phụ thuộc vòng.
 */
export async function sumOutstandingDebt(
  manager: EntityManager,
  taskerId: string,
): Promise<number> {
  const row = await manager
    .getRepository(TaskerDebtEntity)
    .createQueryBuilder('d')
    .select(
      'COALESCE(SUM(d.original_amount - d.recovered_amount - d.written_off_amount), 0)',
      'total',
    )
    .where('d.tasker_id = :taskerId', { taskerId })
    .andWhere('d.status = :status', { status: TaskerDebtStatus.OUTSTANDING })
    .getRawOne<{ total: string }>();
  return Math.max(0, Number(row?.total ?? 0));
}
