/**
 * Seed 5 ticket PROPERTY_DAMAGE "đúng nghiệp vụ đầy đủ" — gọi thẳng
 * TicketAdminService.createOnBehalf qua Nest application context (KHÔNG cần đăng nhập).
 * Cùng code path với API POST /admin/support-tickets → tự sinh ticket_code, SLA due,
 * status-log, counterparty suy từ booking.
 *
 * Yêu cầu: đã có booking + admin trong DB.
 * Chạy:
 *   node -r ts-node/register -r tsconfig-paths/register src/database/seeds/seed-tickets-via-api.ts
 */
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app.module';
import { TicketAdminService } from '../../modules/support-ticket/services/ticket-admin.service';

const TICKETS = [
  { subject: 'Vỡ mặt kính bàn trà phòng khách', priority: 'HIGH', description: 'Khi di chuyển bàn trà để lau sàn, nhân viên làm rơi khiến mặt kính cường lực vỡ nhiều mảnh. Bàn mới mua ~3 tháng, đề nghị hỗ trợ chi phí thay mặt kính.' },
  { subject: 'Trầy xước sàn gỗ do kéo thiết bị', priority: 'MEDIUM', description: 'Phòng ngủ xuất hiện vệt xước dài ~40cm trên sàn gỗ, nghi do kéo máy hút bụi/thùng nước không nhấc lên. Có ảnh hiện trạng.' },
  { subject: 'Nứt bồn rửa mặt khi vệ sinh nhà tắm', priority: 'HIGH', description: 'Sau ca dọn, lavabo nứt một đường ở mép, có thể do va đập vật cứng khi cọ rửa, rỉ nước nhẹ. Cần kiểm tra và đền bù.' },
  { subject: 'Đổ vỡ chậu cây cảnh ban công', priority: 'LOW', description: 'Chậu sứ cây kim tiền trên ban công bị xô ngã vỡ khi lau dọn ngoài trời, cây gãy thân. Mong hỗ trợ chi phí chậu và cây.' },
  { subject: 'Rách bề mặt ghế sofa da khi lau', priority: 'MEDIUM', description: 'Mặt ngồi sofa da bị rách/xước một mảng do dùng khăn/hoá chất không phù hợp. Vết hư rõ, ảnh hưởng thẩm mỹ, đề nghị bồi thường.' },
];

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  try {
    const ds = app.get(DataSource);
    const adminSvc = app.get(TicketAdminService);

    const admin = (
      await ds.query(`SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1`)
    )[0] as { id: string } | undefined;
    if (!admin) throw new Error('Không tìm thấy ADMIN trong users.');

    const bookings: { booking_id: string; reporter_user_id: string }[] =
      await ds.query(
        `SELECT b.id AS booking_id, c."user_id" AS reporter_user_id
         FROM bookings b JOIN customers c ON c.id = b.customer_id
         ORDER BY b.created_at DESC LIMIT 5`,
      );
    if (bookings.length === 0)
      throw new Error('Chưa có booking nào — hãy seed booking trước.');

    let created = 0;
    for (let i = 0; i < TICKETS.length; i++) {
      const b = bookings[i % bookings.length];
      const t = TICKETS[i];
      const res = await adminSvc.createOnBehalf(
        {
          reporterUserId: b.reporter_user_id,
          bookingId: b.booking_id,
          category: 'PROPERTY_DAMAGE' as never,
          subject: t.subject,
          description: t.description,
          priority: t.priority as never,
          assignToSelf: false,
        },
        admin.id,
      );
      console.log(`  ✓ ${res.ticketCode ?? '(no code)'} — ${t.subject}`);
      created++;
    }
    console.log(`✅ Đã tạo ${created} ticket PROPERTY_DAMAGE qua service (đủ SLA/log).`);
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error('Seed lỗi:', e?.message ?? e);
  process.exit(1);
});
