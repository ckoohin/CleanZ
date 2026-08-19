import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Idempotency guard: mỗi referenceType thuộc payment/topup/withdrawal chỉ được
 * ghi một lần cho mỗi (reference_id, wallet_id). Dùng partial unique index
 * để không ảnh hưởng đến ADJUSTMENT, ADMIN_ADJUSTMENT, PENALTY, v.v.
 * (vì các loại đó hợp lệ khi ghi nhiều lần trên cùng referenceId).
 */
export class AddWalletTxIdempotencyIndex1785500000000 implements MigrationInterface {
  name = 'AddWalletTxIdempotencyIndex1785500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Topup: mỗi đơn nạp chỉ được cộng ví một lần.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_wallet_tx_payos_topup"
      ON "wallet_transactions" ("wallet_id", "reference_id")
      WHERE "reference_type" = 'PAYOS_TOPUP'
    `);

    // Booking refund: mỗi booking chỉ được hoàn tiền một lần.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_wallet_tx_booking_online_refund"
      ON "wallet_transactions" ("wallet_id", "reference_id")
      WHERE "reference_type" = 'BOOKING_ONLINE_REFUND'
    `);
    // Withdrawal debit không có unique index vì admin có thể retry sau khi payout fail
    // (debit → rollback → debit lại — cùng reference_id, nhiều rows là hợp lệ).
    // Idempotency withdrawal được đảm bảo bởi pessimistic_write + check status=PENDING.
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_wallet_tx_payos_topup"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "uq_wallet_tx_booking_online_refund"`,
    );
  }
}
