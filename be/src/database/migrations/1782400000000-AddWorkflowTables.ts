import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkflowTables1782400000000 implements MigrationInterface {
  name = 'AddWorkflowTables1782400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── service_workflows ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "service_workflows" (
        "id"             UUID         NOT NULL DEFAULT gen_random_uuid(),
        "sub_service_id" UUID         NULL,
        "package_id"     UUID         NULL,
        "name"           VARCHAR(200) NOT NULL,
        "description"    TEXT         NULL,
        "is_active"      BOOLEAN      NOT NULL DEFAULT true,
        "sort_order"     INT          NOT NULL DEFAULT 0,
        "created_at"     TIMESTAMP    NOT NULL DEFAULT now(),
        "updated_at"     TIMESTAMP    NOT NULL DEFAULT now(),
        CONSTRAINT "PK_service_workflows" PRIMARY KEY ("id"),
        CONSTRAINT "FK_workflows_sub_service"
          FOREIGN KEY ("sub_service_id")
          REFERENCES "sub_services"("id")
          ON DELETE CASCADE,
        CONSTRAINT "FK_workflows_package"
          FOREIGN KEY ("package_id")
          REFERENCES "service_packages"("id")
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_workflows_sub_service_id" ON "service_workflows" ("sub_service_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_workflows_package_id" ON "service_workflows" ("package_id")
    `);

    // ── workflow_steps ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "workflow_steps" (
        "id"               UUID         NOT NULL DEFAULT gen_random_uuid(),
        "workflow_id"      UUID         NOT NULL,
        "step_order"       INT          NOT NULL DEFAULT 1,
        "title"            VARCHAR(200) NOT NULL,
        "description"      TEXT         NULL,
        "duration_minutes" INT          NULL,
        "is_required"      BOOLEAN      NOT NULL DEFAULT true,
        "icon"             VARCHAR(50)  NULL,
        "checklist_items"  JSONB        NOT NULL DEFAULT '[]',
        "created_at"       TIMESTAMP    NOT NULL DEFAULT now(),
        "updated_at"       TIMESTAMP    NOT NULL DEFAULT now(),
        CONSTRAINT "PK_workflow_steps" PRIMARY KEY ("id"),
        CONSTRAINT "FK_steps_workflow"
          FOREIGN KEY ("workflow_id")
          REFERENCES "service_workflows"("id")
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_steps_workflow_id" ON "workflow_steps" ("workflow_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_steps_workflow_id"`);
    await queryRunner.query(`DROP TABLE "workflow_steps"`);
    await queryRunner.query(`DROP INDEX "IDX_workflows_package_id"`);
    await queryRunner.query(`DROP INDEX "IDX_workflows_sub_service_id"`);
    await queryRunner.query(`DROP TABLE "service_workflows"`);
  }
}
