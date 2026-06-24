/**
 * run-policy-migration.js
 * Chạy: node run-policy-migration.js
 * Thêm cột cho bảng policies + tạo bảng join package_policies
 */
const { Client } = require('pg');

const client = new Client({
  host:     'aws-1-ap-southeast-2.pooler.supabase.com',
  port:     5432,
  user:     'postgres.esanhwvuyebkqittqpaz',
  password: 'KingOfService123@',
  database: 'postgres',
  ssl:      { rejectUnauthorized: false },
});

const SQL_STEPS = [
  {
    name: 'Tạo enum policies_category_enum',
    sql: `
      DO $$ BEGIN
        CREATE TYPE "public"."policies_category_enum" AS ENUM(
          'LEGAL','CLEANING_STANDARD','INCIDENT_HANDLING',
          'CANCELLATION','CUSTOMER_SUPPORT','PAYMENT','GENERAL'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `,
  },
  {
    name: 'Thêm cột category',
    sql: `ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "category" "public"."policies_category_enum" NOT NULL DEFAULT 'GENERAL'`,
  },
  {
    name: 'Thêm cột icon_emoji',
    sql: `ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "icon_emoji" character varying(10) NOT NULL DEFAULT '📄'`,
  },
  {
    name: 'Thêm cột is_default',
    sql: `ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "is_default" boolean NOT NULL DEFAULT false`,
  },
  {
    name: 'Thêm cột sort_order',
    sql: `ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "sort_order" integer NOT NULL DEFAULT 0`,
  },
  {
    name: 'Tạo bảng package_policies (join M2M)',
    sql: `
      CREATE TABLE IF NOT EXISTS "package_policies" (
        "package_id" uuid NOT NULL,
        "policy_id"  uuid NOT NULL,
        CONSTRAINT "PK_package_policies" PRIMARY KEY ("package_id", "policy_id"),
        CONSTRAINT "FK_pp_package" FOREIGN KEY ("package_id")
          REFERENCES "service_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "FK_pp_policy" FOREIGN KEY ("policy_id")
          REFERENCES "policies"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `,
  },
  {
    name: 'Tạo index idx_package_policies_policy',
    sql: `CREATE INDEX IF NOT EXISTS "idx_package_policies_policy" ON "package_policies" ("policy_id")`,
  },
];

async function run() {
  await client.connect();
  console.log('✅ Kết nối DB thành công\n');

  for (const step of SQL_STEPS) {
    try {
      await client.query(step.sql);
      console.log(`  ✔ ${step.name}`);
    } catch (err) {
      console.error(`  ✖ ${step.name}: ${err.message}`);
    }
  }

  await client.end();
  console.log('\n🎉 Migration hoàn tất!');
}

run().catch(e => { console.error(e); process.exit(1); });
