import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAdminActivityLogs1784449458074 implements MigrationInterface {
  name = 'CreateAdminActivityLogs1784449458074';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Supabase cài uuid-ossp trong schema `extensions`; Postgres thường cài ở
    // `public`. Search path cục bộ này hỗ trợ cả hai mà không đổi cấu hình DB.
    await queryRunner.query(`SET LOCAL search_path TO public, extensions`);
    await queryRunner.query(`
      CREATE TABLE "admin_activity_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "actor_user_id" uuid NOT NULL,
        "actor_email" varchar(255) NOT NULL,
        "action" varchar(120) NOT NULL,
        "resource" varchar(120) NOT NULL,
        "method" varchar(10) NOT NULL,
        "path" varchar(500) NOT NULL,
        "handler" varchar(180) NOT NULL,
        "target_id" varchar(100),
        "changes" jsonb,
        "status" varchar(20) NOT NULL,
        "status_code" integer,
        "error_message" varchar(500),
        "duration_ms" integer NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_admin_activity_logs" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_admin_activity_created_at" ON "admin_activity_logs" ("created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_admin_activity_actor_created" ON "admin_activity_logs" ("actor_user_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_admin_activity_status_created" ON "admin_activity_logs" ("status", "created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "admin_activity_logs"`);
  }
}
