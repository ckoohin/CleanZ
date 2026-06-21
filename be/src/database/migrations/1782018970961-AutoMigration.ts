import { MigrationInterface, QueryRunner } from "typeorm";

export class AutoMigration1782018970961 implements MigrationInterface {
    name = 'AutoMigration1782018970961'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "services" ADD "service_code" character varying(20) NOT NULL DEFAULT 'SRV-' || upper(substr(md5(random()::text), 1, 6))`);
        await queryRunner.query(`ALTER TABLE "services" ADD CONSTRAINT "UQ_f05131015973a4c74d7052b69ab" UNIQUE ("service_code")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "services" DROP CONSTRAINT "UQ_f05131015973a4c74d7052b69ab"`);
        await queryRunner.query(`ALTER TABLE "services" DROP COLUMN "service_code"`);
    }

}
