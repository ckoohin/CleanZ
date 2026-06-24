import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * S1 ChatBox — mô hình "Admin trung gian, 2 thread tách" + read-receipt.
 *
 *  - Enum `ticket_message_audience` (REPORTER/COUNTERPARTY/INTERNAL).
 *  - `ticket_messages.audience` (NOT NULL, default REPORTER). BACKFILL data cũ:
 *    is_internal=true → INTERNAL, ngược lại → REPORTER (luồng cũ chỉ reporter↔admin).
 *  - Bảng `ticket_thread_reads` (per-thread last-read) cho read-receipt.
 *
 * Idempotent (guard IF NOT EXISTS) + có down(). Xem [[cleanz-be-migrations]].
 */
export class TicketMessageAudience1782350000000 implements MigrationInterface {
  name = 'TicketMessageAudience1782350000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Enum audience (guard tránh lỗi khi chạy lại / đã có từ data.sql).
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_message_audience') THEN
          CREATE TYPE "ticket_message_audience" AS ENUM ('REPORTER','COUNTERPARTY','INTERNAL');
        END IF;
      END $$;
    `);

    // 2. Cột audience — thêm nullable, backfill, rồi siết NOT NULL + default.
    await queryRunner.query(
      `ALTER TABLE "ticket_messages" ADD COLUMN IF NOT EXISTS "audience" "ticket_message_audience"`,
    );
    await queryRunner.query(`
      UPDATE "ticket_messages"
      SET "audience" = CASE WHEN "is_internal" = true THEN 'INTERNAL'::"ticket_message_audience"
                            ELSE 'REPORTER'::"ticket_message_audience" END
      WHERE "audience" IS NULL
    `);
    await queryRunner.query(
      `ALTER TABLE "ticket_messages" ALTER COLUMN "audience" SET DEFAULT 'REPORTER'`,
    );
    await queryRunner.query(
      `ALTER TABLE "ticket_messages" ALTER COLUMN "audience" SET NOT NULL`,
    );

    // 3. Bảng read-state per-thread.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ticket_thread_reads" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "ticket_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "audience" "ticket_message_audience" NOT NULL,
        "last_read_message_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "read_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ticket_thread_reads" PRIMARY KEY ("id"),
        CONSTRAINT "uq_ttr_ticket_user_audience" UNIQUE ("ticket_id","user_id","audience"),
        CONSTRAINT "FK_ebcd0146eb782c460a62b87fd38" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "FK_1c8411a7167b32569456213c08d" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "FK_3b95fb7bd115c684569826aa649" FOREIGN KEY ("last_read_message_id") REFERENCES "ticket_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_ttr_ticket" ON "ticket_thread_reads" ("ticket_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "ticket_thread_reads"`);
    await queryRunner.query(
      `ALTER TABLE "ticket_messages" DROP COLUMN IF EXISTS "audience"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "ticket_message_audience"`);
  }
}
