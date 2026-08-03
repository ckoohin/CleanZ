import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Lối ra có kiểm soát cho khoản nợ bồi thường không thu hồi được.
 *
 * Sau khi auto-close bị chặn với sự cố còn nợ (để nợ không bốc hơi), hồ sơ của một Tasker
 * đã bỏ nghề sẽ nằm mãi ở COMPENSATED: chiếm hàng đợi Admin và bị đối soát quét vô hạn.
 * Write-off là lối ra: Admin ghi nhận nền tảng chịu mất khoản đó, có lý do + dấu vết.
 *
 * KHÔNG chuyển tiền: tiền đã rời ví SYSTEM từ lúc chi trả (SYSTEM gánh platformBorne +
 * uncovered). Write-off chỉ chuyển khoản "Tasker nợ ta" thành "nền tảng lỗ" — vì vậy phải
 * tách khỏi `uncovered_recovered_amount` (tiền thật thu về), nếu không con số thu hồi trong
 * báo cáo sẽ bị thổi phồng bằng khoản chưa bao giờ nhận được.
 *
 * Nợ tồn đọng ở mọi nơi = uncovered − recovered − written_off.
 */
export class AddIncidentDebtWriteOff1786600000000 implements MigrationInterface {
  name = 'AddIncidentDebtWriteOff1786600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "incidents"
        ADD COLUMN IF NOT EXISTS "uncovered_written_off_amount" numeric(12,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "debt_written_off_at" timestamp,
        ADD COLUMN IF NOT EXISTS "debt_write_off_reason" text,
        ADD COLUMN IF NOT EXISTS "debt_written_off_by_admin_id" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "incidents"
        ADD CONSTRAINT "fk_incidents_debt_written_off_by_admin"
        FOREIGN KEY ("debt_written_off_by_admin_id") REFERENCES "users"("id")
        ON DELETE SET NULL ON UPDATE CASCADE
    `);
    // Truy vấn nợ tồn đọng chạy ở guard rút tiền (mỗi lần Tasker rút) và ở housekeeping.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_inc_tasker_outstanding_debt"
        ON "incidents" ("tasker_id")
        WHERE COALESCE("uncovered_liability_amount", 0)
            > COALESCE("uncovered_recovered_amount", 0)
            + COALESCE("uncovered_written_off_amount", 0)
    `);

    await queryRunner.query(`
      INSERT INTO "system_configs" ("config_key", "config_value")
      VALUES ('INCIDENT_DEBT_WRITE_OFF_AFTER_DAYS', '90')
      ON CONFLICT ("config_key") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_inc_tasker_outstanding_debt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "incidents" DROP CONSTRAINT IF EXISTS "fk_incidents_debt_written_off_by_admin"`,
    );
    await queryRunner.query(`
      ALTER TABLE "incidents"
        DROP COLUMN IF EXISTS "uncovered_written_off_amount",
        DROP COLUMN IF EXISTS "debt_written_off_at",
        DROP COLUMN IF EXISTS "debt_write_off_reason",
        DROP COLUMN IF EXISTS "debt_written_off_by_admin_id"
    `);
    await queryRunner.query(
      `DELETE FROM "system_configs" WHERE "config_key" = 'INCIDENT_DEBT_WRITE_OFF_AFTER_DAYS'`,
    );
  }
}
