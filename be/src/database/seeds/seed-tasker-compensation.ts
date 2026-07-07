/**
 * Seed 1 tài khoản TASKER đã duyệt KYC + 1 sự cố đã đẩy tới trạng thái SẴN SÀNG BỒI THƯỜNG
 * để test luồng bồi thường của Admin mà không bị chặn.
 *
 * Tài khoản tasker (đăng nhập được ngay):
 *   • Email:    tasker.demo@cleanz.local
 *   • Mật khẩu: Tasker@123
 *   • KYC:      status=ACTIVE, doc_status=APPROVED, is_verified=true
 *   • Cọc:      5.000.000đ (đủ để nguồn bồi thường = cọc Tasker)
 *
 * Sự cố gắn với tasker này được drive nguyên luồng bất lợi (Tasker chịu toàn bộ) qua service:
 *   createFromTicket → accept → verifyItems → saveDraft(TASKER chịu 1.5tr, <2tr)
 *   → submitDraftForTaskerResponse → [Tasker AGREE] → reviewDecisionResponse(KEEP_DECISION)
 *   → finalizeDecision  ⇒  status=APPROVED, decision=FINAL, compensation=PENDING.
 * Admin chỉ việc mở sự cố và bấm "Ghi nhận bồi thường".
 *
 * Idempotent theo title prefix [SEED-TASKER-COMP]; đặt FORCE=1 để tạo thêm.
 *
 * Chạy:
 *   node -r ts-node/register -r tsconfig-paths/register src/database/seeds/seed-tasker-compensation.ts
 */
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../../app.module';
import { IncidentAdminService } from '../../modules/incident/services/incident-admin.service';
import { IncidentDecisionService } from '../../modules/incident/services/incident-decision.service';
import { IncidentTaskerService } from '../../modules/incident/services/incident-tasker.service';

const SEED_TAG = '[SEED-TASKER-COMP]';
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
         VALUES ($1,$2,'Tasker Demo Bồi Thường','TASKER',true,true,'LOCAL')
         RETURNING id`,
        [TASKER_EMAIL, hash],
      )
    )[0] as { id: string };
    console.log(`• Đã tạo user TASKER ${TASKER_EMAIL} / ${TASKER_PASSWORD}`);
  } else {
    console.log(`• User ${TASKER_EMAIL} đã tồn tại — tái dùng.`);
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
         VALUES ($1,'Quận 1, TP.HCM','Tasker demo phục vụ test bồi thường','Dọn nhà, vệ sinh',
                 'ACTIVE','APPROVED', now(), now() - interval '1 year', now() + interval '4 years',
                 5000000, 5000000,
                 'https://picsum.photos/seed/kyc-front/600/400',
                 'https://picsum.photos/seed/kyc-back/600/400')
         RETURNING id`,
        [user.id],
      )
    )[0] as { id: string };
    console.log('• Đã tạo hồ sơ tasker KYC APPROVED, cọc 5.000.000đ.');
  } else {
    await ds.query(
      `UPDATE taskers SET status='ACTIVE', doc_status='APPROVED', doc_reviewed_at=now(),
              deposit_amount=5000000, current_deposit_balance=5000000
        WHERE id = $1`,
      [tasker.id],
    );
    console.log('• Cập nhật tasker hiện có → KYC APPROVED, cọc 5.000.000đ.');
  }

  return { taskerId: tasker.id, taskerUserId: user.id };
}

async function getCustomer(
  ds: DataSource,
): Promise<{ customerId: string; reporterUserId: string }> {
  const c = (
    await ds.query(
      `SELECT id AS customer_id, "user_id" AS reporter_user_id
         FROM customers ORDER BY created_at LIMIT 1`,
    )
  )[0] as { customer_id: string; reporter_user_id: string } | undefined;
  if (!c) throw new Error('Không có customer nào — hãy seed tài khoản khách trước.');
  return { customerId: c.customer_id, reporterUserId: c.reporter_user_id };
}

async function getPackageId(ds: DataSource): Promise<string> {
  const pkg = (await ds.query(`SELECT id FROM service_packages LIMIT 1`))[0] as
    | { id: string }
    | undefined;
  if (!pkg) throw new Error('Không có service_packages — hãy seed gói dịch vụ trước.');
  return pkg.id;
}

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  try {
    const ds = app.get(DataSource);
    const incidentAdmin = app.get(IncidentAdminService);
    const decision = app.get(IncidentDecisionService);
    const taskerSvc = app.get(IncidentTaskerService);

    const force = process.env.FORCE === '1';
    const admin = (
      await ds.query(`SELECT id FROM users WHERE role='ADMIN' ORDER BY created_at LIMIT 1`)
    )[0] as { id: string } | undefined;
    if (!admin) throw new Error('Không tìm thấy ADMIN.');

    const { taskerId, taskerUserId } = await ensureTasker(ds);

    if (!force) {
      const existing = (
        await ds.query(
          `SELECT count(*)::int n FROM incidents WHERE title LIKE $1`,
          [`${SEED_TAG}%`],
        )
      )[0] as { n: number };
      if (existing.n > 0) {
        console.log(
          `⏭  Đã có ${existing.n} sự cố bồi thường seed — bỏ qua tạo incident. Đặt FORCE=1 để tạo thêm.`,
        );
        console.log(`✅ Tasker sẵn sàng: ${TASKER_EMAIL} / ${TASKER_PASSWORD}`);
        return;
      }
    }

    const { customerId, reporterUserId } = await getCustomer(ds);
    const packageId = await getPackageId(ds);

    // Booking COMPLETED gắn đúng tasker demo.
    const booking = (
      await ds.query(
        `INSERT INTO bookings
           (booking_code, customer_id, tasker_id, package_id, address, duration_hours,
            base_price, total_price, status, payment_method, payment_status)
         VALUES ($1,$2,$3,$4,'Địa chỉ seed bồi thường, Quận 1',2,300000,300000,'COMPLETED','CASH','PAID')
         RETURNING id`,
        [`BKG-${ymd()}-${rand()}TC`, customerId, taskerId, packageId],
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
          `TK-${ymd()}-${rand()}TC`,
          'Làm vỡ TV khi lau dọn kệ',
          'Trong lúc lau kệ tủ, Tasker làm rơi TV 43 inch khiến màn hình vỡ, không còn sử dụng được.',
          booking.id,
          reporterUserId,
          taskerUserId,
        ],
      )
    )[0] as { id: string };

    // 1) Nâng cấp thành incident + hạng mục.
    const claimed = 1_800_000;
    const verified = 1_500_000;
    const approved = 1_500_000; // < ngưỡng duyệt 2 cấp (2tr) ⇒ 1 cấp.
    let view = await incidentAdmin.createFromTicket(admin.id, ticket.id, {
      title: `${SEED_TAG} Vỡ TV — Tasker chịu, chờ bồi thường`,
      description:
        'Sự cố vỡ TV do Tasker gây ra khi lau dọn. Đã đẩy tới trạng thái APPROVED/FINAL để test luồng ghi nhận bồi thường.',
      damageItems: [{ description: 'TV 43 inch bị vỡ màn hình', claimedAmount: claimed }],
    });
    const itemId = view.damageItems[0].id;

    // Bằng chứng + giải trình.
    await ds.query(
      `INSERT INTO incident_evidences (incident_id, damage_item_id, file_url, file_type, purpose)
       VALUES ($1,$2,'https://picsum.photos/seed/tv-broken/480/360','IMAGE','DAMAGE_PHOTO')`,
      [view.id, itemId],
    );
    await ds.query(
      `INSERT INTO incident_statements (incident_id, submitted_by_user_id, body) VALUES ($1,$2,$3)`,
      [view.id, reporterUserId, 'Khách hàng: TV đang dùng bình thường, sau ca dọn thì vỡ màn hình.'],
    );
    await ds.query(
      `INSERT INTO incident_statements (incident_id, submitted_by_user_id, body) VALUES ($1,$2,$3)`,
      [view.id, taskerUserId, 'Tasker: Em nhận trách nhiệm, mong được trừ vào cọc theo quy định.'],
    );

    // 2) Tiếp nhận + xác minh.
    await incidentAdmin.accept(admin.id, view.id, {});
    view = await incidentAdmin.verifyItems(view.id, {
      items: [{ itemId, verifiedAmount: verified }],
    });

    // 3) Soạn quyết định BẤT LỢI: Tasker chịu toàn bộ. (version có thể bị bump sau mỗi bước
    //    → luôn đọc lại decision.version từ view trả về để truyền expectedDecisionVersion đúng.)
    view = await decision.saveDraft(admin.id, view.id, {
      expectedDecisionVersion: view.decision.version,
      decision: 'APPROVE' as never,
      items: [{ damageItemId: itemId, approvedAmount: approved }],
      responsibilityParty: 'TASKER' as never,
      responsibilityReason: 'Tasker trực tiếp làm rơi TV, chịu hoàn toàn trách nhiệm.',
      taskerBorneAmount: approved,
      platformBorneAmount: 0,
      taskerDecisionReason: 'Đề nghị trừ 1.500.000đ vào cọc của Tasker.',
      customerDecisionSummary: 'CleanZ duyệt bồi thường 1.500.000đ cho TV bị vỡ.',
      internalDecisionNote: 'Seed test luồng bồi thường.',
    } as never);

    // 4) Gửi cho Tasker phản hồi.
    view = await decision.submitDraftForTaskerResponse(admin.id, view.id, {
      expectedDecisionVersion: view.decision.version,
    } as never);
    const responseVersion = view.decision.version;

    // 5) Tasker AGREE.
    const resp = await taskerSvc.upsertDecisionResponse(taskerUserId, view.id, {
      decisionVersion: responseVersion,
      responseType: 'AGREE' as never,
      content: 'Tôi đồng ý với quyết định bồi thường.',
    } as never);

    // 6) Admin review KEEP_DECISION.
    view = await decision.reviewDecisionResponse(admin.id, view.id, {
      expectedDecisionVersion: view.decision.version,
      responseId: (resp as { id: string }).id,
      result: 'KEEP_DECISION' as never,
      adminReviewNote: 'Tasker đã đồng ý, giữ nguyên quyết định để chốt.',
    } as never);

    // 7) Chốt ⇒ APPROVED / FINAL / compensation=PENDING.
    view = await decision.finalizeDecision(admin.id, view.id, {
      expectedDecisionVersion: view.decision.version,
    } as never);

    console.log(
      `  ✓ ${view.incidentCode ?? view.id} — status=${view.status} decision=${view.decision.status} compensation=${view.compensationStatus}`,
    );
    console.log(
      `✅ Xong. Đăng nhập admin mở sự cố ${view.incidentCode ?? view.id} → bấm "Ghi nhận bồi thường".`,
    );
    console.log(`   Tasker: ${TASKER_EMAIL} / ${TASKER_PASSWORD}`);
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error('Seed tasker-compensation lỗi:', e?.message ?? e);
  process.exit(1);
});
