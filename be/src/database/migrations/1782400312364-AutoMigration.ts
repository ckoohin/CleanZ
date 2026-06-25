import { MigrationInterface, QueryRunner } from "typeorm";

export class AutoMigration1782400312364 implements MigrationInterface {
    name = 'AutoMigration1782400312364'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "service_packages" ADD "gallery_urls" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "service_packages" DROP COLUMN "gallery_urls"`);
    }
}
