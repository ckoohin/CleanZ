import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Feature: Mô hình 1 ví + Nạp tiền PayPal (gộp 2 bước).
 *
 * up (idempotent, an toàn chạy lại):
 *  A. Mô hình 1 ví:
 *     - Dồn `taskers.current_deposit_balance` vào `wallets.balance` (tạo ví nếu chưa có),
 *       kèm bút toán ADJUSTMENT để truy vết.
 *     - Bỏ cột ký quỹ trên `taskers` + bảng `tasker_deposit_transactions` + enum.
 *     - Seed cấu hình `TASKER_MIN_WALLET_BALANCE = 50000` (số dư ví tối thiểu để nhận đơn).
 *  B. Nạp tiền: enum `topup_provider`/`topup_status` + bảng `wallet_topups` + index.
 */
export class WalletSingleModelAndTopups1782500000000
  implements MigrationInterface
{
  name = 'WalletSingleModelAndTopups1782500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ═══ A. MÔ HÌNH 1 VÍ ══════════════════════════════════════════════════════

    // A1. Dồn ký quỹ vào ví (chỉ chạy nếu cột ký quỹ còn tồn tại)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'taskers' AND column_name = 'current_deposit_balance'
        ) THEN
          -- tạo ví cho tasker có ký quỹ nhưng chưa có ví
          INSERT INTO "wallets" (id, owner_type, tasker_id, balance, hold_balance, created_at, updated_at)
          SELECT uuid_generate_v4(), 'TASKER', t.id, 0, 0, now(), now()
          FROM "taskers" t
          WHERE COALESCE(t.current_deposit_balance, 0) > 0
            AND NOT EXISTS (SELECT 1 FROM "wallets" w WHERE w.tasker_id = t.id);

          -- bút toán truy vết (dùng balance trước khi cộng)
          INSERT INTO "wallet_transactions"
            (id, wallet_id, type, amount, balance_before, balance_after, reference_id, reference_type, description, created_at)
          SELECT
            uuid_generate_v4(), w.id, 'ADJUSTMENT',
            t.current_deposit_balance,
            w.balance,
            w.balance + t.current_deposit_balance,
            t.id, 'DEPOSIT_MIGRATION',
            'Chuyển ký quỹ vào ví (bỏ hệ ký quỹ, dùng mô hình 1 ví)', now()
          FROM "taskers" t
          JOIN "wallets" w ON w.tasker_id = t.id
          WHERE COALESCE(t.current_deposit_balance, 0) > 0;

          -- cộng số dư
          UPDATE "wallets" w
          SET balance = w.balance + t.current_deposit_balance, updated_at = now()
          FROM "taskers" t
          WHERE w.tasker_id = t.id AND COALESCE(t.current_deposit_balance, 0) > 0;
        END IF;
      END $$;
    `);

    // A2. Bỏ schema ký quỹ
    await queryRunner.query(
      `ALTER TABLE "taskers" DROP COLUMN IF EXISTS "current_deposit_balance"`,
    );
    await queryRunner.query(
      `ALTER TABLE "taskers" DROP COLUMN IF EXISTS "deposit_amount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "taskers" DROP COLUMN IF EXISTS "deposit_topup_due"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "tasker_deposit_transactions"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."tasker_deposit_transaction_type"`,
    );

    // A3. Seed cấu hình số dư ví tối thiểu
    await queryRunner.query(`
      INSERT INTO "system_configs" (id, config_key, config_value, description, updated_at)
      VALUES (
        uuid_generate_v4(),
        'TASKER_MIN_WALLET_BALANCE',
        '50000',
        'Số dư ví tối thiểu (VND) tasker phải giữ để được nhận đơn tiền mặt',
        now()
      )
      ON CONFLICT (config_key) DO NOTHING;
    `);

    // ═══ B. BẢNG NẠP TIỀN (wallet_topups) ═════════════════════════════════════

    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE "public"."topup_provider" AS ENUM('PAYPAL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN CREATE TYPE "public"."topup_status" AS ENUM('PENDING', 'PAID', 'FAILED', 'EXPIRED', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "wallet_topups" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "tasker_id" uuid,
      "wallet_id" uuid,
      "amount_vnd" numeric(12,2) NOT NULL,
      "amount_usd" numeric(12,2) NOT NULL,
      "fx_rate" numeric(12,4) NOT NULL,
      "provider" "public"."topup_provider" NOT NULL DEFAULT 'PAYPAL',
      "provider_order_id" character varying(128),
      "provider_capture_id" character varying(128),
      "status" "public"."topup_status" NOT NULL DEFAULT 'PENDING',
      "approve_url" text,
      "raw_payload" jsonb,
      "wallet_transaction_id" uuid,
      "paid_at" TIMESTAMP,
      "created_at" TIMESTAMP NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_wallet_topups" PRIMARY KEY ("id"),
      CONSTRAINT "FK_wallet_topups_tasker" FOREIGN KEY ("tasker_id")
        REFERENCES "taskers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "FK_wallet_topups_wallet" FOREIGN KEY ("wallet_id")
        REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`);

    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_wallet_topups_provider_order" ON "wallet_topups" ("provider_order_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_wallet_topups_tasker" ON "wallet_topups" ("tasker_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_wallet_topups_status" ON "wallet_topups" ("status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // B (đảo ngược): bỏ bảng nạp tiền
    await queryRunner.query(`DROP TABLE IF EXISTS "wallet_topups"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."topup_status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."topup_provider"`);

    // A (đảo ngược): chỉ khôi phục lược đồ (KHÔNG tách lại tiền đã dồn vào ví)
    await queryRunner.query(
      `DELETE FROM "system_configs" WHERE config_key = 'TASKER_MIN_WALLET_BALANCE'`,
    );
    await queryRunner.query(
      `ALTER TABLE "taskers" ADD COLUMN IF NOT EXISTS "deposit_amount" numeric(12,2) NOT NULL DEFAULT 400000`,
    );
    await queryRunner.query(
      `ALTER TABLE "taskers" ADD COLUMN IF NOT EXISTS "current_deposit_balance" numeric(12,2) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "taskers" ADD COLUMN IF NOT EXISTS "deposit_topup_due" TIMESTAMP`,
    );
  }
}
