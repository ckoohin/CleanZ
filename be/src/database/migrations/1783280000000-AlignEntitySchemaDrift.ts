import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlignEntitySchemaDrift1783280000000 implements MigrationInterface {
  name = 'AlignEntitySchemaDrift1783280000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vouchers" DROP CONSTRAINT IF EXISTS "fk_vouchers_service"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" DROP CONSTRAINT IF EXISTS "FK_820556fd3264ae9abfe7cbc0734"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" DROP COLUMN IF EXISTS "service_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_durations" ALTER COLUMN "fixed_price" DROP DEFAULT`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_blogs_category" ON "blogs" ("category_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_blogs_category"`);
    await queryRunner.query(
      `ALTER TABLE "service_durations" ALTER COLUMN "fixed_price" SET DEFAULT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" ADD COLUMN IF NOT EXISTS "service_id" uuid`,
    );
    await queryRunner.query(
      `DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_820556fd3264ae9abfe7cbc0734'
            AND conrelid = 'vouchers'::regclass
        ) THEN
          ALTER TABLE "vouchers" ADD CONSTRAINT "FK_820556fd3264ae9abfe7cbc0734" FOREIGN KEY ("service_id") REFERENCES "sub_services"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END $$;`,
    );
  }
}
