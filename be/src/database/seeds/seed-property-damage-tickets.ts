/**
 * Seed 5 ticket hỗ trợ chi tiết — category PROPERTY_DAMAGE (hư hỏng tài sản).
 * Tự bootstrap dữ liệu nền tối thiểu nếu thiếu: 1 service + tối đa 5 booking (COMPLETED)
 * gắn customer/tasker có sẵn, rồi tạo 5 ticket gắn booking.
 *
 * Chạy:
 *   node -r ts-node/register -r tsconfig-paths/register src/database/seeds/seed-property-damage-tickets.ts
 */
import dataSource from '../data-source';

const TICKETS = [
  {
    subject: 'Vỡ mặt kính bàn trà phòng khách',
    description:
      'Trong lúc di chuyển bàn trà để lau sàn, nhân viên làm rơi khiến mặt kính cường lực bị vỡ thành nhiều mảnh. Bàn mới mua khoảng 3 tháng, mong được hỗ trợ bồi thường chi phí thay mặt kính.',
    priority: 'HIGH',
  },
  {
    subject: 'Trầy xước sàn gỗ do kéo thiết bị',
    description:
      'Khu vực phòng ngủ xuất hiện vệt xước dài ~40cm trên sàn gỗ công nghiệp, nghi do kéo máy hút bụi/thùng nước mà không nhấc lên. Có ảnh hiện trạng kèm theo.',
    priority: 'MEDIUM',
  },
  {
    subject: 'Nứt bồn rửa mặt khi vệ sinh nhà tắm',
    description:
      'Sau ca dọn, bồn rửa lavabo bị nứt một đường ở mép, có thể do va đập với vật cứng khi cọ rửa. Bồn bị rỉ nước nhẹ, cần kiểm tra và đền bù.',
    priority: 'HIGH',
  },
  {
    subject: 'Đổ vỡ chậu cây cảnh ban công',
    description:
      'Chậu sứ cây kim tiền trên ban công bị xô ngã và vỡ trong quá trình lau dọn khu vực ngoài trời. Cây bị gãy thân, mong được hỗ trợ chi phí chậu và cây.',
    priority: 'LOW',
  },
  {
    subject: 'Rách bề mặt ghế sofa da khi lau',
    description:
      'Mặt ngồi ghế sofa da bị rách/xước một mảng do dùng khăn/hoá chất không phù hợp khi vệ sinh. Vết hư rõ, ảnh hưởng thẩm mỹ, đề nghị xem xét bồi thường.',
    priority: 'MEDIUM',
  },
];

const rand = (n = 4) => Math.random().toString(36).slice(2, 2 + n).toUpperCase();
const ymd = () => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
};

async function main() {
  await dataSource.initialize();
  try {
    // 1) Đảm bảo có 1 service
    let service = (
      await dataSource.query(`SELECT id FROM services LIMIT 1`)
    )[0] as { id: string } | undefined;
    if (!service) {
      service = (
        await dataSource.query(
          `INSERT INTO services (name, description, base_duration_hours, is_active)
           VALUES ('Dọn dẹp nhà theo giờ', 'Dịch vụ seed cho test', 2, true) RETURNING id`,
        )
      )[0];
      console.log('• Đã tạo service nền.');
    }

    // 2) Lấy tối đa 5 cặp (customer, tasker)
    const pairs: { customer_id: string; reporter_user_id: string; tasker_id: string | null; counterparty_user_id: string | null }[] =
      await dataSource.query(
        `SELECT c.id AS customer_id, c."user_id" AS reporter_user_id,
                t.id AS tasker_id, t."user_id" AS counterparty_user_id
         FROM customers c
         LEFT JOIN LATERAL (SELECT id, "user_id" FROM taskers ORDER BY created_at LIMIT 1) t ON true
         ORDER BY c.created_at LIMIT 5`,
      );
    if (pairs.length === 0) {
      console.error('❌ Không có customer nào để gắn ticket.');
      return;
    }

    // 3) Tạo booking COMPLETED cho mỗi cặp rồi tạo ticket
    let created = 0;
    for (let i = 0; i < TICKETS.length; i++) {
      const p = pairs[i % pairs.length];
      const booking = (
        await dataSource.query(
          `INSERT INTO bookings
             (booking_code, customer_id, tasker_id, service_id, address, duration_hours,
              base_price, total_price, status, payment_method, payment_status)
           VALUES ($1,$2,$3,$4,$5,2,300000,300000,'COMPLETED','CASH','PAID') RETURNING id`,
          [
            `BKG-${ymd()}-${rand()}${i}`,
            p.customer_id,
            p.tasker_id,
            service!.id,
            'Địa chỉ seed test, Quận 1, TP.HCM',
          ],
        )
      )[0] as { id: string };

      await dataSource.query(
        `INSERT INTO support_tickets
           (ticket_code, subject, description, category, priority, status, source,
            booking_id, reporter_user_id, counterparty_user_id)
         VALUES ($1,$2,$3,'PROPERTY_DAMAGE',$4,'NEW','CUSTOMER_APP',$5,$6,$7)`,
        [
          `TK-${ymd()}-${rand()}${i}`,
          TICKETS[i].subject,
          TICKETS[i].description,
          TICKETS[i].priority,
          booking.id,
          p.reporter_user_id,
          p.counterparty_user_id,
        ],
      );
      created++;
    }

    console.log(`✅ Đã tạo ${created} booking + ${created} ticket PROPERTY_DAMAGE.`);
  } finally {
    await dataSource.destroy();
  }
}

main().catch((e) => {
  console.error('Seed lỗi:', e);
  process.exit(1);
});
