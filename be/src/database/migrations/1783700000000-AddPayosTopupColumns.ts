import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPayosTopupColumns1783700000000 implements MigrationInterface {
  name = 'AddPayosTopupColumns1783700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Thêm cột PayOS
    await queryRunner.query(
      `ALTER TABLE "wallet_topup_orders" ADD COLUMN IF NOT EXISTS "payos_order_code" bigint`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet_topup_orders" ADD COLUMN IF NOT EXISTS "payment_link_id" character varying(100)`,
    );

    // Unique index cho payos_order_code (bỏ qua nếu đã tồn tại)
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_topup_payos_order_code" ON "wallet_topup_orders" ("payos_order_code") WHERE "payos_order_code" IS NOT NULL`,
    );

    // amountUsd và fxRate thành nullable (các row PayOS không có giá trị này)
    await queryRunner.query(
      `ALTER TABLE "wallet_topup_orders" ALTER COLUMN "amount_usd" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet_topup_orders" ALTER COLUMN "fx_rate" DROP NOT NULL`,
    );

    // Đổi default provider sang PAYOS
    await queryRunner.query(
      `ALTER TABLE "wallet_topup_orders" ALTER COLUMN "provider" SET DEFAULT 'PAYOS'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "wallet_topup_orders" ALTER COLUMN "provider" SET DEFAULT 'PAYPAL'`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet_topup_orders" ALTER COLUMN "fx_rate" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet_topup_orders" ALTER COLUMN "amount_usd" SET NOT NULL`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_topup_payos_order_code"`);
    await queryRunner.query(
      `ALTER TABLE "wallet_topup_orders" DROP COLUMN IF EXISTS "payment_link_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet_topup_orders" DROP COLUMN IF EXISTS "payos_order_code"`,
    );
  }
}
