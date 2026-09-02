import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  BankStatementDirection,
  BankStatementEntryStatus,
} from 'src/common/enums/bank-statement-entry.enum';
import { IncidentEntity } from './incident.entity';
import { UserEntity } from 'src/modules/users/entities/user.entity';

/**
 * Một dòng SAO KÊ ngân hàng của công ty, nhập vào để đối chiếu với sổ chi ngoài.
 *
 * Vì sao cần: khoản bồi thường chi trả thủ công rời tài khoản ngân hàng, không có bút toán
 * ví nào. Trước bảng này, bằng chứng duy nhất là một tấm ảnh do chính người chi tiền upload
 * và một con số do chính họ gõ — không ai đối chiếu ảnh đó với tiền thật đã ra. Bảng này là
 * NGUỒN ĐỘC LẬP: dữ liệu đến từ ngân hàng, không từ thao tác của admin trên hệ thống.
 *
 * Một sự cố có thể khớp NHIỀU dòng (chuyển nhầm rồi chuyển bù là hai lần chuyển thật), nên
 * "đã đối chiếu" nghĩa là TỔNG các dòng khớp bằng tổng tiền admin khai đã rời ngân hàng.
 */
@Entity('bank_statement_entries')
@Index('idx_bse_status_txn_at', ['status', 'txnAt'])
@Index('idx_bse_matched_incident', ['matchedIncident'])
export class BankStatementEntryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Mã giao dịch do ngân hàng cấp. UNIQUE — chống nhập trùng khi cùng một file sao kê được
   * import hai lần, hoặc hai kỳ sao kê chồng lấn ngày.
   */
  @Column({ name: 'bank_ref', type: 'text' })
  bankRef!: string;

  @Column({ name: 'txn_at', type: 'timestamp' })
  txnAt!: Date;

  @Column({
    name: 'direction',
    type: 'enum',
    enum: BankStatementDirection,
    enumName: 'bank_statement_direction',
  })
  direction!: BankStatementDirection;

  /** Luôn DƯƠNG; chiều nằm ở `direction` (cùng quy ước với `wallet_transactions`). */
  @Column({ name: 'amount', type: 'numeric', precision: 14, scale: 2 })
  amount!: number;

  @Column({ name: 'counterparty_account', type: 'text', nullable: true })
  counterpartyAccount?: string | null;

  @Column({ name: 'counterparty_name', type: 'text', nullable: true })
  counterpartyName?: string | null;

  /** Nội dung chuyển khoản — nơi mã sự cố xuất hiện, dùng để gợi ý khớp. */
  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string | null;

  @Column({
    name: 'status',
    type: 'enum',
    enum: BankStatementEntryStatus,
    enumName: 'bank_statement_entry_status',
    default: BankStatementEntryStatus.UNMATCHED,
  })
  status!: BankStatementEntryStatus;

  @ManyToOne(() => IncidentEntity, {
    nullable: true,
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'matched_incident_id' })
  matchedIncident?: IncidentEntity | null;

  @Column({ name: 'matched_at', type: 'timestamp', nullable: true })
  matchedAt?: Date | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'matched_by_admin_id' })
  matchedByAdmin?: UserEntity | null;

  /** Lý do bỏ qua / gỡ khớp — thao tác nào cũng phải giải thích được về sau. */
  @Column({ name: 'note', type: 'text', nullable: true })
  note?: string | null;

  /** Dòng gốc trong file sao kê, giữ nguyên để truy vết khi nghi ngờ parse sai. */
  @Column({ name: 'raw_line', type: 'text', nullable: true })
  rawLine?: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'imported_by_admin_id' })
  importedByAdmin?: UserEntity | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
