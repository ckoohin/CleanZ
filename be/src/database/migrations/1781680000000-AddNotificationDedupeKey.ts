import { MigrationInterface, QueryRunner } from 'typeorm';

// Review P0-4 + P1-9 — idempotency lớp DB + index đọc.
// 1) Thêm cột dedupe_key + PARTIAL UNIQUE INDEX (chỉ khi dedupe_key IS NOT NULL)
//    → chống nhân đôi in-app khi job retry / enqueue lại (BullMQ jobId không đủ).
// 2) Thêm composite index (user_id, created_at DESC) cho truy vấn list mặc định.
// Idempotent (guarded) để chạy an toàn trên DB sạch lẫn DB đã seed.
export class AddNotificationDedupeKey1781680000000 implements MigrationInterface {
  name = 'AddNotificationDedupeKey1781680000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) Cột dedupe_key — giữ nguyên ':' của dedupeKey nghiệp vụ (không ràng buộc như BullMQ jobId)
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "dedupe_key" character varying(255);`,
    );

    // 2) Partial unique index: idempotency L2. NULL không bị ràng buộc → noti không-dedupe vẫn insert tự do.
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_notifications_dedupe_key"
         ON "notifications" ("dedupe_key") WHERE "dedupe_key" IS NOT NULL;`,
    );

    // 3) Composite index cho list mặc định (lọc theo user, sort created_at DESC)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_notifications_user_created"
         ON "notifications" ("user_id","created_at" DESC);`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_notifications_user_created";`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "uq_notifications_dedupe_key";`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP COLUMN IF EXISTS "dedupe_key";`,
    );
  }
}
