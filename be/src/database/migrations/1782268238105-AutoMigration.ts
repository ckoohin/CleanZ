import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Refactor mô hình Service -> Service Package / Sub-service / Coverage Area.
 *
 * Sinh tự động từ drift entity (`npm run db:sync -- --generate`) rồi SỬA TAY để
 * an toàn DATA:
 *
 *  - bookings.service_id -> package_id
 *  - vouchers.service_id đổi FK từ services sang sub_services
 *  - backfill services -> service_packages + sub_services giữ nguyên id
 *
 * Bản này đã được harden để chạy được cả khi DB đang lệch schema:
 *  - thiếu pricing_configs
 *  - thiếu FK vouchers cũ
 *  - đã rename service_id -> package_id từ trước
 *  - rollback an toàn hơn
 */
export class AutoMigration1782268238105 implements MigrationInterface {
  name = 'AutoMigration1782268238105';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ---------------------------------------------------------------------
    // 1) Tạo bảng mới
    // ---------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sub_services" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "sub_service_code" character varying(20) NOT NULL,
        "name" character varying(255) NOT NULL,
        "description" text,
        "duration_hours" numeric(4,1) DEFAULT '1',
        "coverage_area" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "thumbnail_url" character varying(500),
        "gallery_urls" jsonb,
        "short_description" character varying(500),
        "included_tasks" jsonb,
        "excluded_tasks" jsonb,
        "terms_and_conditions" text,
        "pricing_type" character varying(20) NOT NULL DEFAULT 'FIXED',
        "pricing_config_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_4a07cea2983106bec7942159df7" UNIQUE ("sub_service_code"),
        CONSTRAINT "PK_8d0808cbbab4fad02bc41183a70" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_sub_services_is_active"
      ON "sub_services" ("is_active")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "service_packages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(255) NOT NULL,
        "package_code" character varying(255) NOT NULL,
        "icon_url" character varying(500),
        "sort_order" integer NOT NULL DEFAULT '0',
        "is_active" boolean NOT NULL DEFAULT true,
        "max_hours" numeric(4,1) NOT NULL DEFAULT '8',
        "terms_and_conditions" text,
        "policy_description" text,
        "night_surcharge" numeric(12,2) NOT NULL DEFAULT '0',
        "pet_surcharge" numeric(12,2) NOT NULL DEFAULT '0',
        "waiting_surcharge" numeric(12,2) NOT NULL DEFAULT '0',
        "tool_fee" numeric(12,2) NOT NULL DEFAULT '0',
        "peak_rate_percent" numeric(5,2) NOT NULL DEFAULT '0',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_5d18904b7380627ecc4e37bb4a8" UNIQUE ("package_code"),
        CONSTRAINT "PK_d602a30f23af1a0ecf7c8e994df" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_service_packages_code"
      ON "service_packages" ("package_code")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "package_sub_services" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "package_id" uuid NOT NULL,
        "sub_service_id" uuid NOT NULL,
        "is_required" boolean NOT NULL DEFAULT false,
        "is_default" boolean NOT NULL DEFAULT false,
        "exclusivity_group_id" character varying(50),
        "sort_order" integer NOT NULL DEFAULT '0',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ae01eeeaacd69312a8ec92491f9" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "coverage_areas" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(100) NOT NULL,
        "city" character varying(50) NOT NULL DEFAULT 'Hà Nội',
        "transport_fee" numeric(12,2) NOT NULL DEFAULT '0',
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_0176a96d781b8cfa1723b2929f1" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "booking_sub_services" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "booking_id" uuid NOT NULL,
        "sub_service_id" uuid NOT NULL,
        "price" numeric(12,2) NOT NULL,
        "duration_hours" numeric(4,1) NOT NULL,
        "quantity" integer NOT NULL DEFAULT '1',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_64ae475065310e9d6b1bb36f8a1" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "package_coverage_areas" (
        "package_id" uuid NOT NULL,
        "area_id" uuid NOT NULL,
        CONSTRAINT "PK_a910899bb0812395e8d3eb80f41" PRIMARY KEY ("package_id", "area_id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_e1a6a844aa22491dc799fc85d4"
      ON "package_coverage_areas" ("package_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_cc7b6205936d8c13d2ddafe014"
      ON "package_coverage_areas" ("area_id")
    `);

    // ---------------------------------------------------------------------
    // 2) BACKFILL services -> service_packages + sub_services
    // ---------------------------------------------------------------------
    await queryRunner.query(`
      INSERT INTO "service_packages"
        ("id", "name", "package_code", "is_active", "max_hours", "created_at", "updated_at")
      SELECT
        s."id",
        s."name",
        s."service_code",
        s."is_active",
        COALESCE(s."base_duration_hours", 8),
        s."created_at",
        now()
      FROM "services" s
      ON CONFLICT ("id") DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "sub_services"
        ("id", "sub_service_code", "name", "description", "duration_hours",
         "coverage_area", "is_active", "thumbnail_url", "gallery_urls",
         "short_description", "included_tasks", "excluded_tasks",
         "pricing_type", "pricing_config_id", "created_at")
      SELECT
        s."id",
        s."service_code",
        s."name",
        s."description",
        s."base_duration_hours",
        s."coverage_area",
        s."is_active",
        s."thumbnail_url",
        s."gallery_urls",
        s."short_description",
        s."included_tasks",
        s."excluded_tasks",
        'FIXED',
        NULL,
        s."created_at"
      FROM "services" s
      ON CONFLICT ("id") DO NOTHING
    `);

    // ---------------------------------------------------------------------
    // 3) Rename bookings.service_id -> package_id nếu cột cũ còn tồn tại
    // ---------------------------------------------------------------------
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'bookings'
            AND column_name = 'service_id'
        ) AND NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'bookings'
            AND column_name = 'package_id'
        ) THEN
          ALTER TABLE "bookings" RENAME COLUMN "service_id" TO "package_id";
        END IF;
      END $$;
    `);

    // ---------------------------------------------------------------------
    // 4) Đổi FK vouchers.service_id: services -> sub_services
    // ---------------------------------------------------------------------
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.table_constraints
          WHERE constraint_name = 'FK_820556fd3264ae9abfe7cbc0734'
            AND table_name = 'vouchers'
        ) THEN
          ALTER TABLE "vouchers"
          DROP CONSTRAINT "FK_820556fd3264ae9abfe7cbc0734";
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'vouchers'
            AND column_name = 'service_id'
        ) THEN
          ALTER TABLE "vouchers"
          ADD CONSTRAINT "FK_820556fd3264ae9abfe7cbc0734"
          FOREIGN KEY ("service_id")
          REFERENCES "sub_services"("id")
          ON DELETE SET NULL
          ON UPDATE NO ACTION;
        END IF;
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // ---------------------------------------------------------------------
    // 5) FK sub_services.pricing_config_id -> pricing_configs(id)
    //    Chỉ add nếu bảng pricing_configs thực sự tồn tại
    // ---------------------------------------------------------------------
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = 'pricing_configs'
        ) THEN
          ALTER TABLE "sub_services"
          ADD CONSTRAINT "FK_5c2f8bc9f177a0c0fa5ea3e1e98"
          FOREIGN KEY ("pricing_config_id")
          REFERENCES "pricing_configs"("id")
          ON DELETE SET NULL
          ON UPDATE NO ACTION;
        END IF;
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // ---------------------------------------------------------------------
    // 6) Các FK còn lại
    // ---------------------------------------------------------------------
    await queryRunner.query(`
      DO $$
      BEGIN
        ALTER TABLE "package_sub_services"
        ADD CONSTRAINT "FK_c0514b33998fcc04d27eac0dae7"
        FOREIGN KEY ("package_id")
        REFERENCES "service_packages"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION;
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        ALTER TABLE "package_sub_services"
        ADD CONSTRAINT "FK_34f40d449a715e7153a45a5dd41"
        FOREIGN KEY ("sub_service_id")
        REFERENCES "sub_services"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION;
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        ALTER TABLE "booking_sub_services"
        ADD CONSTRAINT "FK_52a00c84772520ee19b9e16d7dc"
        FOREIGN KEY ("booking_id")
        REFERENCES "bookings"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION;
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        ALTER TABLE "booking_sub_services"
        ADD CONSTRAINT "FK_7ac1e8135c6bdf716dca6451ee5"
        FOREIGN KEY ("sub_service_id")
        REFERENCES "sub_services"("id")
        ON DELETE RESTRICT ON UPDATE NO ACTION;
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'bookings'
            AND column_name = 'package_id'
        ) THEN
          ALTER TABLE "bookings"
          ADD CONSTRAINT "FK_402873fd6596d556781ac5d8ae4"
          FOREIGN KEY ("package_id")
          REFERENCES "service_packages"("id")
          ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        ALTER TABLE "package_coverage_areas"
        ADD CONSTRAINT "FK_e1a6a844aa22491dc799fc85d4c"
        FOREIGN KEY ("package_id")
        REFERENCES "service_packages"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        ALTER TABLE "package_coverage_areas"
        ADD CONSTRAINT "FK_cc7b6205936d8c13d2ddafe0148"
        FOREIGN KEY ("area_id")
        REFERENCES "coverage_areas"("id")
        ON DELETE NO ACTION ON UPDATE NO ACTION;
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ---------------------------------------------------------------------
    // 1) Gỡ FK mới (safe drop)
    // ---------------------------------------------------------------------
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE table_name = 'package_coverage_areas'
            AND constraint_name = 'FK_cc7b6205936d8c13d2ddafe0148'
        ) THEN
          ALTER TABLE "package_coverage_areas"
          DROP CONSTRAINT "FK_cc7b6205936d8c13d2ddafe0148";
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE table_name = 'package_coverage_areas'
            AND constraint_name = 'FK_e1a6a844aa22491dc799fc85d4c'
        ) THEN
          ALTER TABLE "package_coverage_areas"
          DROP CONSTRAINT "FK_e1a6a844aa22491dc799fc85d4c";
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE table_name = 'bookings'
            AND constraint_name = 'FK_402873fd6596d556781ac5d8ae4'
        ) THEN
          ALTER TABLE "bookings"
          DROP CONSTRAINT "FK_402873fd6596d556781ac5d8ae4";
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE table_name = 'booking_sub_services'
            AND constraint_name = 'FK_7ac1e8135c6bdf716dca6451ee5'
        ) THEN
          ALTER TABLE "booking_sub_services"
          DROP CONSTRAINT "FK_7ac1e8135c6bdf716dca6451ee5";
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE table_name = 'booking_sub_services'
            AND constraint_name = 'FK_52a00c84772520ee19b9e16d7dc'
        ) THEN
          ALTER TABLE "booking_sub_services"
          DROP CONSTRAINT "FK_52a00c84772520ee19b9e16d7dc";
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE table_name = 'package_sub_services'
            AND constraint_name = 'FK_34f40d449a715e7153a45a5dd41'
        ) THEN
          ALTER TABLE "package_sub_services"
          DROP CONSTRAINT "FK_34f40d449a715e7153a45a5dd41";
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE table_name = 'package_sub_services'
            AND constraint_name = 'FK_c0514b33998fcc04d27eac0dae7'
        ) THEN
          ALTER TABLE "package_sub_services"
          DROP CONSTRAINT "FK_c0514b33998fcc04d27eac0dae7";
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE table_name = 'sub_services'
            AND constraint_name = 'FK_5c2f8bc9f177a0c0fa5ea3e1e98'
        ) THEN
          ALTER TABLE "sub_services"
          DROP CONSTRAINT "FK_5c2f8bc9f177a0c0fa5ea3e1e98";
        END IF;
      END $$;
    `);

    // ---------------------------------------------------------------------
    // 2) Trả FK vouchers.service_id về services
    // ---------------------------------------------------------------------
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE table_name = 'vouchers'
            AND constraint_name = 'FK_820556fd3264ae9abfe7cbc0734'
        ) THEN
          ALTER TABLE "vouchers"
          DROP CONSTRAINT "FK_820556fd3264ae9abfe7cbc0734";
        END IF;
      END $$;
    `);

    // rename package_id -> service_id nếu package_id còn tồn tại
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'bookings'
            AND column_name = 'package_id'
        ) AND NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'bookings'
            AND column_name = 'service_id'
        ) THEN
          ALTER TABLE "bookings" RENAME COLUMN "package_id" TO "service_id";
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'vouchers'
            AND column_name = 'service_id'
        ) AND EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_name = 'services'
        ) THEN
          ALTER TABLE "vouchers"
          ADD CONSTRAINT "FK_820556fd3264ae9abfe7cbc0734"
          FOREIGN KEY ("service_id")
          REFERENCES "services"("id")
          ON DELETE SET NULL
          ON UPDATE NO ACTION;
        END IF;
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // ---------------------------------------------------------------------
    // 3) Xoá index / bảng mới (safe)
    // ---------------------------------------------------------------------
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_cc7b6205936d8c13d2ddafe014"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_e1a6a844aa22491dc799fc85d4"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "package_coverage_areas"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "booking_sub_services"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_service_packages_code"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "service_packages"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "coverage_areas"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "package_sub_services"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_sub_services_is_active"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "sub_services"`);
  }
}
