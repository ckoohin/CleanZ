import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * P0.3 — Thu hồi nợ uncovered: `uncovered_recovered_amount` = phần nghĩa vụ Tasker còn nợ
 * (quỹ SYSTEM đã ứng) đã thu hồi được. Outstanding = uncovered_liability - uncovered_recovered.
 */
export class AddUncoveredRecoveredAmount1782910000000
  implements MigrationInterface
{
  name = 'AddUncoveredRecoveredAmount1782910000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "incidents"
      ADD COLUMN IF NOT EXISTS "uncovered_recovered_amount" numeric(12,2) NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "incidents" DROP COLUMN IF EXISTS "uncovered_recovered_amount"`,
    );
  }
}
