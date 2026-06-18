import { MigrationInterface, QueryRunner } from 'typeorm';

export class AutoMigration1781635652818 implements MigrationInterface {
  name = 'AutoMigration1781635652818';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "withdrawals" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tasker_id" uuid NOT NULL, "amount" numeric(12,2) NOT NULL, "status" "public"."withdrawal_status" NOT NULL DEFAULT 'PENDING', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9871ec481baa7755f8bd8b7c7e9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "peak_day_configs" ALTER COLUMN "peak_rate" SET DEFAULT '0.1'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "peak_day_configs" ALTER COLUMN "peak_rate" SET DEFAULT 0.1`,
    );
    await queryRunner.query(`DROP TABLE "withdrawals"`);
  }
}
