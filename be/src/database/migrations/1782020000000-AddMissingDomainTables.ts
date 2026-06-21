import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Bổ sung các bảng nghiệp vụ còn THIẾU trong DB (drift) — additive-only.
 *
 * Trích lọc thủ công từ `migration:generate` (diff entity↔DB), CHỈ giữ phần tạo mới
 * cho 11 bảng + 4 enum + index + FK của chúng. ĐÃ LOẠI BỎ toàn bộ phần phá hủy mà
 * autogen sinh ra trên bảng hiện có (DROP CONSTRAINT/CHECK, DROP INDEX, ALTER COLUMN
 * NOT NULL, enum-conversion) để không làm yếu schema / mất ràng buộc đang chạy.
 *
 * Bảng tạo: services, pricing_configs, vouchers, customer_vouchers, tasker_levels,
 *           wallets, tasker_withdrawal_requests, wallet_transactions, reviews,
 *           peak_day_configs, payments.
 */
export class AddMissingDomainTables1782020000000 implements MigrationInterface {
  name = 'AddMissingDomainTables1782020000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ── Enum types (cho bảng mới) ──────────────────────────────────────────────
    await queryRunner.query(`CREATE TYPE "public"."vouchers_type_enum" AS ENUM('PERCENT', 'FIXED')`);
    await queryRunner.query(`CREATE TYPE "public"."tasker_withdrawal_requests_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'PROCESSED')`);
    await queryRunner.query(`CREATE TYPE "public"."wallets_owner_type_enum" AS ENUM('CUSTOMER', 'TASKER', 'SYSTEM')`);
    await queryRunner.query(`CREATE TYPE "public"."wallet_transaction_type" AS ENUM('DEPOSIT', 'WITHDRAW', 'PAYMENT', 'REFUND', 'PLATFORM_FEE', 'TASKER_EARNING', 'DEPOSIT_HOLD', 'DEPOSIT_RELEASE', 'DEPOSIT_DEDUCT', 'CANCELLATION_FEE', 'ADJUSTMENT')`);

    // ── Tables ─────────────────────────────────────────────────────────────────
    await queryRunner.query(`CREATE TABLE "services" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "description" text, "base_duration_hours" numeric(4,1), "coverage_area" text, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ba2d347a3168a296416c6c5ccb2" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE INDEX "idx_services_is_active" ON "services" ("is_active") `);

    await queryRunner.query(`CREATE TABLE "pricing_configs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "service_id" uuid NOT NULL, "base_price" numeric(12,2) NOT NULL, "peak_price" numeric(12,2), "pet_fee" numeric(12,2) NOT NULL DEFAULT '0', "waiting_fee" numeric(12,2) NOT NULL DEFAULT '0', "platform_commission_rate" numeric(5,2) NOT NULL DEFAULT '20', "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "uq_pricing_service" UNIQUE ("service_id"), CONSTRAINT "REL_664f4525629e6c2874ba6a36b1" UNIQUE ("service_id"), CONSTRAINT "PK_68f45b3c5c0404cfa95eada68f2" PRIMARY KEY ("id"))`);

    await queryRunner.query(`CREATE TABLE "vouchers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying(50) NOT NULL, "name" character varying(255) NOT NULL, "description" text, "type" "public"."vouchers_type_enum" NOT NULL, "value" numeric(12,2) NOT NULL, "max_discount" numeric(12,2), "min_order_amount" numeric(12,2) NOT NULL DEFAULT '0', "usage_limit" integer, "used_count" integer NOT NULL DEFAULT '0', "service_id" uuid, "start_date" TIMESTAMP, "end_date" TIMESTAMP, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_efc30b2b9169e05e0e1e19d6dd6" UNIQUE ("code"), CONSTRAINT "PK_ed1b7dd909a696560763acdbc04" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE INDEX "idx_vouchers_active_dates" ON "vouchers" ("start_date") `);

    await queryRunner.query(`CREATE TABLE "customer_vouchers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "customer_id" uuid NOT NULL, "voucher_id" uuid NOT NULL, "is_used" boolean NOT NULL DEFAULT false, "used_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "uq_customer_voucher" UNIQUE ("customer_id", "voucher_id"), CONSTRAINT "PK_ae417e91ab934d36629f77ce065" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE INDEX "idx_customer_vouchers_voucher_id" ON "customer_vouchers" ("voucher_id") `);

    await queryRunner.query(`CREATE TABLE "tasker_levels" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(50) NOT NULL, "min_points" integer NOT NULL DEFAULT '0', "color" character varying(20), "sort_order" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7a1e40c0b42cb432d7b39241587" PRIMARY KEY ("id"))`);

    await queryRunner.query(`CREATE TABLE "wallets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "owner_type" "public"."wallets_owner_type_enum" NOT NULL, "balance" numeric(12,2) NOT NULL DEFAULT '0', "hold_balance" numeric(12,2) NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "customer_id" uuid, "tasker_id" uuid, CONSTRAINT "chk_wallet_owner" CHECK (
  (owner_type = 'CUSTOMER' AND customer_id IS NOT NULL AND tasker_id IS NULL)
  OR (owner_type = 'TASKER' AND tasker_id IS NOT NULL AND customer_id IS NULL)
  OR (owner_type = 'SYSTEM' AND customer_id IS NULL AND tasker_id IS NULL)
), CONSTRAINT "PK_8402e5df5a30a229380e83e4f7e" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE INDEX "idx_wallets_owner_type" ON "wallets" ("owner_type") `);
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_wallets_system" ON "wallets" ("owner_type") WHERE owner_type = 'SYSTEM'`);
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_wallets_tasker" ON "wallets" ("tasker_id") WHERE tasker_id IS NOT NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_wallets_customer" ON "wallets" ("customer_id") WHERE customer_id IS NOT NULL`);

    await queryRunner.query(`CREATE TABLE "tasker_withdrawal_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tasker_id" uuid NOT NULL, "wallet_id" uuid NOT NULL, "amount" numeric(12,2) NOT NULL, "status" "public"."tasker_withdrawal_requests_status_enum" NOT NULL DEFAULT 'PENDING', "bank_account" character varying(255), "bank_name" character varying(100), "note" text, "reviewed_at" TIMESTAMP, "processed_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_346777f85c4f5d033047d178fbe" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE INDEX "idx_tasker_withdrawal_tasker_id" ON "tasker_withdrawal_requests" ("tasker_id") `);
    await queryRunner.query(`CREATE INDEX "idx_tasker_withdrawal_wallet_id" ON "tasker_withdrawal_requests" ("wallet_id") `);
    await queryRunner.query(`CREATE INDEX "idx_tasker_withdrawal_status" ON "tasker_withdrawal_requests" ("status") `);

    await queryRunner.query(`CREATE TABLE "wallet_transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "reference_id" uuid, "reference_type" character varying(50), "type" "public"."wallet_transaction_type" NOT NULL, "amount" numeric(12,2) NOT NULL, "balance_before" numeric(12,2) NOT NULL, "balance_after" numeric(12,2) NOT NULL, "description" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "wallet_id" uuid, "booking_id" uuid, CONSTRAINT "PK_5120f131bde2cda940ec1a621db" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE INDEX "idx_wallet_transactions_created_at" ON "wallet_transactions" ("created_at") `);
    await queryRunner.query(`CREATE INDEX "idx_wallet_transactions_type" ON "wallet_transactions" ("type") `);
    await queryRunner.query(`CREATE INDEX "idx_wallet_transactions_reference" ON "wallet_transactions" ("reference_id", "reference_type") `);
    await queryRunner.query(`CREATE INDEX "idx_wallet_transactions_booking_id" ON "wallet_transactions" ("booking_id") `);
    await queryRunner.query(`CREATE INDEX "idx_wallet_transactions_wallet_id" ON "wallet_transactions" ("wallet_id") `);

    await queryRunner.query(`CREATE TABLE "reviews" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "booking_id" uuid NOT NULL, "customer_id" uuid NOT NULL, "tasker_id" uuid NOT NULL, "overall_rating" numeric(2,1) NOT NULL, "punctuality" integer NOT NULL DEFAULT '5', "cleanliness" integer NOT NULL DEFAULT '5', "friendliness" integer NOT NULL DEFAULT '5', "satisfaction" integer NOT NULL DEFAULT '5', "comment" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_231ae565c273ee700b283f15c1d" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE INDEX "idx_reviews_created" ON "reviews" ("created_at") `);
    await queryRunner.query(`CREATE INDEX "idx_reviews_tasker" ON "reviews" ("tasker_id") `);

    await queryRunner.query(`CREATE TABLE "peak_day_configs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "start_time" TIME, "end_time" TIME, "start_at" TIMESTAMP, "end_at" TIMESTAMP, "peak_rate" numeric(5,2) NOT NULL DEFAULT 0.1, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "chk_peak_day_range" CHECK ("start_at" < "end_at"), CONSTRAINT "PK_f2cd5780ad99ec6d0eb0a6fc4bc" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE INDEX "idx_peak_day_configs_range" ON "peak_day_configs" ("start_at") `);

    await queryRunner.query(`CREATE TABLE "payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "method" "public"."payment_method" NOT NULL, "status" "public"."payment_status" NOT NULL DEFAULT 'PENDING', "amount" numeric(12,2) NOT NULL, "transaction_code" character varying(255), "paid_at" TIMESTAMP, "refunded_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "booking_id" uuid, "customer_id" uuid, CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`);

    // ── Foreign keys (chỉ cho bảng mới) ────────────────────────────────────────
    await queryRunner.query(`ALTER TABLE "pricing_configs" ADD CONSTRAINT "FK_664f4525629e6c2874ba6a36b15" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "vouchers" ADD CONSTRAINT "FK_820556fd3264ae9abfe7cbc0734" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "customer_vouchers" ADD CONSTRAINT "FK_5d66d730e4a014373f201fe8a99" FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "wallets" ADD CONSTRAINT "FK_6580899a2293de27787376887fa" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    await queryRunner.query(`ALTER TABLE "wallets" ADD CONSTRAINT "FK_dcd55e9573c58b2ff8b74162ee1" FOREIGN KEY ("tasker_id") REFERENCES "taskers"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    await queryRunner.query(`ALTER TABLE "tasker_withdrawal_requests" ADD CONSTRAINT "FK_2af50fc317b474555af1647ba68" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "wallet_transactions" ADD CONSTRAINT "FK_c57d19129968160f4db28fc8b28" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    await queryRunner.query(`ALTER TABLE "wallet_transactions" ADD CONSTRAINT "FK_14355451ca51402529acd2e2ed2" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE`);
    await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_e86edf76dc2424f123b9023a2b2" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_d0b02233df1c52323107fe7b4d7" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "payments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "peak_day_configs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "reviews"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wallet_transactions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tasker_withdrawal_requests"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wallets"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tasker_levels"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "customer_vouchers"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "vouchers"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "pricing_configs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "services"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."wallet_transaction_type"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."wallets_owner_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."tasker_withdrawal_requests_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."vouchers_type_enum"`);
  }
}
