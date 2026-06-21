import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeparateTaskerDepositFromWallet1782000000000 implements MigrationInterface {
  name = 'SeparateTaskerDepositFromWallet1782000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "tasker_deposit_transaction_type" AS ENUM (
          'CASH_COMMISSION_DEDUCT',
          'INCIDENT_COMPENSATION_DEDUCT',
          'TOP_UP',
          'TERMINATION_REFUND'
        );
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tasker_deposit_transactions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tasker_id" uuid NOT NULL,
        "booking_id" uuid,
        "type" "tasker_deposit_transaction_type" NOT NULL,
        "amount" numeric(12,2) NOT NULL,
        "balance_before" numeric(12,2) NOT NULL,
        "balance_after" numeric(12,2) NOT NULL,
        "description" text,
        "created_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tasker_deposit_transactions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tasker_deposit_transactions_tasker"
          FOREIGN KEY ("tasker_id") REFERENCES "taskers"("id")
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "FK_tasker_deposit_transactions_booking"
          FOREIGN KEY ("booking_id") REFERENCES "bookings"("id")
          ON DELETE SET NULL ON UPDATE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_tasker_deposit_transactions_tasker"
      ON "tasker_deposit_transactions" ("tasker_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_tasker_deposit_transactions_booking"
      ON "tasker_deposit_transactions" ("booking_id")
    `);

    await queryRunner.query(`
      UPDATE "wallets" AS wallet
      SET "balance" = GREATEST(
        wallet."balance" - legacy."initial_amount",
        0
      )
      FROM (
        SELECT "wallet_id", SUM("amount") AS "initial_amount"
        FROM "wallet_transactions"
        WHERE "type" = 'ADJUSTMENT'
          AND "description" = 'Initial demo tasker wallet balance'
        GROUP BY "wallet_id"
      ) AS legacy
      WHERE wallet."id" = legacy."wallet_id"
        AND wallet."owner_type" = 'TASKER'
    `);

    await queryRunner.query(`
      UPDATE "wallet_transactions" AS transaction
      SET
        "balance_before" = GREATEST(
          transaction."balance_before" - legacy."initial_amount",
          0
        ),
        "balance_after" = GREATEST(
          transaction."balance_after" - legacy."initial_amount",
          0
        )
      FROM (
        SELECT
          "wallet_id",
          SUM("amount") AS "initial_amount",
          MIN("created_at") AS "initial_created_at"
        FROM "wallet_transactions"
        WHERE "type" = 'ADJUSTMENT'
          AND "description" = 'Initial demo tasker wallet balance'
        GROUP BY "wallet_id"
      ) AS legacy
      WHERE transaction."wallet_id" = legacy."wallet_id"
        AND transaction."created_at" >= legacy."initial_created_at"
        AND NOT (
          transaction."type" = 'ADJUSTMENT'
          AND transaction."description" = 'Initial demo tasker wallet balance'
        )
    `);

    await queryRunner.query(`
      UPDATE "tasker_withdrawal_requests" AS withdrawal
      SET
        "status" = 'REJECTED',
        "note" = CONCAT(
          COALESCE(withdrawal."note" || ' | ', ''),
          'Tự động từ chối khi tách tiền ký quỹ khỏi ví thu nhập'
        ),
        "reviewed_at" = NOW()
      WHERE withdrawal."status" = 'PENDING'
        AND withdrawal."wallet_id" IN (
          SELECT DISTINCT "wallet_id"
          FROM "wallet_transactions"
          WHERE "type" = 'ADJUSTMENT'
            AND "description" = 'Initial demo tasker wallet balance'
        )
    `);

    await queryRunner.query(`
      DELETE FROM "wallet_transactions"
      WHERE "type" = 'ADJUSTMENT'
        AND "description" = 'Initial demo tasker wallet balance'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_tasker_deposit_transactions_booking"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_tasker_deposit_transactions_tasker"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "tasker_deposit_transactions"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "tasker_deposit_transaction_type"`,
    );
  }
}
