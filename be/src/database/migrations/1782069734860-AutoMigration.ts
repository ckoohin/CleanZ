import { MigrationInterface, QueryRunner } from 'typeorm';

export class AutoMigration1782069734860 implements MigrationInterface {
  name = 'AutoMigration1782069734860';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "services" DROP CONSTRAINT "FK_1f8d1173481678a035b4a81a4ec"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pricing_configs" DROP COLUMN "price_unit"`,
    );
    await queryRunner.query(
      `ALTER TABLE "services" DROP COLUMN "category_id"`,
    );
    await queryRunner.query(`ALTER TABLE "taskers" ADD "experience" text`);
    await queryRunner.query(`ALTER TABLE "taskers" ADD "skills" text`);

    await queryRunner.query(
      `ALTER TYPE "public"."booking_status" RENAME TO "booking_status_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."booking_status" AS ENUM('POSTED', 'CONFIRMED', 'TASKER_ON_THE_WAY', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'EXPIRED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ALTER COLUMN "status" TYPE "public"."booking_status" USING "status"::"text"::"public"."booking_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_status_logs" ALTER COLUMN "old_status" TYPE "public"."booking_status" USING "old_status"::"text"::"public"."booking_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_status_logs" ALTER COLUMN "new_status" TYPE "public"."booking_status" USING "new_status"::"text"::"public"."booking_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ALTER COLUMN "status" SET DEFAULT 'POSTED'`,
    );
    await queryRunner.query(`DROP TYPE "public"."booking_status_old"`);

    await queryRunner.query(
      `ALTER TABLE "services" ALTER COLUMN "service_code" SET DEFAULT 'SRV-' || upper(substr(md5(random()::text), 1, 6))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."booking_status" RENAME TO "booking_status_new"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."booking_status" AS ENUM('PENDING_PAYMENT', 'POSTED', 'CONFIRMED', 'TASKER_ON_THE_WAY', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'EXPIRED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ALTER COLUMN "status" TYPE "public"."booking_status" USING "status"::"text"::"public"."booking_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_status_logs" ALTER COLUMN "old_status" TYPE "public"."booking_status" USING "old_status"::"text"::"public"."booking_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_status_logs" ALTER COLUMN "new_status" TYPE "public"."booking_status" USING "new_status"::"text"::"public"."booking_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ALTER COLUMN "status" SET DEFAULT 'POSTED'`,
    );
    await queryRunner.query(`DROP TYPE "public"."booking_status_new"`);

    await queryRunner.query(
      `ALTER TABLE "services" ALTER COLUMN "service_code" SET DEFAULT ('SRV-'|| upper(substr(md5((random())), 1, 6)))`,
    );
    await queryRunner.query(`ALTER TABLE "taskers" DROP COLUMN "skills"`);
    await queryRunner.query(`ALTER TABLE "taskers" DROP COLUMN "experience"`);
    await queryRunner.query(`ALTER TABLE "services" ADD "category_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "pricing_configs" ADD "price_unit" character varying(50) NOT NULL DEFAULT 'giờ'`,
    );
    await queryRunner.query(
      `ALTER TABLE "services" ADD CONSTRAINT "FK_1f8d1173481678a035b4a81a4ec" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }
}
