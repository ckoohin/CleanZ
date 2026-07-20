import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Bỏ cơ chế ký quỹ riêng của Tasker: số dư `taskers.current_deposit_balance`
 * được cộng thẳng vào ví (`wallets.balance`) — mỗi Tasker từ nay chỉ còn MỘT ví.
 * Điều kiện nhận đơn chuyển sang sàn số dư ví (system_configs.TASKER_MIN_ACCEPT_BALANCE_VND).
 *
 * Bảng `tasker_deposit_transactions` được giữ lại làm lịch sử (read-only), không ghi mới nữa.
 */
export class MergeTaskerDepositIntoWallet1783720000000 implements MigrationInterface {
  name = 'MergeTaskerDepositIntoWallet1783720000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Tasker chưa có ví (chưa từng phát sinh giao dịch) vẫn phải nhận được cọc → tạo ví rỗng.
    await queryRunner.query(`
      INSERT INTO wallets (owner_type, tasker_id, balance, hold_balance)
      SELECT 'TASKER'::wallets_owner_type_enum, t.id, 0, 0
      FROM taskers t
      LEFT JOIN wallets w ON w.tasker_id = t.id
      WHERE w.id IS NULL
        AND COALESCE(t.current_deposit_balance, 0) > 0
    `);

    // Bút toán cho phần cọc được gộp — để đối soát được về sau.
    await queryRunner.query(`
      INSERT INTO wallet_transactions (
        wallet_id, type, amount, balance_before, balance_after,
        reference_id, reference_type, description
      )
      SELECT
        w.id,
        'DEPOSIT_RELEASE'::wallet_transaction_type,
        t.current_deposit_balance,
        w.balance,
        w.balance + t.current_deposit_balance,
        t.id,
        'DEPOSIT_MERGE',
        'Gộp ký quỹ vào ví (bỏ cơ chế ký quỹ riêng)'
      FROM taskers t
      JOIN wallets w ON w.tasker_id = t.id
      WHERE COALESCE(t.current_deposit_balance, 0) > 0
    `);

    await queryRunner.query(`
      UPDATE wallets w
      SET balance = w.balance + t.current_deposit_balance,
          updated_at = NOW()
      FROM taskers t
      WHERE w.tasker_id = t.id
        AND COALESCE(t.current_deposit_balance, 0) > 0
    `);

    await queryRunner.query(`
      ALTER TABLE taskers
        DROP COLUMN IF EXISTS deposit_amount,
        DROP COLUMN IF EXISTS current_deposit_balance,
        DROP COLUMN IF EXISTS deposit_topup_due
    `);

    // Sàn số dư để nhận đơn: 50.000đ (thay cho ký quỹ 400.000đ trước đây).
    await queryRunner.query(`
      INSERT INTO system_configs (config_key, config_value, description)
      VALUES (
        'TASKER_MIN_ACCEPT_BALANCE_VND',
        '50000',
        'Số dư ví tối thiểu Tasker phải còn để được nhận đơn mới. Đặt 0 để tắt.'
      )
      ON CONFLICT (config_key) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE taskers
        ADD COLUMN IF NOT EXISTS deposit_amount numeric(12,2) NOT NULL DEFAULT 400000,
        ADD COLUMN IF NOT EXISTS current_deposit_balance numeric(12,2) NOT NULL DEFAULT 400000,
        ADD COLUMN IF NOT EXISTS deposit_topup_due TIMESTAMP
    `);

    // Rút lại phần đã gộp khỏi ví, trả về cột cọc (chỉ đảo đúng các bút toán DEPOSIT_MERGE).
    await queryRunner.query(`
      UPDATE taskers t
      SET current_deposit_balance = merged.amount
      FROM (
        SELECT reference_id AS tasker_id, SUM(amount) AS amount
        FROM wallet_transactions
        WHERE reference_type = 'DEPOSIT_MERGE'
        GROUP BY reference_id
      ) merged
      WHERE t.id = merged.tasker_id
    `);

    await queryRunner.query(`
      UPDATE wallets w
      SET balance = GREATEST(w.balance - merged.amount, 0),
          updated_at = NOW()
      FROM (
        SELECT wallet_id, SUM(amount) AS amount
        FROM wallet_transactions
        WHERE reference_type = 'DEPOSIT_MERGE'
        GROUP BY wallet_id
      ) merged
      WHERE w.id = merged.wallet_id
    `);

    await queryRunner.query(
      `DELETE FROM wallet_transactions WHERE reference_type = 'DEPOSIT_MERGE'`,
    );

    await queryRunner.query(
      `DELETE FROM system_configs WHERE config_key = 'TASKER_MIN_ACCEPT_BALANCE_VND'`,
    );
  }
}
