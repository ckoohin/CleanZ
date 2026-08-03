import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Giữ (HOLD) hoa hồng đơn TIỀN MẶT ngay khi Tasker nhận đơn, thay vì chỉ kiểm tra số dư.
 *
 * Trước đây: nhận đơn chỉ `assertCanCoverCashCommission` (kiểm rồi thôi), tới lúc quyết
 * toán mới `deductCashCommission`. Nếu số dư tụt ở giữa (rút tiền, thu hồi nợ bồi thường,
 * nhận thêm đơn tiền mặt khác) thì trừ thất bại và **rollback cả việc hoàn tất booking** —
 * đúng lúc việc đã làm xong và khách đã trả tiền. Đây là thời điểm tệ nhất để fail.
 *
 * Sau khi giữ tại thời điểm nhận đơn: thiếu tiền thì fail SỚM (chưa ai mất công), còn lúc
 * quyết toán chỉ `captureHeldFunds` — không thể thất bại vì tiền đã nằm sẵn trong hold.
 */
export class HoldCashCommissionOnAccept1786800000000 implements MigrationInterface {
  name = 'HoldCashCommissionOnAccept1786800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "bookings"
        ADD COLUMN IF NOT EXISTS "tasker_commission_hold_amount" numeric(12,2)
    `);
    // Sweep dọn hold sót của booking đã kết thúc quét theo cột này.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_bookings_commission_hold"
        ON "bookings" ("tasker_commission_hold_amount")
        WHERE COALESCE("tasker_commission_hold_amount", 0) > 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_bookings_commission_hold"`,
    );
    await queryRunner.query(`
      ALTER TABLE "bookings" DROP COLUMN IF EXISTS "tasker_commission_hold_amount"
    `);
  }
}
