import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Bổ sung index cho đúng những truy vấn feature sự cố chạy thường xuyên nhất.
 *
 * Postgres KHÔNG tự tạo index cho khoá ngoại, nên `incidents` trước đây không có index nào
 * trên `customer_id`/`tasker_id` dù hàng đợi Admin lọc theo chúng. Tệ hơn: index sẵn có đều
 * theo `created_at`, trong khi mọi truy vấn danh sách đều sắp xếp theo `reported_at` — không
 * index nào phục vụ được ORDER BY, nên mỗi lần mở hàng đợi là một lần sort toàn bảng.
 * `incident_evidences` cũng chưa có index trên `incident_id`, dù mọi màn hình chi tiết đều
 * đọc theo cột đó và đây là bảng phình nhanh nhất trong feature.
 *
 * Bỏ `idx_inc_status_created`: `(status, reported_at)` phủ được mọi truy vấn mà nó phục vụ
 * (tiền tố `status` cho các vòng quét, và thêm đúng thứ tự sắp xếp thật) — giữ lại chỉ tốn
 * thêm chi phí ghi.
 */
export class AddIncidentQueryIndexes1787200000000 implements MigrationInterface {
  name = 'AddIncidentQueryIndexes1787200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Hàng đợi Admin: sắp xếp mặc định, và lọc theo trạng thái + sắp xếp.
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_inc_reported_at ON incidents (reported_at DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_inc_status_reported ON incidents (status, reported_at DESC)`,
    );

    // Lọc theo người liên quan (hồ sơ của một Tasker / một Khách).
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_inc_customer_reported ON incidents (customer_id, reported_at DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_inc_tasker_reported ON incidents (tasker_id, reported_at DESC)`,
    );

    // Quá hạn SLA: vòng quét cảnh báo + bộ lọc `overdue` + sắp xếp theo hạn quyết định.
    // Partial vì hồ sơ chưa tiếp nhận không có hạn, không cần nằm trong index.
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_inc_status_decision_due
         ON incidents (status, decision_due_at)
        WHERE decision_due_at IS NOT NULL`,
    );

    // Mọi màn hình chi tiết đều nạp bằng chứng theo sự cố.
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_ie_incident ON incident_evidences (incident_id)`,
    );

    // Vòng quét dọn ảnh upload dở dang: chỉ quan tâm hàng chưa gắn sự cố nào.
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_ie_detached_created
         ON incident_evidences (created_at)
        WHERE incident_id IS NULL`,
    );

    await queryRunner.query(`DROP INDEX IF EXISTS idx_inc_status_created`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_inc_status_created ON incidents (status, created_at)`,
    );
    for (const name of [
      'idx_ie_detached_created',
      'idx_ie_incident',
      'idx_inc_status_decision_due',
      'idx_inc_tasker_reported',
      'idx_inc_customer_reported',
      'idx_inc_status_reported',
      'idx_inc_reported_at',
    ]) {
      await queryRunner.query(`DROP INDEX IF EXISTS ${name}`);
    }
  }
}
