import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * P0.2 — HOLD tại accept: lưu số tiền ví Tasker đã tạm giữ cho incident (để release đúng lúc
 * chốt/bồi thường/từ chối/đóng). Migration đầu tiên chạy SAU baseline (validate flow mới).
 */
export class AddTaskerWalletHoldAmount1782900000000
  implements MigrationInterface
{
  name = 'AddTaskerWalletHoldAmount1782900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "incidents"
      ADD COLUMN IF NOT EXISTS "tasker_wallet_hold_amount" numeric(12,2) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "incidents" DROP COLUMN IF EXISTS "tasker_wallet_hold_amount"`,
    );
  }
}
