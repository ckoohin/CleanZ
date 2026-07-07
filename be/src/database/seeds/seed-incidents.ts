/**
 * Seed dữ liệu SỰ CỐ (incident) ở đủ các trạng thái để test luồng thẩm định của Admin
 * mà KHÔNG bị chặn giữa chừng. Chạy thẳng qua service (IncidentAdminService) nên đảm bảo
 * đúng bất biến state-machine + SLA/snapshot như đi qua API thật.
 *
 * Tự bootstrap các bản ghi phụ thuộc:
 *   • Admin #2 (clone từ admin hiện có) — để test "Duyệt cấp 2" cần 2 admin khác nhau.
 *   • Booking COMPLETED + ticket PROPERTY_DAMAGE cho mỗi sự cố.
 *   • Cọc Tasker được nạp đủ (hiển thị "Cọc khả dụng" hợp lý trong UI).
 *   • Bằng chứng ảnh cho từng hạng mục thiệt hại + giải trình của KH/Tasker.
 *
 * Kịch bản (ngưỡng duyệt 2 cấp mặc định = 2.000.000đ, trần chính sách = 10.000.000đ):
 *   S1  REPORTED               → test nút "Tiếp nhận thẩm định".
 *   S2  INVESTIGATING (chưa xác minh) → test "Xác minh thiệt hại".
 *   S3  INVESTIGATING (đã xác minh, tổng < 2tr) → test "Quyết định" duyệt 1 cấp.
 *   S4  INVESTIGATING (đã xác minh, tổng ≥ 2tr) → test "Quyết định" + "Duyệt cấp 2".
 *
 * Idempotent: bỏ qua nếu đã có sự cố seed (title bắt đầu bằng [SEED-INC]) — đặt FORCE=1 để tạo thêm.
 *
 * Chạy:
 *   node -r ts-node/register -r tsconfig-paths/register src/database/seeds/seed-incidents.ts
 *   FORCE=1 node -r ts-node/register -r tsconfig-paths/register src/database/seeds/seed-incidents.ts
 */
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app.module';
import { IncidentAdminService } from '../../modules/incident/services/incident-admin.service';

const SEED_TAG = '[SEED-INC]';

const rand = (n = 4) =>
  Math.random()
    .toString(36)
    .slice(2, 2 + n)
    .toUpperCase();
const ymd = () => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
};

interface Pair {
  customer_id: string;
  reporter_user_id: string;
  tasker_id: string;
  counterparty_user_id: string;
}

type Scenario = {
  key: string;
  title: string;
  description: string;
  items: { description: string; claimed: number; verified?: number }[];
  advanceTo: 'REPORTED' | 'INVESTIGATING_UNVERIFIED' | 'INVESTIGATING_VERIFIED';
};

const SCENARIOS: Scenario[] = [
  {
    key: 'S1',
    title: `${SEED_TAG} REPORTED — chờ tiếp nhận`,
    description:
      'Khách báo vỡ mặt kính bàn trà trong lúc dọn. Sự cố vừa được nâng cấp từ ticket, đang chờ Admin tiếp nhận thẩm định.',
    items: [{ description: 'Mặt kính cường lực bàn trà', claimed: 800_000 }],
    advanceTo: 'REPORTED',
  },
  {
    key: 'S2',
    title: `${SEED_TAG} INVESTIGATING — chờ xác minh`,
    description:
      'Trầy xước sàn gỗ do kéo thiết bị. Đã tiếp nhận, đang điều tra — chờ Admin nhập số tiền xác minh cho từng hạng mục.',
    items: [
      { description: 'Vệt xước dài trên sàn gỗ phòng ngủ', claimed: 900_000 },
      { description: 'Nẹp gỗ chân tường bị bong', claimed: 300_000 },
    ],
    advanceTo: 'INVESTIGATING_UNVERIFIED',
  },
  {
    key: 'S3',
    title: `${SEED_TAG} INVESTIGATING — đã xác minh, duyệt 1 cấp`,
    description:
      'Nứt bồn rửa mặt khi vệ sinh. Đã xác minh, tổng duyệt dự kiến dưới ngưỡng 2tr nên chỉ cần duyệt 1 cấp — test toàn bộ luồng Quyết định → Chốt.',
    items: [
      { description: 'Bồn rửa lavabo bị nứt mép', claimed: 1_500_000, verified: 1_200_000 },
    ],
    advanceTo: 'INVESTIGATING_VERIFIED',
  },
  {
    key: 'S4',
    title: `${SEED_TAG} INVESTIGATING — đã xác minh, cần duyệt 2 cấp`,
    description:
      'Rách sofa da + hỏng khung khi vệ sinh. Đã xác minh, tổng duyệt dự kiến ≥ 2tr nên bắt buộc Duyệt cấp 2 (cần Admin #2 khác người chốt).',
    items: [
      { description: 'Mặt ngồi sofa da bị rách', claimed: 4_000_000, verified: 3_500_000 },
      { description: 'Khung gỗ sofa bị nứt', claimed: 2_500_000, verified: 2_000_000 },
    ],
    advanceTo: 'INVESTIGATING_VERIFIED',
  },
];

async function ensureSecondAdmin(ds: DataSource): Promise<void> {
  const admins: { id: string }[] = await ds.query(
    `SELECT id FROM users WHERE role = 'ADMIN' AND is_active = true`,
  );
  if (admins.length >= 2) {
    console.log(`• Đã có ${admins.length} admin — đủ cho duyệt 2 cấp.`);
    return;
  }
  const src = (
    await ds.query(
      `SELECT password_hash FROM users WHERE role = 'ADMIN' ORDER BY created_at LIMIT 1`,
    )
  )[0] as { password_hash: string | null } | undefined;
  const email = 'admin2.seed@cleanz.local';
  await ds.query(
    `INSERT INTO users (email, password_hash, full_name, role, is_active, is_verified, provider)
     VALUES ($1,$2,'Admin Kiểm Duyệt 2','ADMIN',true,true,'LOCAL')
     ON CONFLICT (email) DO NOTHING`,
    [email, src?.password_hash ?? null],
  );
  console.log(
    `• Đã tạo Admin #2 (${email}) — dùng cùng mật khẩu với admin gốc để đăng nhập duyệt cấp 2.`,
  );
}

async function getPairs(ds: DataSource, need: number): Promise<Pair[]> {
  const pairs: Pair[] = await ds.query(
    `SELECT c.id AS customer_id, c."user_id" AS reporter_user_id,
            t.id AS tasker_id, t."user_id" AS counterparty_user_id
       FROM customers c
       CROSS JOIN LATERAL (SELECT id, "user_id" FROM taskers ORDER BY created_at LIMIT 1) t
       ORDER BY c.created_at LIMIT $1`,
    [need],
  );
  if (pairs.length === 0)
    throw new Error('Không có customer/tasker — hãy chạy seed tài khoản trước.');
  return pairs;
}

async function getPackageId(ds: DataSource): Promise<string> {
  const pkg = (await ds.query(`SELECT id FROM service_packages LIMIT 1`))[0] as
    | { id: string }
    | undefined;
  if (!pkg)
    throw new Error('Không có service_packages — hãy seed gói dịch vụ trước khi tạo booking.');
  return pkg.id;
}

/** Mỗi kịch bản 1 booking COMPLETED riêng → không đụng ràng buộc "1 incident đang xử lý/booking". */
async function createTicket(
  ds: DataSource,
  pair: Pair,
  sc: Scenario,
  packageId: string,
): Promise<string> {
  const booking = (
    await ds.query(
      `INSERT INTO bookings
         (booking_code, customer_id, tasker_id, package_id, address, duration_hours,
          base_price, total_price, status, payment_method, payment_status)
       VALUES ($1,$2,$3,$4,$5,2,300000,300000,'COMPLETED','CASH','PAID')
       RETURNING id`,
      [
        `BKG-${ymd()}-${rand()}${sc.key}`,
        pair.customer_id,
        pair.tasker_id,
        packageId,
        'Địa chỉ seed test, Quận 1, TP.HCM',
      ],
    )
  )[0] as { id: string };

  const ticket = (
    await ds.query(
      `INSERT INTO support_tickets
         (ticket_code, subject, description, category, priority, status, source,
          booking_id, reporter_user_id, counterparty_user_id)
       VALUES ($1,$2,$3,'PROPERTY_DAMAGE','HIGH','NEW','CUSTOMER_APP',$4,$5,$6)
       RETURNING id`,
      [
        `TK-${ymd()}-${rand()}${sc.key}`,
        sc.title.replace(SEED_TAG, '').trim(),
        sc.description,
        booking.id,
        pair.reporter_user_id,
        pair.counterparty_user_id,
      ],
    )
  )[0] as { id: string };
  return ticket.id;
}

async function addEvidence(
  ds: DataSource,
  incidentId: string,
  damageItemId: string,
  seed: string,
): Promise<void> {
  const url = `https://picsum.photos/seed/${seed}/480/360`;
  await ds.query(
    `INSERT INTO incident_evidences (incident_id, damage_item_id, file_url, file_type, purpose)
     VALUES ($1,$2,$3,'IMAGE','DAMAGE_PHOTO')`,
    [incidentId, damageItemId, url],
  );
}

async function addStatements(
  ds: DataSource,
  incidentId: string,
  pair: Pair,
): Promise<void> {
  await ds.query(
    `INSERT INTO incident_statements (incident_id, submitted_by_user_id, body)
     VALUES ($1,$2,$3)`,
    [
      incidentId,
      pair.reporter_user_id,
      'Khách hàng: Sự việc xảy ra vào cuối ca dọn, em có chụp lại hiện trạng ngay lúc phát hiện và gửi kèm ảnh.',
    ],
  );
  await ds.query(
    `INSERT INTO incident_statements (incident_id, submitted_by_user_id, body)
     VALUES ($1,$2,$3)`,
    [
      incidentId,
      pair.counterparty_user_id,
      'Tasker: Em xác nhận có thao tác tại khu vực đó, mong được xem xét mức độ lỗi công bằng dựa trên bằng chứng.',
    ],
  );
}

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  try {
    const ds = app.get(DataSource);
    const incidentAdmin = app.get(IncidentAdminService);

    const force = process.env.FORCE === '1';
    if (!force) {
      const existing = (
        await ds.query(
          `SELECT count(*)::int AS n FROM incidents WHERE title LIKE $1`,
          [`${SEED_TAG}%`],
        )
      )[0] as { n: number };
      if (existing.n > 0) {
        console.log(
          `⏭  Đã có ${existing.n} sự cố seed — bỏ qua. Đặt FORCE=1 để tạo thêm.`,
        );
        return;
      }
    }

    const admin = (
      await ds.query(`SELECT id FROM users WHERE role = 'ADMIN' ORDER BY created_at LIMIT 1`)
    )[0] as { id: string } | undefined;
    if (!admin) throw new Error('Không tìm thấy ADMIN trong users.');

    await ensureSecondAdmin(ds);
    const pairs = await getPairs(ds, SCENARIOS.length);
    const packageId = await getPackageId(ds);

    // Nạp cọc cho các tasker liên quan để UI hiển thị "Cọc khả dụng" hợp lý.
    const taskerIds = [...new Set(pairs.map((p) => p.tasker_id))];
    await ds.query(
      `UPDATE taskers SET current_deposit_balance = 5000000, deposit_amount = 5000000
        WHERE id = ANY($1)`,
      [taskerIds],
    );
    console.log(`• Đã nạp cọc 5.000.000đ cho ${taskerIds.length} tasker.`);

    let n = 0;
    for (let i = 0; i < SCENARIOS.length; i++) {
      const sc = SCENARIOS[i];
      const pair = pairs[i % pairs.length];
      const ticketId = await createTicket(ds, pair, sc, packageId);

      const view = await incidentAdmin.createFromTicket(admin.id, ticketId, {
        title: sc.title,
        description: sc.description,
        damageItems: sc.items.map((it) => ({
          description: it.description,
          claimedAmount: it.claimed,
        })),
      });

      // Bằng chứng + giải trình.
      for (let k = 0; k < view.damageItems.length; k++) {
        await addEvidence(ds, view.id, view.damageItems[k].id, `${sc.key}-${k}-${rand(3)}`);
      }
      await addStatements(ds, view.id, pair);

      // Đẩy trạng thái theo kịch bản.
      if (sc.advanceTo !== 'REPORTED') {
        await incidentAdmin.accept(admin.id, view.id, {});
      }
      if (sc.advanceTo === 'INVESTIGATING_VERIFIED') {
        const after = await incidentAdmin.verifyItems(view.id, {
          items: sc.items.map((it, idx) => ({
            itemId: view.damageItems[idx].id,
            verifiedAmount: it.verified ?? it.claimed,
          })),
        });
        void after;
      }

      console.log(`  ✓ ${sc.key}  ${view.incidentCode ?? view.id}  — ${sc.advanceTo}`);
      n++;
    }

    console.log(`✅ Đã seed ${n} sự cố ở đủ các trạng thái để test luồng thẩm định.`);
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error('Seed incident lỗi:', e?.message ?? e);
  process.exit(1);
});
