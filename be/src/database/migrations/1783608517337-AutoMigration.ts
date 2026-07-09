import { MigrationInterface, QueryRunner } from "typeorm";

export class AutoMigration1783608517337 implements MigrationInterface {
    name = 'AutoMigration1783608517337'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."customer_withdrawal_requests_status_enum" RENAME TO "customer_withdrawal_requests_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."customer_withdrawal_requests_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'PROCESSED')`);
        await queryRunner.query(`ALTER TABLE "customer_withdrawal_requests" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "customer_withdrawal_requests" ALTER COLUMN "status" TYPE "public"."customer_withdrawal_requests_status_enum" USING "status"::"text"::"public"."customer_withdrawal_requests_status_enum"`);
        await queryRunner.query(`ALTER TABLE "customer_withdrawal_requests" ALTER COLUMN "status" SET DEFAULT 'PENDING'`);
        await queryRunner.query(`DROP TYPE "public"."customer_withdrawal_requests_status_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."customer_withdrawal_requests_status_enum_old" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'PROCESSED')`);
        await queryRunner.query(`ALTER TABLE "customer_withdrawal_requests" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "customer_withdrawal_requests" ALTER COLUMN "status" TYPE "public"."customer_withdrawal_requests_status_enum_old" USING "status"::"text"::"public"."customer_withdrawal_requests_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "customer_withdrawal_requests" ALTER COLUMN "status" SET DEFAULT 'PENDING'`);
        await queryRunner.query(`DROP TYPE "public"."customer_withdrawal_requests_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."customer_withdrawal_requests_status_enum_old" RENAME TO "customer_withdrawal_requests_status_enum"`);
    }
}
