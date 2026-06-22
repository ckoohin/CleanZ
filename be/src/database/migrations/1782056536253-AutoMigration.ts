import { MigrationInterface, QueryRunner } from 'typeorm';

export class AutoMigration1782056536253 implements MigrationInterface {
  name = 'AutoMigration1782056536253';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "services" DROP CONSTRAINT "FK_1f8d1173481678a035b4a81a4ec"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."policies_role_enum" AS ENUM('CUSTOMER', 'TASKER', 'ALL')`,
    );
    await queryRunner.query(
      `CREATE TABLE "policies" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(255) NOT NULL, "slug" character varying NOT NULL, "content" text NOT NULL, "role" "public"."policies_role_enum" NOT NULL DEFAULT 'ALL', "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_fbb46ad645d0f8767847530c8e3" UNIQUE ("slug"), CONSTRAINT "PK_603e09f183df0108d8695c57e28" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "pricing_configs" DROP COLUMN "price_unit"`,
    );
    await queryRunner.query(`ALTER TABLE "services" DROP COLUMN "category_id"`);
    await queryRunner.query(`ALTER TABLE "taskers" ADD "experience" text`);
    await queryRunner.query(`ALTER TABLE "taskers" ADD "skills" text`);
    await queryRunner.query(
      `ALTER TABLE "services" ALTER COLUMN "service_code" SET DEFAULT 'SRV-' || upper(substr(md5(random()::text), 1, 6))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "services" ALTER COLUMN "service_code" SET DEFAULT ('SRV-'|| upper(substr(md5((random())), 1, 6)))`,
    );
    await queryRunner.query(`ALTER TABLE "taskers" DROP COLUMN "skills"`);
    await queryRunner.query(`ALTER TABLE "taskers" DROP COLUMN "experience"`);
    await queryRunner.query(`ALTER TABLE "services" ADD "category_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "pricing_configs" ADD "price_unit" character varying(50) NOT NULL DEFAULT 'giờ'`,
    );
    await queryRunner.query(`DROP TABLE "policies"`);
    await queryRunner.query(`DROP TYPE "public"."policies_role_enum"`);
    await queryRunner.query(
      `ALTER TABLE "services" ADD CONSTRAINT "FK_1f8d1173481678a035b4a81a4ec" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }
}
