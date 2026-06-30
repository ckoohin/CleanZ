import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerformanceIndexes1782700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_tokens_user_type_expires"
        ON "tokens" ("userId", "type", "expires_at")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_bookings_customer_status"
        ON "bookings" ("customer_id", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_bookings_tasker_status"
        ON "bookings" ("tasker_id", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_bookings_scheduled_start"
        ON "bookings" ("scheduled_start")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_tokens_user_type_expires"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_bookings_customer_status"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_bookings_tasker_status"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_bookings_scheduled_start"`,
    );
  }
}
