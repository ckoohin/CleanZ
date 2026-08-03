import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tạo ràng buộc "MỘT booking chỉ có MỘT sự cố đang xử lý" ở tầng DB.
 *
 * `IncidentService.createWithConflictGuard` đã bắt lỗi 23505 theo đúng tên constraint này
 * từ lâu, nhưng index thì chưa bao giờ được tạo — không migration nào (kể cả trong
 * `_archive`) sinh ra nó. Nghĩa là lớp chống trùng duy nhất đang hoạt động chỉ là
 * `SELECT ... WHERE booking_id = ? AND status <> 'CLOSED'` trong `create()`: một pha
 * check-then-act KHÔNG khoá hàng booking.
 *
 * Hai request song song (khách bấm gửi hai lần, hoặc mở hai tab) cùng vượt qua pha SELECT
 * đó và tạo hai hồ sơ trên cùng một booking. Hậu quả không dừng ở dữ liệu bẩn: mỗi hồ sơ
 * khi được tiếp nhận sẽ HOLD ví Tasker một lần, và mỗi hồ sơ chạy một luồng bồi thường
 * riêng cho cùng một thiệt hại — khách có thể được hoàn tiền hai lần.
 *
 * Dùng partial unique index thay vì UNIQUE thường vì ràng buộc chỉ áp cho hồ sơ CHƯA đóng:
 * một booking hoàn toàn có thể có nhiều sự cố đã CLOSED theo thời gian. Hàng có
 * `booking_id IS NULL` tự nằm ngoài phạm vi (NULL không đụng nhau trong unique index).
 *
 * Kèm lợi ích phụ: chính index này phục vụ luôn truy vấn kiểm tra trùng ở `create()`, vốn
 * đang phải seq scan vì `incidents` không có index nào trên `booking_id`.
 */
export class AddActiveIncidentPerBookingUnique1787000000000 implements MigrationInterface {
  name = 'AddActiveIncidentPerBookingUnique1787000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Dữ liệu cũ có thể vi phạm (trước đây không có gì chặn). Đóng bớt bản trùng, giữ lại
    // hồ sơ mới nhất cho mỗi booking — hồ sơ cũ hơn là bản tạo lặp do double-submit.
    await queryRunner.query(`
      WITH ranked AS (
        SELECT id,
               row_number() OVER (
                 PARTITION BY booking_id ORDER BY reported_at DESC, created_at DESC
               ) AS rn
          FROM incidents
         WHERE status <> 'CLOSED' AND booking_id IS NOT NULL
      )
      UPDATE incidents i
         SET status = 'CLOSED',
             closure_reason = 'DUPLICATE'
        FROM ranked r
       WHERE i.id = r.id AND r.rn > 1
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_inc_active_per_booking
        ON incidents (booking_id)
        WHERE status <> 'CLOSED' AND booking_id IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS uq_inc_active_per_booking`);
  }
}
