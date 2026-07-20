import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * VNPay topup (token flow):
 * - topup_status thêm 'REFUNDED' (hoàn tiền về thẻ qua cổng).
 * - wallet_topup_orders: amount_usd/fx_rate nullable (VNPay tính VND trực tiếp)
 *   + các cột đối soát/refund của VNPay.
 * - Bảng mới vnpay_card_tokens: token thẻ đã lưu theo user (không lưu số thẻ thật).
 */
export class AddVnpayTopup1784600000000 implements MigrationInterface {
  name = 'AddVnpayTopup1784600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."topup_status" ADD VALUE IF NOT EXISTS 'REFUNDED'`,
    );

    await queryRunner.query(
      `ALTER TABLE "wallet_topup_orders" ALTER COLUMN "amount_usd" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet_topup_orders" ALTER COLUMN "fx_rate" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet_topup_orders" ADD COLUMN IF NOT EXISTS "gateway_txn_no" varchar(32)`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet_topup_orders" ADD COLUMN IF NOT EXISTS "bank_code" varchar(32)`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet_topup_orders" ADD COLUMN IF NOT EXISTS "pay_date" varchar(14)`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet_topup_orders" ADD COLUMN IF NOT EXISTS "card_token_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet_topup_orders" ADD COLUMN IF NOT EXISTS "refunded_at" timestamptz`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet_topup_orders" ADD COLUMN IF NOT EXISTS "refund_txn_no" varchar(32)`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet_topup_orders" ADD COLUMN IF NOT EXISTS "refund_wallet_tx_id" uuid`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "vnpay_card_tokens" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "token" varchar(128) NOT NULL,
        "card_number_masked" varchar(32),
        "bank_code" varchar(32),
        "card_type" varchar(4),
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        "deleted_at" timestamp,
        CONSTRAINT "PK_vnpay_card_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "FK_vnpay_card_tokens_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_vnpay_card_tokens_user_id" ON "vnpay_card_tokens" ("user_id")`,
    );
    // 1 user không lưu trùng 1 token đang hoạt động.
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_vnpay_card_tokens_user_token"
        ON "vnpay_card_tokens" ("user_id", "token") WHERE "deleted_at" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "vnpay_card_tokens"`);
    await queryRunner.query(
      `ALTER TABLE "wallet_topup_orders" DROP COLUMN IF EXISTS "refund_wallet_tx_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet_topup_orders" DROP COLUMN IF EXISTS "refund_txn_no"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet_topup_orders" DROP COLUMN IF EXISTS "refunded_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet_topup_orders" DROP COLUMN IF EXISTS "card_token_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet_topup_orders" DROP COLUMN IF EXISTS "pay_date"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet_topup_orders" DROP COLUMN IF EXISTS "bank_code"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet_topup_orders" DROP COLUMN IF EXISTS "gateway_txn_no"`,
    );
    // amount_usd/fx_rate: không SET NOT NULL lại được nếu đã có dòng VNPay (NULL).
    // Enum value 'REFUNDED' không drop được trong Postgres — chấp nhận giữ lại.
  }
}
