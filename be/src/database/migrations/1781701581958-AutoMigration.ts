import { MigrationInterface, QueryRunner } from "typeorm";

export class AutoMigration1781701581958 implements MigrationInterface {
    name = 'AutoMigration1781701581958'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_notifications_user"`);
        await queryRunner.query(`DROP INDEX "public"."idx_bookings_status_schedule"`);
        await queryRunner.query(`DROP INDEX "public"."uq_notifications_dedupe_key"`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD "scheduled_start" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD "scheduled_end" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD "cancelled_by" "public"."cancelled_by"`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD "cancelled_by_user_id" uuid`);
        await queryRunner.query(`ALTER TABLE "peak_day_configs" ALTER COLUMN "peak_rate" SET DEFAULT '0.1'`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_9a8a82462cab47c73d25f49261f"`);
        await queryRunner.query(`DROP INDEX "public"."idx_notifications_user_read"`);
        await queryRunner.query(`DROP INDEX "public"."idx_notifications_user_created"`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "type" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "is_read" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "created_at" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "user_id" DROP NOT NULL`);
        await queryRunner.query(`CREATE INDEX "idx_notifications_user_created" ON "notifications" ("user_id", "created_at") `);
        await queryRunner.query(`CREATE INDEX "idx_notifications_user_read" ON "notifications" ("user_id", "is_read") `);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_9a8a82462cab47c73d25f49261f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_9a8a82462cab47c73d25f49261f"`);
        await queryRunner.query(`DROP INDEX "public"."idx_notifications_user_read"`);
        await queryRunner.query(`DROP INDEX "public"."idx_notifications_user_created"`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "user_id" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "created_at" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "is_read" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "type" DROP NOT NULL`);
        await queryRunner.query(`CREATE INDEX "idx_notifications_user_created" ON "notifications" ("created_at", "user_id") `);
        await queryRunner.query(`CREATE INDEX "idx_notifications_user_read" ON "notifications" ("is_read", "user_id") `);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_9a8a82462cab47c73d25f49261f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "peak_day_configs" ALTER COLUMN "peak_rate" SET DEFAULT 0.1`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "cancelled_by_user_id"`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "cancelled_by"`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "scheduled_end"`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "scheduled_start"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_notifications_dedupe_key" ON "notifications" ("dedupe_key") WHERE (dedupe_key IS NOT NULL)`);
        await queryRunner.query(`CREATE INDEX "idx_bookings_status_schedule" ON "bookings" ("scheduled_start_date", "scheduled_start_time", "status") `);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_notifications_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

}
