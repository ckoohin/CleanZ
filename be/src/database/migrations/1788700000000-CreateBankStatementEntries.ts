import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Sao kê ngân hàng nhập tay để đối chiếu với sổ chi ngoài (chi trả bồi thường thủ công).
 *
 * Đây là nguồn dữ liệu ĐỘC LẬP với thao tác của admin: trước bảng này, bằng chứng duy nhất
 * cho một khoản tiền rời ngân hàng là ảnh do chính người chi upload cộng con số do chính họ
 * gõ vào. Không có gì đối chiếu hai thứ đó với tiền thật.
 */
export class CreateBankStatementEntries1788700000000 implements MigrationInterface {
  name = 'CreateBankStatementEntries1788700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "bank_statement_direction" AS ENUM ('DEBIT', 'CREDIT');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "bank_statement_entry_status" AS ENUM ('UNMATCHED', 'MATCHED', 'IGNORED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "bank_statement_entries" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "bank_ref" text NOT NULL,
        "txn_at" timestamp NOT NULL,
        "direction" "bank_statement_direction" NOT NULL,
        "amount" numeric(14,2) NOT NULL,
        "counterparty_account" text,
        "counterparty_name" text,
        "description" text,
        "status" "bank_statement_entry_status" NOT NULL DEFAULT 'UNMATCHED',
        "matched_incident_id" uuid
          REFERENCES "incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        "matched_at" timestamp,
        "matched_by_admin_id" uuid
          REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        "note" text,
        "raw_line" text,
        "imported_by_admin_id" uuid
          REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        "created_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    // Chống nhập trùng: cùng một file sao kê import hai lần, hoặc hai kỳ chồng lấn ngày,
    // sẽ nhân đôi "tiền đã ra" và làm đối soát báo lệch ở chỗ vốn không lệch.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_bse_bank_ref"
        ON "bank_statement_entries" ("bank_ref")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_bse_status_txn_at"
        ON "bank_statement_entries" ("status", "txn_at" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_bse_matched_incident"
        ON "bank_statement_entries" ("matched_incident_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "bank_statement_entries"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "bank_statement_entry_status"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "bank_statement_direction"`);
  }
}
