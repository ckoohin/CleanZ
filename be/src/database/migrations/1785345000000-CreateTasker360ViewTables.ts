import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTasker360ViewTables1785345000000 implements MigrationInterface {
    name = 'CreateTasker360ViewTables1785345000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "tasker_services" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tasker_id" uuid NOT NULL, "service_id" uuid NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "tested_at" TIMESTAMP WITH TIME ZONE, "certificate_url" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_69a45fd7e9e529508efbb0c48d9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_772e776e4928dafde1e6090129" ON "tasker_services" ("tasker_id", "service_id") `);
        await queryRunner.query(`CREATE TYPE "public"."tasker_equipment_type_enum" AS ENUM('UNIFORM', 'BACKPACK', 'CLEANING_KIT')`);
        await queryRunner.query(`CREATE TYPE "public"."tasker_equipment_issue_status_enum" AS ENUM('ISSUED', 'RETURNED', 'LOST')`);
        await queryRunner.query(`CREATE TABLE "tasker_equipments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tasker_id" uuid NOT NULL, "equipment_type" "public"."tasker_equipment_type_enum" NOT NULL, "size" character varying(10), "status" "public"."tasker_equipment_issue_status_enum" NOT NULL DEFAULT 'ISSUED', "unit_price" numeric(12,2) NOT NULL DEFAULT '0', "issued_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_bfb90da532a2717797c56031d75" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "tasker_equipment_debts" ("tasker_id" uuid NOT NULL, "total_debt" numeric(12,2) NOT NULL DEFAULT '0', "paid_amount" numeric(12,2) NOT NULL DEFAULT '0', "is_cleared" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_638cfbaffd85fecff30cc4082e3" PRIMARY KEY ("tasker_id"))`);
        await queryRunner.query(`CREATE TYPE "public"."tasker_shift_enum" AS ENUM('MORNING', 'AFTERNOON', 'EVENING')`);
        await queryRunner.query(`CREATE TABLE "tasker_schedules" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tasker_id" uuid NOT NULL, "day_of_week" smallint NOT NULL, "shift" "public"."tasker_shift_enum" NOT NULL, "is_available" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_08f0103b10bef892cc9a5ce5eaf" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_4fbd0feb84d283d070a36a41cf" ON "tasker_schedules" ("tasker_id", "day_of_week", "shift") `);
        await queryRunner.query(`CREATE TABLE "tasker_coverages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tasker_id" uuid NOT NULL, "district_code" character varying(20) NOT NULL, "city_code" character varying(20), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_f2cad6bc98b4f16bd96a75478ac" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_4575e58d141f1e8523577bf596" ON "tasker_coverages" ("tasker_id", "district_code") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "tasker_coverages"`);
        await queryRunner.query(`DROP TABLE "tasker_schedules"`);
        await queryRunner.query(`DROP TYPE "public"."tasker_shift_enum"`);
        await queryRunner.query(`DROP TABLE "tasker_equipment_debts"`);
        await queryRunner.query(`DROP TABLE "tasker_equipments"`);
        await queryRunner.query(`DROP TYPE "public"."tasker_equipment_issue_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."tasker_equipment_type_enum"`);
        await queryRunner.query(`DROP TABLE "tasker_services"`);
    }
}
