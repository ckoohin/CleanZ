import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Refactor mô hình Service -> Service Package / Sub-service / Coverage Area.
 *
 * Sinh tự động từ drift entity (`npm run db:sync -- --generate`) rồi SỬA TAY để
 * an toàn DATA (xem [[cleanz-be-migrations]]):
 *
 *  - `bookings.service_id` -> `package_id`, FK đổi từ `services` sang
 *    `service_packages`. Cột NOT NULL nên KHÔNG được để rỗng.
 *  - `vouchers.service_id` đổi FK từ `services` sang `sub_services`.
 *
 * Vì DB hiện có data (bookings/vouchers đang trỏ tới `services`), ta BACKFILL:
 * copy mỗi row `services` sang `service_packages` VÀ `sub_services` GIỮ NGUYÊN
 * `id`. Nhờ vậy giá trị khoá ngoại cũ vẫn hợp lệ sau khi đổi đích FK -> không
 * vỡ ràng buộc, không mất booking/voucher. Bảng `services` cũ được giữ nguyên.
 *
 * Thứ tự up(): tạo bảng mới -> backfill -> đổi cột/FK -> thêm FK còn lại.
 */
export class AutoMigration1782268238105 implements MigrationInterface {
  name = 'AutoMigration1782268238105';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ---- 1. Tạo các bảng & index mới (không phụ thuộc data) --------------
    await queryRunner.query(
      `CREATE TABLE "sub_services" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "sub_service_code" character varying(20) NOT NULL, "name" character varying(255) NOT NULL, "description" text, "duration_hours" numeric(4,1) DEFAULT '1', "coverage_area" text, "is_active" boolean NOT NULL DEFAULT true, "thumbnail_url" character varying(500), "gallery_urls" jsonb, "short_description" character varying(500), "included_tasks" jsonb, "excluded_tasks" jsonb, "terms_and_conditions" text, "pricing_type" character varying(20) NOT NULL DEFAULT 'FIXED', "pricing_config_id" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_4a07cea2983106bec7942159df7" UNIQUE ("sub_service_code"), CONSTRAINT "PK_8d0808cbbab4fad02bc41183a70" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_sub_services_is_active" ON "sub_services" ("is_active") `,
    );
    await queryRunner.query(
      `CREATE TABLE "service_packages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "package_code" character varying(255) NOT NULL, "icon_url" character varying(500), "sort_order" integer NOT NULL DEFAULT '0', "is_active" boolean NOT NULL DEFAULT true, "max_hours" numeric(4,1) NOT NULL DEFAULT '8', "terms_and_conditions" text, "policy_description" text, "night_surcharge" numeric(12,2) NOT NULL DEFAULT '0', "pet_surcharge" numeric(12,2) NOT NULL DEFAULT '0', "waiting_surcharge" numeric(12,2) NOT NULL DEFAULT '0', "tool_fee" numeric(12,2) NOT NULL DEFAULT '0', "peak_rate_percent" numeric(5,2) NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_5d18904b7380627ecc4e37bb4a8" UNIQUE ("package_code"), CONSTRAINT "PK_d602a30f23af1a0ecf7c8e994df" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_service_packages_code" ON "service_packages" ("package_code") `,
    );
    await queryRunner.query(
      `CREATE TABLE "package_sub_services" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "package_id" uuid NOT NULL, "sub_service_id" uuid NOT NULL, "is_required" boolean NOT NULL DEFAULT false, "is_default" boolean NOT NULL DEFAULT false, "exclusivity_group_id" character varying(50), "sort_order" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ae01eeeaacd69312a8ec92491f9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "coverage_areas" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "city" character varying(50) NOT NULL DEFAULT 'Hà Nội', "transport_fee" numeric(12,2) NOT NULL DEFAULT '0', "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0176a96d781b8cfa1723b2929f1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "booking_sub_services" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "booking_id" uuid NOT NULL, "sub_service_id" uuid NOT NULL, "price" numeric(12,2) NOT NULL, "duration_hours" numeric(4,1) NOT NULL, "quantity" integer NOT NULL DEFAULT '1', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_64ae475065310e9d6b1bb36f8a1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "package_coverage_areas" ("package_id" uuid NOT NULL, "area_id" uuid NOT NULL, CONSTRAINT "PK_a910899bb0812395e8d3eb80f41" PRIMARY KEY ("package_id", "area_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e1a6a844aa22491dc799fc85d4" ON "package_coverage_areas" ("package_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cc7b6205936d8c13d2ddafe014" ON "package_coverage_areas" ("area_id") `,
    );

    // ---- 2. BACKFILL: copy services -> service_packages & sub_services ----
    // Giữ nguyên id để mọi FK cũ (bookings.service_id, vouchers.service_id)
    // vẫn hợp lệ sau khi đổi đích. Idempotent nhờ ON CONFLICT DO NOTHING.
    await queryRunner.query(`
      INSERT INTO "service_packages"
        ("id", "name", "package_code", "is_active", "max_hours", "created_at", "updated_at")
      SELECT s."id", s."name", s."service_code", s."is_active",
             COALESCE(s."base_duration_hours", 8), s."created_at", now()
      FROM "services" s
      ON CONFLICT ("id") DO NOTHING
    `);
    await queryRunner.query(`
      INSERT INTO "sub_services"
        ("id", "sub_service_code", "name", "description", "duration_hours",
         "coverage_area", "is_active", "thumbnail_url", "gallery_urls",
         "short_description", "included_tasks", "excluded_tasks",
         "pricing_type", "pricing_config_id", "created_at")
      SELECT s."id", s."service_code", s."name", s."description",
             s."base_duration_hours", s."coverage_area", s."is_active",
             s."thumbnail_url", s."gallery_urls", s."short_description",
             s."included_tasks", s."excluded_tasks", 'FIXED',
             s."pricing_config_id", s."created_at"
      FROM "services" s
      ON CONFLICT ("id") DO NOTHING
    `);

    // ---- 3. Đổi cột bookings.service_id -> package_id ---------------------
    await queryRunner.query(
      `ALTER TABLE "bookings" RENAME COLUMN "service_id" TO "package_id"`,
    );

    // ---- 4. Đổi đích FK vouchers.service_id: services -> sub_services -----
    await queryRunner.query(
      `ALTER TABLE "vouchers" DROP CONSTRAINT "FK_820556fd3264ae9abfe7cbc0734"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" ADD CONSTRAINT "FK_820556fd3264ae9abfe7cbc0734" FOREIGN KEY ("service_id") REFERENCES "sub_services"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    // ---- 5. Thêm các FK còn lại (data đã hợp lệ nhờ backfill) ------------
    await queryRunner.query(
      `ALTER TABLE "sub_services" ADD CONSTRAINT "FK_5c2f8bc9f177a0c0fa5ea3e1e98" FOREIGN KEY ("pricing_config_id") REFERENCES "pricing_configs"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "package_sub_services" ADD CONSTRAINT "FK_c0514b33998fcc04d27eac0dae7" FOREIGN KEY ("package_id") REFERENCES "service_packages"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "package_sub_services" ADD CONSTRAINT "FK_34f40d449a715e7153a45a5dd41" FOREIGN KEY ("sub_service_id") REFERENCES "sub_services"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_sub_services" ADD CONSTRAINT "FK_52a00c84772520ee19b9e16d7dc" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_sub_services" ADD CONSTRAINT "FK_7ac1e8135c6bdf716dca6451ee5" FOREIGN KEY ("sub_service_id") REFERENCES "sub_services"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD CONSTRAINT "FK_402873fd6596d556781ac5d8ae4" FOREIGN KEY ("package_id") REFERENCES "service_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "package_coverage_areas" ADD CONSTRAINT "FK_e1a6a844aa22491dc799fc85d4c" FOREIGN KEY ("package_id") REFERENCES "service_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "package_coverage_areas" ADD CONSTRAINT "FK_cc7b6205936d8c13d2ddafe0148" FOREIGN KEY ("area_id") REFERENCES "coverage_areas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Gỡ FK mới, trả vouchers.service_id về services, đổi tên cột bookings về
    // service_id, rồi xoá các bảng mới (data backfill bị xoá kèm).
    await queryRunner.query(
      `ALTER TABLE "package_coverage_areas" DROP CONSTRAINT "FK_cc7b6205936d8c13d2ddafe0148"`,
    );
    await queryRunner.query(
      `ALTER TABLE "package_coverage_areas" DROP CONSTRAINT "FK_e1a6a844aa22491dc799fc85d4c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP CONSTRAINT "FK_402873fd6596d556781ac5d8ae4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_sub_services" DROP CONSTRAINT "FK_7ac1e8135c6bdf716dca6451ee5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_sub_services" DROP CONSTRAINT "FK_52a00c84772520ee19b9e16d7dc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "package_sub_services" DROP CONSTRAINT "FK_34f40d449a715e7153a45a5dd41"`,
    );
    await queryRunner.query(
      `ALTER TABLE "package_sub_services" DROP CONSTRAINT "FK_c0514b33998fcc04d27eac0dae7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sub_services" DROP CONSTRAINT "FK_5c2f8bc9f177a0c0fa5ea3e1e98"`,
    );

    // Trả FK vouchers.service_id về services TRƯỚC khi xoá sub_services.
    await queryRunner.query(
      `ALTER TABLE "vouchers" DROP CONSTRAINT "FK_820556fd3264ae9abfe7cbc0734"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" RENAME COLUMN "package_id" TO "service_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vouchers" ADD CONSTRAINT "FK_820556fd3264ae9abfe7cbc0734" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `DROP INDEX "public"."IDX_cc7b6205936d8c13d2ddafe014"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e1a6a844aa22491dc799fc85d4"`,
    );
    await queryRunner.query(`DROP TABLE "package_coverage_areas"`);
    await queryRunner.query(`DROP TABLE "booking_sub_services"`);
    await queryRunner.query(`DROP INDEX "public"."idx_service_packages_code"`);
    await queryRunner.query(`DROP TABLE "service_packages"`);
    await queryRunner.query(`DROP TABLE "coverage_areas"`);
    await queryRunner.query(`DROP TABLE "package_sub_services"`);
    await queryRunner.query(`DROP INDEX "public"."idx_sub_services_is_active"`);
    await queryRunner.query(`DROP TABLE "sub_services"`);
  }
}
