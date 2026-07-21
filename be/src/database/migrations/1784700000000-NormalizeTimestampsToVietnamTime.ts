import { MigrationInterface, QueryRunner } from 'typeorm';

export class NormalizeTimestampsToVietnamTime1784700000000 implements MigrationInterface {
  name = 'NormalizeTimestampsToVietnamTime1784700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      DECLARE
        r RECORD;
        shifted INT := 0;
      BEGIN
        FOR r IN
          SELECT table_name, column_name
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND data_type = 'timestamp without time zone'
            AND column_default = 'now()'
          ORDER BY table_name, column_name
        LOOP
          EXECUTE format(
            'UPDATE public.%I SET %I = %I + INTERVAL ''7 hours'' WHERE %I IS NOT NULL',
            r.table_name, r.column_name, r.column_name, r.column_name
          );
          EXECUTE format(
            'ALTER TABLE public.%I ALTER COLUMN %I SET DEFAULT (now() AT TIME ZONE ''Asia/Ho_Chi_Minh'')',
            r.table_name, r.column_name
          );
          shifted := shifted + 1;
        END LOOP;
        RAISE NOTICE 'Da chuan hoa % cot timestamp ve gio Viet Nam', shifted;
      END $$;
    `);

    // Cột này KHÔNG có DEFAULT nên vòng lặp trên bỏ sót, nhưng được ghi phía DB
    // bằng CURRENT_TIMESTAMP (incident-evidence-lifecycle.service.ts) ⇒ đang là UTC.
    await queryRunner.query(`
      UPDATE public.incident_evidences
      SET soft_deleted_at = soft_deleted_at + INTERVAL '7 hours'
      WHERE soft_deleted_at IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE public.incident_evidences
      SET soft_deleted_at = soft_deleted_at - INTERVAL '7 hours'
      WHERE soft_deleted_at IS NOT NULL
    `);

    await queryRunner.query(`
      DO $$
      DECLARE
        r RECORD;
      BEGIN
        FOR r IN
          SELECT table_name, column_name
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND data_type = 'timestamp without time zone'
            AND column_default LIKE '%Ho_Chi_Minh%'
          ORDER BY table_name, column_name
        LOOP
          EXECUTE format(
            'UPDATE public.%I SET %I = %I - INTERVAL ''7 hours'' WHERE %I IS NOT NULL',
            r.table_name, r.column_name, r.column_name, r.column_name
          );
          EXECUTE format(
            'ALTER TABLE public.%I ALTER COLUMN %I SET DEFAULT now()',
            r.table_name, r.column_name
          );
        END LOOP;
      END $$;
    `);
  }
}
