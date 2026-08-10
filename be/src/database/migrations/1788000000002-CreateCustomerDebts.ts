import { MigrationInterface, QueryRunner } from 'typeorm';

const TABLE_OWNER_MARKER = 'created_by_CreateCustomerDebts1788000000002';
const TOPUP_COLUMN_OWNER_MARKER = 'created_by_CreateCustomerDebts1788000000002';

export class CreateCustomerDebts1788000000002 implements MigrationInterface {
  name = 'CreateCustomerDebts1788000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExisted = await queryRunner.hasTable('customer_debts');
    if (!tableExisted) {
      await queryRunner.query(`
        CREATE TABLE "customer_debts" (
          "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
          "customer_id" uuid NOT NULL
            REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
          "source" "customer_debt_source" NOT NULL,
          "source_ref_id" uuid NOT NULL,
          "source_code" varchar(40),
          "original_amount" numeric(12,2) NOT NULL,
          "recovered_amount" numeric(12,2) NOT NULL DEFAULT 0,
          "written_off_amount" numeric(12,2) NOT NULL DEFAULT 0,
          "status" "customer_debt_status" NOT NULL DEFAULT 'OUTSTANDING',
          "written_off_at" timestamp,
          "write_off_reason" text,
          "written_off_by_admin_id" uuid
            REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
          "created_at" timestamp NOT NULL DEFAULT now(),
          "updated_at" timestamp NOT NULL DEFAULT now(),
          CONSTRAINT "uq_customer_debt_source" UNIQUE ("source", "source_ref_id"),
          CONSTRAINT "CHK_customer_debt_amounts_non_negative" CHECK (
            "original_amount" > 0
            AND "recovered_amount" >= 0
            AND "written_off_amount" >= 0
            AND "recovered_amount" + "written_off_amount" <= "original_amount"
          )
        )
      `);
      await queryRunner.query(
        `COMMENT ON TABLE "customer_debts" IS '${TABLE_OWNER_MARKER}'`,
      );
    } else {
      // Không âm thầm chấp nhận một bảng cùng tên nhưng thiếu contract bắt buộc.
      // `hasTable` chỉ nói tên tồn tại; các truy vấn này khiến migration fail sớm,
      // trước khi app chạy trên một sổ nợ không tương thích.
      await queryRunner.query(`
        DO $$
        DECLARE missing_columns text;
        BEGIN
          SELECT string_agg(required.name, ', ' ORDER BY required.name)
            INTO missing_columns
            FROM (VALUES
              ('id'), ('customer_id'), ('source'), ('source_ref_id'),
              ('source_code'), ('original_amount'), ('recovered_amount'),
              ('written_off_amount'), ('status'), ('written_off_at'),
              ('write_off_reason'), ('written_off_by_admin_id'),
              ('created_at'), ('updated_at')
            ) AS required(name)
           WHERE NOT EXISTS (
             SELECT 1 FROM information_schema.columns c
              WHERE c.table_schema = 'public'
                AND c.table_name = 'customer_debts'
                AND c.column_name = required.name
           );
          IF missing_columns IS NOT NULL THEN
            RAISE EXCEPTION 'customer_debts thiếu cột bắt buộc: %', missing_columns;
          END IF;
        END $$;
      `);
    }
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_customer_debt_outstanding"
        ON "customer_debts" ("customer_id", "status")
    `);
    const topupColumnExisted = await queryRunner.hasColumn(
      'wallet_topup_orders',
      'debt_recovered_amount',
    );
    if (!topupColumnExisted) {
      await queryRunner.query(`
        ALTER TABLE "wallet_topup_orders"
        ADD COLUMN "debt_recovered_amount" numeric(12,2) NOT NULL DEFAULT 0
      `);
      await queryRunner.query(
        `COMMENT ON COLUMN "wallet_topup_orders"."debt_recovered_amount" IS '${TOPUP_COLUMN_OWNER_MARKER}'`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF col_description('wallet_topup_orders'::regclass, (
          SELECT attnum FROM pg_attribute
           WHERE attrelid = 'wallet_topup_orders'::regclass
             AND attname = 'debt_recovered_amount'
             AND NOT attisdropped
        )) = '${TOPUP_COLUMN_OWNER_MARKER}' THEN
          ALTER TABLE "wallet_topup_orders" DROP COLUMN "debt_recovered_amount";
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF to_regclass('public.customer_debts') IS NOT NULL
           AND obj_description('customer_debts'::regclass, 'pg_class') = '${TABLE_OWNER_MARKER}' THEN
          DROP TABLE "customer_debts";
        END IF;
      END $$;
    `);
  }
}
