import { MigrationInterface, QueryRunner } from 'typeorm';

/** P1.2 — Bảng yêu cầu rút tiền của Khách hàng (rút phần hoàn bồi thường từ ví). */
export class AddCustomerWithdrawalRequests1782930000000
  implements MigrationInterface
{
  name = 'AddCustomerWithdrawalRequests1782930000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='customer_withdrawal_requests_status_enum') THEN
          CREATE TYPE "customer_withdrawal_requests_status_enum" AS ENUM ('PENDING','APPROVED','REJECTED','PROCESSED');
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "customer_withdrawal_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "customer_id" uuid NOT NULL,
        "wallet_id" uuid NOT NULL,
        "amount" numeric(12,2) NOT NULL,
        "status" "customer_withdrawal_requests_status_enum" NOT NULL DEFAULT 'PENDING',
        "bank_account" varchar(255),
        "bank_name" varchar(100),
        "note" text,
        "admin_note" text,
        "proof_image_url" varchar(500),
        "reviewed_at" timestamp,
        "processed_at" timestamp,
        "created_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_customer_withdrawal_requests" PRIMARY KEY ("id"),
        CONSTRAINT "FK_cwr_customer" FOREIGN KEY ("customer_id")
          REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "FK_cwr_wallet" FOREIGN KEY ("wallet_id")
          REFERENCES "wallets"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_customer_withdrawal_customer_id" ON "customer_withdrawal_requests" ("customer_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_customer_withdrawal_wallet_id" ON "customer_withdrawal_requests" ("wallet_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_customer_withdrawal_status" ON "customer_withdrawal_requests" ("status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS "customer_withdrawal_requests"`,
    );
  }
}
