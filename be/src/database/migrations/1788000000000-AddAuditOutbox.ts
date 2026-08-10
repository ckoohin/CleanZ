import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Hàng đợi trung gian giữa "thao tác admin đã xảy ra" và "nhật ký đã ghi xong".
 *
 * Trước đây interceptor gọi thẳng `activityRepo.save()` rồi nuốt lỗi nếu hỏng
 * (`persist()` chỉ `logger.error`). Với thao tác đọc thì đánh đổi đó hợp lý; với
 * một lệnh xoá nợ thì nó có nghĩa là tiền biến mất mà không để lại vết, và không
 * ai biết là đã không để lại vết.
 *
 * Outbox tách hai phần có rủi ro rất khác nhau:
 * - INSERT một dòng payload thô: nhanh, không phụ thuộc gì, gần như không hỏng.
 * - Dựng nội dung log (đọc snapshot entity, diff, sanitize, resolve nhãn) rồi ghi
 *   vào `admin_activity_logs`: chậm và nhiều đường hỏng — nhưng giờ do worker làm,
 *   hỏng thì thử lại, không đụng gì tới nghiệp vụ đã commit.
 *
 * `payload` giữ nguyên dạng đã sẵn sàng ghi, không phải dạng thô cần diễn giải
 * lại. Nếu worker phải tự suy luận thì mỗi lần retry lại đọc DB ở một thời điểm
 * khác nhau và có thể cho ra kết quả khác nhau — một nhật ký đổi nội dung theo số
 * lần thử là nhật ký không dùng được.
 *
 * `occurred_at` là thời điểm THAO TÁC xảy ra, không phải thời điểm worker ghi
 * xong. Thiếu cột này thì `admin_activity_logs.created_at` rơi về giờ của worker:
 * lệch ít nhất một chu kỳ quét, và tới vài phút nếu bản ghi phải retry theo
 * backoff. Tệ hơn cả lệch là SAI THỨ TỰ — một thao tác retry hai lần sẽ nằm sau
 * thao tác xảy ra muộn hơn nó, khiến dòng thời gian dựng lại từ nhật ký kể sai
 * trình tự sự việc. Đó đúng là thứ nhật ký sinh ra để trả lời.
 */
export class AddAuditOutbox1788000000000 implements MigrationInterface {
  name = 'AddAuditOutbox1788000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_outbox_status') THEN
          CREATE TYPE "audit_outbox_status" AS ENUM ('PENDING', 'APPLIED', 'FAILED');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_outbox" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "correlation_id" uuid NOT NULL,
        "payload" jsonb NOT NULL,
        "occurred_at" TIMESTAMP NOT NULL DEFAULT now(),
        "status" "audit_outbox_status" NOT NULL DEFAULT 'PENDING',
        "retry_count" integer NOT NULL DEFAULT 0,
        "next_retry_at" timestamp,
        "applied_at" timestamp,
        "last_error" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_outbox" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_audit_outbox_due"
        ON "audit_outbox" ("status", "next_retry_at")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_audit_outbox_correlation"
        ON "audit_outbox" ("correlation_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_outbox" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "audit_outbox_status"`);
  }
}
