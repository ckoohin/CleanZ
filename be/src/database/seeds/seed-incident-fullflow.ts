/**
 * Seed 1 SỰ CỐ CHI TIẾT ở trạng thái REPORTED (chưa xử lý) để test TRỌN luồng tương tác
 * giữa Admin và Tasker — không drive sẵn, hai bên tự thao tác từ đầu:
 *
 *   1. Admin  : Tiếp nhận thẩm định (REPORTED → INVESTIGATING)
 *   2. Tasker : Gửi giải trình (statement)
 *   3. Admin  : Xác minh thiệt hại từng hạng mục
 *   4. Admin  : Soạn quyết định (APPROVE, Tasker chịu) → Gửi cho Tasker
 *   5. Tasker : Phản hồi quyết định (AGREE / DISAGREE + bằng chứng)
 *   6. Admin  : Xem xét phản hồi → Chốt quyết định
 *   7. Admin  : Ghi nhận bồi thường (trừ cọc Tasker)
 *
 * Gắn với tasker demo (tạo nếu chưa có):
 *   • Email: tasker.demo@cleanz.local   • Mật khẩu: Tasker@123   • KYC APPROVED, cọc 5tr
 * Tổng yêu cầu < ngưỡng duyệt 2 cấp (2tr) ⇒ chỉ cần 1 admin, không vướng duyệt cấp 2.
 *
 * Idempotent theo title prefix [SEED-FULLFLOW]; đặt FORCE=1 để tạo thêm.
 *
 * Chạy:
 *   node -r ts-node/register -r tsconfig-paths/register src/database/seeds/seed-incident-fullflow.ts
 */
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../../app.module';
import { IncidentAdminService } from '../../modules/incident/services/incident-admin.service';

const SEED_TAG = '[SEED-FULLFLOW]';
const TASKER_EMAIL = 'tasker.demo@cleanz.local';
const TASKER_PASSWORD = 'Tasker@123';

const rand = (n = 4) =>
  Math.random()
    .toString(36)
    .slice(2, 2 + n)
    .toUpperCase();
const ymd = () => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
};

async function ensureTasker(
  ds: DataSource,
): Promise<{ taskerId: string; taskerUserId: string }> {
  let user = (
    await ds.query(`SELECT id FROM users WHERE email = $1`, [TASKER_EMAIL])
  )[0] as { id: string } | undefined;
  if (!user) {
    const hash = await bcrypt.hash(TASKER_PASSWORD, 10);
    user = (
      await ds.query(
        `INSERT INTO users (email, password_hash, full_name, role, is_active, is_verified, provider)
         VALUES ($1,$2,'Tasker Demo Bồi Thường','TASKER',true,true,'LOCAL') RETURNING id`,
        [TASKER_EMAIL, hash],
      )
    )[0] as { id: string };
    console.log(`• Đã tạo user TASKER ${TASKER_EMAIL} / ${TASKER_PASSWORD}`);
  }
  let tasker = (
    await ds.query(`SELECT id FROM taskers WHERE user_id = $1`, [user.id])
  )[0] as { id: string } | undefined;
  if (!tasker) {
    tasker = (
      await ds.query(
        `INSERT INTO taskers
           (user_id, working_address, bio, skills, status, doc_status, doc_reviewed_at,
            doc_issued_date, doc_expired_date, deposit_amount, current_deposit_balance,
            doc_front_url, doc_back_url)
         VALUES ($1,'Quận 1, TP.HCM','Tasker demo','Dọn nhà, vệ sinh',
                 'ACTIVE','APPROVED', now(), now() - interval '1 year', now() + interval '4 years',
                 5000000, 5000000,
                 'https://picsum.photos/seed/kyc-front/600/400',
                 'https://picsum.photos/seed/kyc-back/600/400') RETURNING id`,
        [user.id],
      )
    )[0] as { id: string };
    console.log('• Đã tạo hồ sơ tasker KYC APPROVED, cọc 5.000.000đ.');
  } else {
    await ds.query(
      `UPDATE taskers SET status='ACTIVE', doc_status='APPROVED', doc_reviewed_at=now(),
              deposit_amount=5000000, current_deposit_balance=5000000 WHERE id=$1`,
      [tasker.id],
    );
    console.log('• Tasker demo sẵn có → đảm bảo KYC APPROVED, cọc 5.000.000đ.');
  }
  return { taskerId: tasker.id, taskerUserId: user.id };
}

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  try {
    const ds = app.get(DataSource);
    const incidentAdmin = app.get(IncidentAdminService);

    const force = process.env.FORCE === '1';
    const admin = (
      await ds.query(`SELECT id FROM users WHERE role='ADMIN' ORDER BY created_at LIMIT 1`)
    )[0] as { id: string } | undefined;
    if (!admin) throw new Error('Không tìm thấy ADMIN.');

    const { taskerId, taskerUserId } = await ensureTasker(ds);

    if (!force) {
      const existing = (
        await ds.query(`SELECT count(*)::int n FROM incidents WHERE title LIKE $1`, [
          `${SEED_TAG}%`,
        ])
      )[0] as { n: number };
      if (existing.n > 0) {
        console.log(
          `⏭  Đã có ${existing.n} sự cố full-flow seed — bỏ qua. Đặt FORCE=1 để tạo thêm.`,
        );
        return;
      }
    }

    const customer = (
      await ds.query(
        `SELECT id AS customer_id, "user_id" AS reporter_user_id
           FROM customers ORDER BY created_at LIMIT 1`,
      )
    )[0] as { customer_id: string; reporter_user_id: string } | undefined;
    if (!customer) throw new Error('Không có customer — hãy seed tài khoản khách trước.');

    const pkg = (await ds.query(`SELECT id FROM service_packages LIMIT 1`))[0] as
      | { id: string }
      | undefined;
    if (!pkg) throw new Error('Không có service_packages.');

    // Booking COMPLETED gắn đúng tasker demo.
    const booking = (
      await ds.query(
        `INSERT INTO bookings
           (booking_code, customer_id, tasker_id, package_id, address, duration_hours,
            base_price, total_price, status, payment_method, payment_status)
         VALUES ($1,$2,$3,$4,'Chung cư Sunrise, Quận 7, TP.HCM',3,450000,450000,'COMPLETED','CASH','PAID')
         RETURNING id`,
        [`BKG-${ymd()}-${rand()}FF`, customer.customer_id, taskerId, pkg.id],
      )
    )[0] as { id: string };

    // Ticket PROPERTY_DAMAGE.
    const ticket = (
      await ds.query(
        `INSERT INTO support_tickets
           (ticket_code, subject, description, category, priority, status, source,
            booking_id, reporter_user_id, counterparty_user_id)
         VALUES ($1,$2,$3,'PROPERTY_DAMAGE','HIGH','NEW','CUSTOMER_APP',$4,$5,$6)
         RETURNING id`,
        [
          `TK-${ymd()}-${rand()}FF`,
          'Hư hỏng đồ đạc trong ca tổng vệ sinh',
          'Trong ca tổng vệ sinh 3 giờ, phát sinh một số hư hỏng cần xử lý bồi thường.',
          booking.id,
          customer.reporter_user_id,
          taskerUserId,
        ],
      )
    )[0] as { id: string };

    // Nâng cấp thành incident CHI TIẾT — nhiều hạng mục, để REPORTED.
    const items = [
      {
        description: 'Vỡ đèn trang trí trần phòng khách',
        claimedAmount: 900_000,
        photos: 2,
      },
      {
        description: 'Trầy xước mặt bàn ăn gỗ',
        claimedAmount: 600_000,
        photos: 1,
      },
      {
        description: 'Gãy chân kệ tivi',
        claimedAmount: 300_000,
        photos: 1,
      },
    ];
    const view = await incidentAdmin.createFromTicket(admin.id, ticket.id, {
      title: `${SEED_TAG} Hư hỏng đồ đạc — test trọn luồng Admin↔Tasker`,
      description:
        'Khách báo trong ca tổng vệ sinh, Tasker vô ý làm vỡ đèn trần, trầy mặt bàn ăn và gãy chân kệ tivi. ' +
        'Khách đã gửi ảnh hiện trạng ngay sau ca. Sự cố để nguyên trạng REPORTED để test đầy đủ tương tác hai bên.',
      damageItems: items.map((it) => ({
        description: it.description,
        claimedAmount: it.claimedAmount,
      })),
    });

    // Bằng chứng ảnh cho từng hạng mục.
    for (let i = 0; i < view.damageItems.length; i++) {
      const di = view.damageItems[i];
      const photos = items[i].photos;
      for (let p = 0; p < photos; p++) {
        await ds.query(
          `INSERT INTO incident_evidences (incident_id, damage_item_id, file_url, file_type, purpose)
           VALUES ($1,$2,$3,'IMAGE','DAMAGE_PHOTO')`,
          [view.id, di.id, `https://picsum.photos/seed/ff-${i}-${p}-${rand(3)}/480/360`],
        );
      }
    }

    // Giải trình sẵn của khách (Tasker sẽ tự gửi khi đăng nhập sau khi Admin tiếp nhận).
    await ds.query(
      `INSERT INTO incident_statements (incident_id, submitted_by_user_id, body) VALUES ($1,$2,$3)`,
      [
        view.id,
        customer.reporter_user_id,
        'Khách hàng: Em có mặt suốt ca và chụp lại ngay khi phát hiện. Mong CleanZ hỗ trợ đền bù hợp lý cho 3 món trên.',
      ],
    );

    const totalClaimed = items.reduce((s, it) => s + it.claimedAmount, 0);
    console.log(
      `  ✓ ${view.incidentCode ?? view.id} — REPORTED, ${items.length} hạng mục, tổng yêu cầu ${totalClaimed.toLocaleString('vi-VN')}đ`,
    );
    console.log('✅ Sẵn sàng test trọn luồng:');
    console.log(`   • Admin: mở ${view.incidentCode ?? view.id} → Tiếp nhận → Xác minh → Quyết định → Gửi Tasker → Chốt → Bồi thường`);
    console.log(`   • Tasker (${TASKER_EMAIL} / ${TASKER_PASSWORD}): Giải trình + Phản hồi quyết định`);
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error('Seed full-flow lỗi:', e?.message ?? e);
  process.exit(1);
});
