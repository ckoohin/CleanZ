import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Index phục vụ các truy vấn NÓNG của module Support Ticket.
 *
 * Mọi truy vấn tin nhắn đều lọc theo `(ticket_id, audience)` rồi sắp xếp
 * `created_at DESC` (phân trang cursor + đếm tin chưa đọc chạy mỗi lần mở danh
 * sách). Index sẵn có `idx_tm_ticket (ticket_id, created_at)` KHÔNG chứa
 * `audience` nên Postgres phải lọc lại sau khi quét — chi phí tăng theo số tin
 * của ticket, đúng vào những ticket dài nhất.
 */
export class AddTicketMessageAudienceIndex1786400000000 implements MigrationInterface {
  name = 'AddTicketMessageAudienceIndex1786400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tm_ticket_audience_created
      ON ticket_messages (ticket_id, audience, created_at DESC)
    `);
    // Đếm tin chưa đọc loại trừ tin do CHÍNH người xem gửi → lọc theo sender.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tm_sender
      ON ticket_messages (sender_user_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_tm_sender`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_tm_ticket_audience_created`,
    );
  }
}
