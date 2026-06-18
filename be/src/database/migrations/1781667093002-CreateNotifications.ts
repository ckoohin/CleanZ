import { MigrationInterface, QueryRunner } from 'typeorm';

// Slice 1 / T1.4 — tạo enum notification_type + bảng notifications.
// Idempotent (guarded) để chạy an toàn trên cả DB sạch lẫn DB đã seed data.sql (DR-6).
export class CreateNotifications1781667093002 implements MigrationInterface {
  name = 'CreateNotifications1781667093002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) Enum notification_type — chỉ tạo nếu chưa có
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
          CREATE TYPE "public"."notification_type" AS ENUM (
            'BOOKING_CONFIRMED','TASKER_ON_THE_WAY','BOOKING_COMPLETED','BOOKING_CANCELLED',
            'PAYMENT_SUCCESS','PAYMENT_FAILED','INCIDENT_UPDATE','SUPPORT_REPLY','PROMOTION','SYSTEM'
          );
        END IF;
      END $$;
    `);

    // 2) Bảng notifications — khớp data.sql (KHÔNG có updated_at); FK đặt trong CREATE
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "type" "public"."notification_type" DEFAULT 'SYSTEM',
        "reference_id" uuid,
        "reference_type" character varying(50),
        "title" character varying(255) NOT NULL,
        "content" text,
        "is_read" boolean DEFAULT false,
        "created_at" TIMESTAMP DEFAULT now(),
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_notifications_reference_type" CHECK (
          "reference_type" IS NULL
          OR "reference_type" IN ('BOOKING','INCIDENT','SUPPORT_TICKET','PAYMENT')
        ),
        CONSTRAINT "FK_notifications_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    // 3) Index — khớp tên data.sql
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_notifications_user_id" ON "notifications" ("user_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_notifications_user_read" ON "notifications" ("user_id","is_read");`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_notifications_reference" ON "notifications" ("reference_id","reference_type");`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_notifications_created_at" ON "notifications" ("created_at");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_notifications_created_at";`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_notifications_reference";`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_notifications_user_read";`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_notifications_user_id";`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications";`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
          DROP TYPE "public"."notification_type";
        END IF;
      END $$;
    `);
  }
}
