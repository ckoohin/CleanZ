import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExtendWalletTopupForTasker1784500000000 implements MigrationInterface {
  name = 'ExtendWalletTopupForTasker1784500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "wallet_topup_orders" ALTER COLUMN "customer_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet_topup_orders" ADD COLUMN IF NOT EXISTS "tasker_id" uuid`,
    );
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_topup_tasker'
        ) THEN
          ALTER TABLE "wallet_topup_orders"
            ADD CONSTRAINT "FK_topup_tasker"
            FOREIGN KEY ("tasker_id") REFERENCES "taskers"("id")
            ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      ALTER TABLE "wallet_topup_orders"
        ADD CONSTRAINT "CHK_topup_exactly_one_owner"
        CHECK (num_nonnulls("customer_id", "tasker_id") = 1)
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_topup_tasker_id" ON "wallet_topup_orders" ("tasker_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_bookings_tasker_status_completed" ON "bookings" ("tasker_id", "status", "completed_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_wallet_transactions_wallet_type_created" ON "wallet_transactions" ("wallet_id", "type", "created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_wallet_transactions_wallet_type_created"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_bookings_tasker_status_completed"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_topup_tasker_id"`);
    await queryRunner.query(
      `ALTER TABLE "wallet_topup_orders" DROP CONSTRAINT IF EXISTS "CHK_topup_exactly_one_owner"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet_topup_orders" DROP CONSTRAINT IF EXISTS "FK_topup_tasker"`,
    );
    await queryRunner.query(
      `DELETE FROM "wallet_topup_orders" WHERE "tasker_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet_topup_orders" DROP COLUMN IF EXISTS "tasker_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet_topup_orders" ALTER COLUMN "customer_id" SET NOT NULL`,
    );
  }
}
