import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * C6 — Bước gia hạn bắt buộc cho Tasker phản hồi draft bất lợi.
 * `tasker_response_extended_at` = thời điểm Admin đã cấp lần gia hạn (null = chưa).
 */
export class AddTaskerResponseExtendedAt1782880000000
  implements MigrationInterface
{
  name = 'AddTaskerResponseExtendedAt1782880000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "incidents"
      ADD COLUMN IF NOT EXISTS "tasker_response_extended_at" TIMESTAMP NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "incidents" DROP COLUMN IF EXISTS "tasker_response_extended_at"`,
    );
  }
}
