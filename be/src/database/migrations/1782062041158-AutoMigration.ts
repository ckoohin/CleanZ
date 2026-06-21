import { MigrationInterface, QueryRunner } from "typeorm";

export class AutoMigration1782062041158 implements MigrationInterface {
    name = 'AutoMigration1782062041158'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "services" DROP CONSTRAINT "FK_1f8d1173481678a035b4a81a4ec"`);
        await queryRunner.query(`ALTER TABLE "pricing_configs" DROP COLUMN "price_unit"`);
        await queryRunner.query(`ALTER TABLE "services" DROP COLUMN "category_id"`);
        await queryRunner.query(`ALTER TABLE "taskers" ADD "experience" text`);
        await queryRunner.query(`ALTER TABLE "taskers" ADD "skills" text`);
        await queryRunner.query(`ALTER TABLE "services" ALTER COLUMN "service_code" SET DEFAULT 'SRV-' || upper(substr(md5(random()::text), 1, 6))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "services" ALTER COLUMN "service_code" SET DEFAULT ('SRV-'|| upper(substr(md5((random())), 1, 6)))`);
        await queryRunner.query(`ALTER TABLE "taskers" DROP COLUMN "skills"`);
        await queryRunner.query(`ALTER TABLE "taskers" DROP COLUMN "experience"`);
        await queryRunner.query(`ALTER TABLE "services" ADD "category_id" uuid`);
        await queryRunner.query(`ALTER TABLE "pricing_configs" ADD "price_unit" character varying(50) NOT NULL DEFAULT 'giờ'`);
        await queryRunner.query(`ALTER TABLE "services" ADD CONSTRAINT "FK_1f8d1173481678a035b4a81a4ec" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

}
