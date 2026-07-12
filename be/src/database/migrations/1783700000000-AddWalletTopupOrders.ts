import { MigrationInterface, QueryRunner } from 'typeorm';

/** Nạp tiền ví Customer qua PayPal — bảng đơn nạp `wallet_topup_orders`. */
export class AddWalletTopupOrders1783700000000 implements MigrationInterface {
  name = 'AddWalletTopupOrders1783700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='topup_status') THEN
          CREATE TYPE "topup_status" AS ENUM ('CREATED','COMPLETED','FAILED','CANCELLED','EXPIRED');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "wallet_topup_orders" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "customer_id" uuid NOT NULL,
        "wallet_id" uuid NOT NULL,
        "provider" varchar(20) NOT NULL DEFAULT 'PAYPAL',
        "paypal_order_id" varchar(64),
        "status" "topup_status" NOT NULL DEFAULT 'CREATED',
        "amount_vnd" numeric(12,2) NOT NULL,
        "amount_usd" numeric(12,2) NOT NULL,
        "fx_rate" numeric(12,2) NOT NULL,
        "capture_id" varchar(64),
        "wallet_tx_id" uuid,
        "booking_id" uuid,
        "fail_reason" text,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_wallet_topup_orders" PRIMARY KEY ("id"),
        CONSTRAINT "FK_topup_customer" FOREIGN KEY ("customer_id")
          REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "FK_topup_wallet" FOREIGN KEY ("wallet_id")
          REFERENCES "wallets"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_topup_paypal_order_id" ON "wallet_topup_orders" ("paypal_order_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_topup_customer_id" ON "wallet_topup_orders" ("customer_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_topup_status" ON "wallet_topup_orders" ("status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "wallet_topup_orders"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "topup_status"`);
  }
}
