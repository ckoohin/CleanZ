import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlignSchemaWithEntities1782620000000 implements MigrationInterface {
  name = 'AlignSchemaWithEntities1782620000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "service_sub_services" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "package_id" uuid NOT NULL,
        "sub_service_id" uuid NOT NULL,
        "price" numeric(12,2) NOT NULL DEFAULT '0',
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_e904ad34f256eddd022caf0a976" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "reviews"
        ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP NOT NULL DEFAULT now()
    `);

    await queryRunner.query(`
      ALTER TABLE "customer_vouchers"
        DROP COLUMN IF EXISTS "used_at"
    `);

    await queryRunner.query(`
      ALTER TABLE "pricing_tiers"
        ALTER COLUMN "min_hours" SET DEFAULT '1',
        ALTER COLUMN "max_hours" SET DEFAULT '8'
    `);

    await queryRunner.query(`
      ALTER TABLE "service_subscriptions"
        ALTER COLUMN "billing_cycle" DROP NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "service_peak_hours"
        ALTER COLUMN "multiplier" SET DEFAULT '1'
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM "reviews"
          GROUP BY "booking_id"
          HAVING COUNT(*) > 1
        ) THEN
          RAISE EXCEPTION 'Cannot add unique constraint on reviews.booking_id because duplicate booking reviews exist';
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'UQ_bbd6ac6e3e6a8f8c6e0e8692d63'
        ) THEN
          ALTER TABLE "reviews"
            ADD CONSTRAINT "UQ_bbd6ac6e3e6a8f8c6e0e8692d63"
            UNIQUE ("booking_id");
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "service_durations"
        DROP CONSTRAINT IF EXISTS "FK_service_durations_package"
    `);
    await queryRunner.query(`
      ALTER TABLE "service_addons"
        DROP CONSTRAINT IF EXISTS "FK_service_addons_package"
    `);
    await queryRunner.query(`
      ALTER TABLE "service_subscriptions"
        DROP CONSTRAINT IF EXISTS "FK_service_subscriptions_package"
    `);
    await queryRunner.query(`
      ALTER TABLE "service_peak_hours"
        DROP CONSTRAINT IF EXISTS "FK_service_peak_hours_package"
    `);
    await queryRunner.query(`
      ALTER TABLE "service_workflows"
        DROP CONSTRAINT IF EXISTS "FK_workflows_package"
    `);
    await queryRunner.query(`
      ALTER TABLE "tasker_deposit_transactions"
        DROP CONSTRAINT IF EXISTS "FK_9a7ed9c8fc252a7312fc562aabd"
    `);
    await queryRunner.query(`
      ALTER TABLE "tasker_deposit_transactions"
        DROP CONSTRAINT IF EXISTS "FK_406ca47645b25213ee68058ed6f"
    `);
    await queryRunner.query(`
      ALTER TABLE "package_policies"
        DROP CONSTRAINT IF EXISTS "FK_package_policies_package"
    `);
    await queryRunner.query(`
      ALTER TABLE "package_policies"
        DROP CONSTRAINT IF EXISTS "FK_package_policies_policy"
    `);
    await queryRunner.query(`
      ALTER TABLE "customer_vouchers"
        DROP CONSTRAINT IF EXISTS "uq_customer_voucher"
    `);

    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_customer_vouchers_voucher_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_service_durations_package_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_service_addons_package_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_service_subscriptions_package_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_service_peak_hours_package_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."uq_taskers_doc_id_number"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."idx_package_policies_policy"`,
    );

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_8a5f074c0577466123ff32befd"
        ON "package_policies" ("package_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_080fc39607b5397a3a3576802e"
        ON "package_policies" ("policy_id")
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_280dc2ff901ba4b305398f7c2d1'
        ) THEN
          ALTER TABLE "customer_vouchers"
            ADD CONSTRAINT "FK_280dc2ff901ba4b305398f7c2d1"
            FOREIGN KEY ("customer_id") REFERENCES "customers"("id")
            ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_978bcefac34a1a33617e0dca7f6'
        ) THEN
          ALTER TABLE "service_durations"
            ADD CONSTRAINT "FK_978bcefac34a1a33617e0dca7f6"
            FOREIGN KEY ("package_id") REFERENCES "service_packages"("id")
            ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_8a2e75837ac3933c67a7405f1b8'
        ) THEN
          ALTER TABLE "service_addons"
            ADD CONSTRAINT "FK_8a2e75837ac3933c67a7405f1b8"
            FOREIGN KEY ("package_id") REFERENCES "service_packages"("id")
            ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_593c199d992e9f3e9658da058da'
        ) THEN
          ALTER TABLE "service_subscriptions"
            ADD CONSTRAINT "FK_593c199d992e9f3e9658da058da"
            FOREIGN KEY ("package_id") REFERENCES "service_packages"("id")
            ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_4810def79c42eede27f7ce01c58'
        ) THEN
          ALTER TABLE "service_peak_hours"
            ADD CONSTRAINT "FK_4810def79c42eede27f7ce01c58"
            FOREIGN KEY ("package_id") REFERENCES "service_packages"("id")
            ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_1d69ca028609c17a6ec7a401c5c'
        ) THEN
          ALTER TABLE "service_sub_services"
            ADD CONSTRAINT "FK_1d69ca028609c17a6ec7a401c5c"
            FOREIGN KEY ("package_id") REFERENCES "service_packages"("id")
            ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_b6326153622d636b4510df768ae'
        ) THEN
          ALTER TABLE "service_sub_services"
            ADD CONSTRAINT "FK_b6326153622d636b4510df768ae"
            FOREIGN KEY ("sub_service_id") REFERENCES "sub_services"("id")
            ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_7f9f6d2610d8ebc5336572fe47c'
        ) THEN
          ALTER TABLE "service_workflows"
            ADD CONSTRAINT "FK_7f9f6d2610d8ebc5336572fe47c"
            FOREIGN KEY ("package_id") REFERENCES "service_packages"("id")
            ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_tasker_deposit_transactions_tasker'
        ) THEN
          ALTER TABLE "tasker_deposit_transactions"
            ADD CONSTRAINT "FK_tasker_deposit_transactions_tasker"
            FOREIGN KEY ("tasker_id") REFERENCES "taskers"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_tasker_deposit_transactions_booking'
        ) THEN
          ALTER TABLE "tasker_deposit_transactions"
            ADD CONSTRAINT "FK_tasker_deposit_transactions_booking"
            FOREIGN KEY ("booking_id") REFERENCES "bookings"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_8a5f074c0577466123ff32befd4'
        ) THEN
          ALTER TABLE "package_policies"
            ADD CONSTRAINT "FK_8a5f074c0577466123ff32befd4"
            FOREIGN KEY ("package_id") REFERENCES "service_packages"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_080fc39607b5397a3a3576802ed'
        ) THEN
          ALTER TABLE "package_policies"
            ADD CONSTRAINT "FK_080fc39607b5397a3a3576802ed"
            FOREIGN KEY ("policy_id") REFERENCES "policies"("id")
            ON DELETE NO ACTION ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "package_policies" DROP CONSTRAINT IF EXISTS "FK_080fc39607b5397a3a3576802ed"`,
    );
    await queryRunner.query(
      `ALTER TABLE "package_policies" DROP CONSTRAINT IF EXISTS "FK_8a5f074c0577466123ff32befd4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasker_deposit_transactions" DROP CONSTRAINT IF EXISTS "FK_tasker_deposit_transactions_booking"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasker_deposit_transactions" DROP CONSTRAINT IF EXISTS "FK_tasker_deposit_transactions_tasker"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_workflows" DROP CONSTRAINT IF EXISTS "FK_7f9f6d2610d8ebc5336572fe47c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_sub_services" DROP CONSTRAINT IF EXISTS "FK_b6326153622d636b4510df768ae"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_sub_services" DROP CONSTRAINT IF EXISTS "FK_1d69ca028609c17a6ec7a401c5c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_peak_hours" DROP CONSTRAINT IF EXISTS "FK_4810def79c42eede27f7ce01c58"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_subscriptions" DROP CONSTRAINT IF EXISTS "FK_593c199d992e9f3e9658da058da"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_addons" DROP CONSTRAINT IF EXISTS "FK_8a2e75837ac3933c67a7405f1b8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_durations" DROP CONSTRAINT IF EXISTS "FK_978bcefac34a1a33617e0dca7f6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_vouchers" DROP CONSTRAINT IF EXISTS "FK_280dc2ff901ba4b305398f7c2d1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "UQ_bbd6ac6e3e6a8f8c6e0e8692d63"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_080fc39607b5397a3a3576802e"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_8a5f074c0577466123ff32befd"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "service_sub_services"`);
  }
}
