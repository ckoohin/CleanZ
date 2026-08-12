/**
 * Integration test LUỒNG NGHIỆP VỤ sự cố — phần KHÔNG dính tới tiền.
 *
 * `compensation-money-path.int-spec.ts` đã khoá đường tiền. File này khoá thứ còn lại và
 * cũng là thứ thay thế cho duyệt hai cấp đã gỡ: **due process** (Tasker phải được phản biện
 * trước khi bị bắt chịu tiền), khoá lạc quan theo `decisionVersion`, và các chốt chặn
 * trạng thái ở cả ba phía Admin / Tasker / Khách.
 *
 * Trước đây `assertDueProcessSatisfied` — quy tắc duy nhất bảo vệ Tasker sau khi bỏ admin
 * thứ hai — không có một test nào chạm tới.
 *
 * Chạy: `npm run test:integration` (cần Postgres theo .env; tạo/xoá DB `cleanz_workflow_test`).
 */
import { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { AppModule } from '../../app.module';
import { IncidentAdminService } from './services/incident-admin.service';
import { IncidentDecisionService } from './services/incident-decision.service';
import { IncidentTaskerService } from './services/incident-tasker.service';
import { IncidentService } from './services/incident.service';
import { CompensationExecutorService } from './services/compensation-executor.service';
import { IncidentAutomationService } from './services/incident-automation.service';
import { WalletService } from '../wallet/wallet.service';
import { IncidentAdminView } from './dto/incident-response.dto';
import {
  purgeQueuePrefix,
  useIsolatedQueuePrefix,
} from 'src/common/testing/queue-isolation';

jest.setTimeout(300_000);

const TESTDB = 'cleanz_workflow_test';
let queuePrefix = '';

function loadEnv(): void {
  const p = resolve(process.cwd(), '.env');
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    process.env[k] ??= t
      .slice(i + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '');
  }
}

/** Bắt lỗi nghiệp vụ và trả về `code` để assert — thất bại nếu lệnh lại chạy trót lọt. */
async function codeOf(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
  } catch (e) {
    const res = (e as { response?: { code?: string } }).response;
    return res?.code ?? (e as Error).message;
  }
  throw new Error('Lệnh đáng lẽ phải bị chặn nhưng lại chạy thành công');
}

describe('Incident workflow & due process (integration)', () => {
  let app: INestApplicationContext;
  let ds: DataSource;
  let adminSvc: IncidentAdminService;
  let decision: IncidentDecisionService;
  let taskerSvc: IncidentTaskerService;
  let incidentSvc: IncidentService;
  let executor: CompensationExecutorService;
  let automation: IncidentAutomationService;
  let wallet: WalletService;

  let admin1: string;
  let customerId: string;
  let customerUserId: string;
  let taskerId: string;
  let taskerUserId: string;
  let otherTaskerUserId: string;
  let packageId: string;
  let seq = 0;

  beforeAll(async () => {
    loadEnv();
    const base = {
      type: 'postgres' as const,
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
    };

    const admin = new DataSource({ ...base, database: 'postgres' });
    await admin.initialize();
    await admin
      .query(`DROP DATABASE IF EXISTS ${TESTDB} WITH (FORCE)`)
      .catch(() => undefined);
    await admin.query(`CREATE DATABASE ${TESTDB}`);
    await admin.destroy();

    const mig = new DataSource({
      ...base,
      database: TESTDB,
      migrations: ['src/database/migrations/*.ts'],
      migrationsTableName: 'migrations',
      synchronize: false,
    });
    await mig.initialize();
    await mig.runMigrations({ transaction: 'each' });
    await mig.destroy();
    // Hàng đợi BullMQ dùng chung Redis giữa các suite → phải tách prefix, nếu không
    // worker của suite này nhặt job suite trước để lại. Xem `queue-isolation`.
    queuePrefix = useIsolatedQueuePrefix(TESTDB);
    await purgeQueuePrefix(queuePrefix);

    process.env.DB_DATABASE = TESTDB;
    process.env.INCIDENT_HOUSEKEEPING_INTERVAL_MS = '0';
    process.env.INCIDENT_NOTIFICATION_OUTBOX_INTERVAL_MS = '0';
    app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error'],
    });
    ds = app.get(DataSource);
    adminSvc = app.get(IncidentAdminService);
    decision = app.get(IncidentDecisionService);
    taskerSvc = app.get(IncidentTaskerService);
    incidentSvc = app.get(IncidentService);
    executor = app.get(CompensationExecutorService);
    automation = app.get(IncidentAutomationService);
    wallet = app.get(WalletService);

    const u = async (email: string, role: string): Promise<string> =>
      (
        await ds.query(
          `INSERT INTO users (email, full_name, role, is_active, is_verified, provider)
           VALUES ($1,$2,$3,true,true,'LOCAL') RETURNING id`,
          [email, `Test ${role} ${email}`, role],
        )
      )[0].id as string;

    admin1 = await u('wf-admin@test.local', 'ADMIN');
    customerUserId = await u('wf-cus@test.local', 'CUSTOMER');
    taskerUserId = await u('wf-tk@test.local', 'TASKER');
    otherTaskerUserId = await u('wf-tk2@test.local', 'TASKER');
    customerId = (
      await ds.query(
        `INSERT INTO customers (user_id) VALUES ($1) RETURNING id`,
        [customerUserId],
      )
    )[0].id as string;
    taskerId = (
      await ds.query(
        `INSERT INTO taskers (user_id, status, doc_status)
         VALUES ($1,'ACTIVE','APPROVED') RETURNING id`,
        [taskerUserId],
      )
    )[0].id as string;
    await ds.query(
      `INSERT INTO taskers (user_id, status, doc_status) VALUES ($1,'ACTIVE','APPROVED')`,
      [otherTaskerUserId],
    );
    packageId = (
      await ds.query(
        `INSERT INTO service_packages (name, package_code) VALUES ('PKG WF','PKG-WF') RETURNING id`,
      )
    )[0].id as string;

    // Ví Tasker có tiền để `accept` giữ được và các quyết định "Tasker chịu" có nguồn thu.
    await ds.transaction(async (m) => {
      const w = await wallet.getOrCreateTaskerWallet(m, {
        id: taskerId,
      } as never);
      await m.query(`UPDATE wallets SET balance=$2 WHERE id=$1`, [
        w.id,
        50_000_000,
      ]);
      const s = await wallet.getOrCreateSystemWallet(m);
      await m.query(`UPDATE wallets SET balance=$2 WHERE id=$1`, [
        s.id,
        50_000_000,
      ]);
    });
  });

  afterAll(async () => {
    await app?.close();
    // Đóng app xong mới dọn: worker phải dừng trước, không thì nó ghi lại job mới.
    await purgeQueuePrefix(queuePrefix);
    loadEnv();
    const admin = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: 'postgres',
    });
    await admin.initialize();
    await admin
      .query(`DROP DATABASE IF EXISTS ${TESTDB} WITH (FORCE)`)
      .catch(() => undefined);
    await admin.destroy();
  });

  // ── Helpers ────────────────────────────────────────────────────────────────

  async function mintIncident(claimed: number): Promise<string> {
    seq += 1;
    const booking = (
      await ds.query(
        `INSERT INTO bookings (booking_code, customer_id, tasker_id, package_id, address,
           duration_hours, base_price, total_price, status, payment_method, payment_status,
           completed_at)
         VALUES ($1,$2,$3,$4,'WF addr',2,300000,300000,'COMPLETED','CASH','PAID', now())
         RETURNING id`,
        [`BKG-WF-${seq}`, customerId, taskerId, packageId],
      )
    )[0].id as string;
    const inc = (
      await ds.query(
        `INSERT INTO incidents (incident_code, booking_id, customer_id, tasker_id, title,
           description, status, claimed_amount, reported_at)
         VALUES ($1,$2,$3,$4,'WF test','workflow test','REPORTED',$5, now()) RETURNING id`,
        [`IC-WF-${seq}`, booking, customerId, taskerId, claimed],
      )
    )[0].id as string;
    await ds.query(
      `INSERT INTO incident_damage_items (incident_id, description, claimed_amount)
       VALUES ($1,'Hạng mục WF',$2)`,
      [inc, claimed],
    );
    return inc;
  }

  /** Tiếp nhận + soạn quyết định bắt Tasker chịu toàn bộ. */
  async function draftAdverse(
    incidentId: string,
    approved: number,
  ): Promise<IncidentAdminView> {
    await adminSvc.accept(admin1, incidentId, {});
    const view = await adminSvc.findOne(incidentId);
    return decision.saveDecision(admin1, incidentId, {
      expectedDecisionVersion: view.decision.version,
      outcome: 'COMPENSATE',
      items: [
        { damageItemId: view.damageItems[0].id, approvedAmount: approved },
      ],
      responsibilityParty: 'TASKER',
      responsibilityReason: 'Tasker trực tiếp gây thiệt hại (workflow test)',
      taskerBorneAmount: approved,
      platformBorneAmount: 0,
      customerDecisionSummary: 'CleanZ duyệt bồi thường theo thẩm định.',
    } as never);
  }

  /** Đẩy hạn phản biện về quá khứ — mô phỏng Tasker im lặng tới hết hạn. */
  async function expireResponseWindow(incidentId: string): Promise<void> {
    await ds.query(
      `UPDATE incidents SET respondent_response_deadline = now() - interval '1 hour'
        WHERE id = $1`,
      [incidentId],
    );
  }

  async function taskerHold(): Promise<number> {
    const [w] = await ds.query(
      `SELECT hold_balance FROM wallets WHERE tasker_id=$1 AND owner_type='TASKER'`,
      [taskerId],
    );
    return Number(w?.hold_balance ?? 0);
  }

  async function statusOf(incidentId: string): Promise<string> {
    const [r] = await ds.query(`SELECT status FROM incidents WHERE id=$1`, [
      incidentId,
    ]);
    return r.status as string;
  }

  // ── Due process ────────────────────────────────────────────────────────────

  it('1. Bắt Tasker chịu tiền mà chưa gửi phản biện → không chốt được', async () => {
    const inc = await mintIncident(2_000_000);
    const view = await draftAdverse(inc, 1_500_000);
    expect(view.status).toBe('REVIEWING');
    expect(view.decision.requiresTaskerResponse).toBe(true);

    expect(
      await codeOf(() =>
        decision.finalizeDecision(admin1, inc, {
          expectedDecisionVersion: view.decision.version,
        } as never),
      ),
    ).toBe('TASKER_RESPONSE_REQUIRED');
    expect(await statusOf(inc)).toBe('REVIEWING');
  });

  it('2. Đã gửi, còn hạn, Tasker chưa nói gì → vẫn không chốt được', async () => {
    const inc = await mintIncident(2_000_000);
    let view = await draftAdverse(inc, 1_500_000);
    view = await decision.sendToTasker(admin1, inc, {
      expectedDecisionVersion: view.decision.version,
    } as never);

    expect(view.status).toBe('AWAITING_RESPONSE');
    expect(view.decision.taskerResponseDeadline).toBeTruthy();
    expect(view.decision.sentTaskerBorneAmount).toBe(1_500_000);
    expect(
      await codeOf(() =>
        decision.finalizeDecision(admin1, inc, {
          expectedDecisionVersion: view.decision.version,
        } as never),
      ),
    ).toBe('TASKER_RESPONSE_WAITING');
  });

  it('3. Hết hạn mà Tasker im lặng → Admin chốt được (im lặng = không phản đối)', async () => {
    const inc = await mintIncident(2_000_000);
    let view = await draftAdverse(inc, 1_500_000);
    view = await decision.sendToTasker(admin1, inc, {
      expectedDecisionVersion: view.decision.version,
    } as never);
    await expireResponseWindow(inc);

    view = await decision.finalizeDecision(admin1, inc, {
      expectedDecisionVersion: view.decision.version,
    } as never);
    expect(view.status).toBe('AWAITING_PAYOUT');
  });

  it('4. Tasker phản biện DISAGREE → chốt được ngay, không phải chờ hết hạn', async () => {
    const inc = await mintIncident(2_000_000);
    let view = await draftAdverse(inc, 1_500_000);
    view = await decision.sendToTasker(admin1, inc, {
      expectedDecisionVersion: view.decision.version,
    } as never);
    await taskerSvc.upsertDecisionResponse(taskerUserId, inc, {
      decisionVersion: view.decision.version,
      responseType: 'DISAGREE',
      content: 'Em không đồng ý, thiết bị đã hỏng sẵn từ trước ca làm.',
    } as never);

    view = await decision.finalizeDecision(admin1, inc, {
      expectedDecisionVersion: view.decision.version,
    } as never);
    expect(view.status).toBe('AWAITING_PAYOUT');
    expect(view.decisionResponses).toHaveLength(1);
    expect(view.decisionResponses[0].responseType).toBe('DISAGREE');
  });

  /**
   * Ca nguy hiểm nhất của mô hình một-admin: sửa tăng phần Tasker chịu SAU khi họ đã phản
   * hồi. Nếu chốt được luôn thì Tasker bị áp một con số chưa từng được cho ý kiến.
   */
  it('5. Tăng phần Tasker chịu sau khi đã gửi → phải gửi lại, không chốt lén được', async () => {
    const inc = await mintIncident(4_000_000);
    let view = await draftAdverse(inc, 1_500_000);
    view = await decision.sendToTasker(admin1, inc, {
      expectedDecisionVersion: view.decision.version,
    } as never);
    await taskerSvc.upsertDecisionResponse(taskerUserId, inc, {
      decisionVersion: view.decision.version,
      responseType: 'AGREE',
      content: 'Đồng ý mức 1.500.000đ',
    } as never);

    // Admin nâng lên 3.000.000đ.
    view = await decision.saveDecision(admin1, inc, {
      expectedDecisionVersion: view.decision.version,
      outcome: 'COMPENSATE',
      items: [
        { damageItemId: view.damageItems[0].id, approvedAmount: 3_000_000 },
      ],
      responsibilityParty: 'TASKER',
      responsibilityReason: 'Phát hiện thêm thiệt hại sau khi thẩm định lại',
      taskerBorneAmount: 3_000_000,
      platformBorneAmount: 0,
      customerDecisionSummary:
        'CleanZ điều chỉnh mức bồi thường sau thẩm định.',
    } as never);

    // Sửa quyết định kéo hồ sơ về REVIEWING và huỷ hiệu lực bản đã gửi.
    expect(view.status).toBe('REVIEWING');
    expect(view.decision.sentTaskerBorneAmount).toBeNull();
    expect(
      await codeOf(() =>
        decision.finalizeDecision(admin1, inc, {
          expectedDecisionVersion: view.decision.version,
        } as never),
      ),
    ).toBe('TASKER_RESPONSE_REQUIRED');

    // Gửi lại + hết hạn thì mới chốt được, và phản hồi cũ (version cũ) không tính.
    view = await decision.sendToTasker(admin1, inc, {
      expectedDecisionVersion: view.decision.version,
    } as never);
    expect(
      await codeOf(() =>
        decision.finalizeDecision(admin1, inc, {
          expectedDecisionVersion: view.decision.version,
        } as never),
      ),
    ).toBe('TASKER_RESPONSE_WAITING');
    await expireResponseWindow(inc);
    view = await decision.finalizeDecision(admin1, inc, {
      expectedDecisionVersion: view.decision.version,
    } as never);
    expect(view.status).toBe('AWAITING_PAYOUT');
    expect(view.taskerBorneAmount).toBe(3_000_000);
  });

  it('6. Quyết định nền tảng chịu → chốt thẳng, và gửi phản biện bị từ chối', async () => {
    const inc = await mintIncident(2_000_000);
    await adminSvc.accept(admin1, inc, {});
    let view = await adminSvc.findOne(inc);
    view = await decision.saveDecision(admin1, inc, {
      expectedDecisionVersion: view.decision.version,
      outcome: 'COMPENSATE',
      items: [
        { damageItemId: view.damageItems[0].id, approvedAmount: 1_000_000 },
      ],
      responsibilityParty: 'PLATFORM',
      responsibilityReason: 'Lỗi quy trình của CleanZ, Tasker không có lỗi',
      taskerBorneAmount: 0,
      platformBorneAmount: 1_000_000,
      customerDecisionSummary: 'CleanZ hỗ trợ toàn bộ chi phí khắc phục.',
    } as never);

    expect(view.decision.requiresTaskerResponse).toBe(false);
    expect(
      await codeOf(() =>
        decision.sendToTasker(admin1, inc, {
          expectedDecisionVersion: view.decision.version,
        } as never),
      ),
    ).toBe('TASKER_RESPONSE_NOT_REQUIRED');

    view = await decision.finalizeDecision(admin1, inc, {
      expectedDecisionVersion: view.decision.version,
    } as never);
    expect(view.status).toBe('AWAITING_PAYOUT');
  });

  // ── Khoá lạc quan & chốt chặn trạng thái ───────────────────────────────────

  it('7. Lưu quyết định với version cũ → xung đột, không ghi đè người khác', async () => {
    const inc = await mintIncident(2_000_000);
    const view = await draftAdverse(inc, 1_000_000);
    const stale = view.decision.version - 1;

    expect(
      await codeOf(() =>
        decision.saveDecision(admin1, inc, {
          expectedDecisionVersion: stale,
          outcome: 'COMPENSATE',
          items: [
            { damageItemId: view.damageItems[0].id, approvedAmount: 900_000 },
          ],
          responsibilityParty: 'TASKER',
          responsibilityReason: 'Ghi đè bằng version cũ (phải bị chặn)',
          taskerBorneAmount: 900_000,
          platformBorneAmount: 0,
          customerDecisionSummary: 'Bản chỉnh sửa dựa trên dữ liệu cũ.',
        } as never),
      ),
    ).toBe('DECISION_VERSION_CONFLICT');
    expect((await adminSvc.findOne(inc)).approvedAmount).toBe(1_000_000);
  });

  it('8. Lưu lại y hệt khi đang soạn → không bump version (idempotent)', async () => {
    const inc = await mintIncident(2_000_000);
    const view = await draftAdverse(inc, 1_000_000);
    const same = await decision.saveDecision(admin1, inc, {
      expectedDecisionVersion: view.decision.version,
      outcome: 'COMPENSATE',
      items: [
        { damageItemId: view.damageItems[0].id, approvedAmount: 1_000_000 },
      ],
      responsibilityParty: 'TASKER',
      responsibilityReason: 'Tasker trực tiếp gây thiệt hại (workflow test)',
      taskerBorneAmount: 1_000_000,
      platformBorneAmount: 0,
      customerDecisionSummary: 'CleanZ duyệt bồi thường theo thẩm định.',
    } as never);
    expect(same.decision.version).toBe(view.decision.version);
  });

  /**
   * Hồi quy: guard "không đổi gì thì không bump version" từng chỉ áp cho REVIEWING, nên
   * một cú bấm Lưu vô hại lúc đang chờ phản biện sẽ xoá hạn phản hồi, kéo hồ sơ về
   * REVIEWING và vô hiệu hoá phản hồi Tasker đã gửi.
   */
  it('8b. Lưu lại y hệt khi đang chờ phản biện → không đụng tới cửa sổ phản biện', async () => {
    const inc = await mintIncident(2_000_000);
    let view = await draftAdverse(inc, 1_000_000);
    view = await decision.sendToTasker(admin1, inc, {
      expectedDecisionVersion: view.decision.version,
    } as never);
    await taskerSvc.upsertDecisionResponse(taskerUserId, inc, {
      decisionVersion: view.decision.version,
      responseType: 'AGREE',
      content: 'Đồng ý với mức bồi thường',
    } as never);
    const deadline = view.decision.taskerResponseDeadline;

    const after = await decision.saveDecision(admin1, inc, {
      expectedDecisionVersion: view.decision.version,
      outcome: 'COMPENSATE',
      items: [
        { damageItemId: view.damageItems[0].id, approvedAmount: 1_000_000 },
      ],
      responsibilityParty: 'TASKER',
      responsibilityReason: 'Tasker trực tiếp gây thiệt hại (workflow test)',
      taskerBorneAmount: 1_000_000,
      platformBorneAmount: 0,
      customerDecisionSummary: 'CleanZ duyệt bồi thường theo thẩm định.',
    } as never);

    expect(after.status).toBe('AWAITING_RESPONSE');
    expect(after.decision.version).toBe(view.decision.version);
    expect(after.decision.taskerResponseDeadline).toEqual(deadline);
    expect(after.decision.sentTaskerBorneAmount).toBe(1_000_000);
    // Phản hồi của Tasker vẫn thuộc version hiện tại nên vẫn có hiệu lực → chốt được ngay.
    const finalized = await decision.finalizeDecision(admin1, inc, {
      expectedDecisionVersion: after.decision.version,
    } as never);
    expect(finalized.status).toBe('AWAITING_PAYOUT');
  });

  it('9. Đã chốt thì không sửa được quyết định nữa', async () => {
    const inc = await mintIncident(2_000_000);
    let view = await draftAdverse(inc, 1_000_000);
    view = await decision.sendToTasker(admin1, inc, {
      expectedDecisionVersion: view.decision.version,
    } as never);
    await expireResponseWindow(inc);
    view = await decision.finalizeDecision(admin1, inc, {
      expectedDecisionVersion: view.decision.version,
    } as never);

    expect(
      await codeOf(() =>
        decision.saveDecision(admin1, inc, {
          expectedDecisionVersion: view.decision.version,
          outcome: 'COMPENSATE',
          items: [
            { damageItemId: view.damageItems[0].id, approvedAmount: 500_000 },
          ],
          responsibilityParty: 'TASKER',
          responsibilityReason: 'Sửa sau khi đã chốt (phải bị chặn)',
          taskerBorneAmount: 500_000,
          platformBorneAmount: 0,
          customerDecisionSummary: 'Bản sửa sau khi đã chốt.',
        } as never),
      ),
    ).toBe('INCIDENT_NOT_EDITABLE');
  });

  it('10. Chi trả khi chưa chốt → bị chặn', async () => {
    const inc = await mintIncident(2_000_000);
    await draftAdverse(inc, 1_000_000);
    expect(await codeOf(() => executor.execute(admin1, inc))).toBe(
      'INCIDENT_NOT_AWAITING_PAYOUT',
    );
  });

  // ── Phía Tasker ────────────────────────────────────────────────────────────

  it('11. Tasker không phản hồi được khi cửa sổ chưa mở, đã hết hạn, hoặc sai version', async () => {
    const inc = await mintIncident(2_000_000);
    let view = await draftAdverse(inc, 1_000_000);

    // Chưa gửi → cửa sổ chưa mở.
    expect(
      await codeOf(() =>
        taskerSvc.upsertDecisionResponse(taskerUserId, inc, {
          decisionVersion: view.decision.version,
          responseType: 'AGREE',
        } as never),
      ),
    ).toBe('TASKER_RESPONSE_NOT_OPEN');

    view = await decision.sendToTasker(admin1, inc, {
      expectedDecisionVersion: view.decision.version,
    } as never);

    // Sai version.
    expect(
      await codeOf(() =>
        taskerSvc.upsertDecisionResponse(taskerUserId, inc, {
          decisionVersion: view.decision.version + 5,
          responseType: 'AGREE',
        } as never),
      ),
    ).toBe('DECISION_VERSION_CONFLICT');

    // Người khác không phản hồi hộ được.
    expect(
      await codeOf(() =>
        taskerSvc.upsertDecisionResponse(otherTaskerUserId, inc, {
          decisionVersion: view.decision.version,
          responseType: 'AGREE',
        } as never),
      ),
    ).toBe('INCIDENT_NOT_FOUND');

    // DISAGREE mà không nêu lý do.
    expect(
      await codeOf(() =>
        taskerSvc.upsertDecisionResponse(taskerUserId, inc, {
          decisionVersion: view.decision.version,
          responseType: 'DISAGREE',
          content: 'ngắn',
        } as never),
      ),
    ).toBe('DECISION_RESPONSE_CONTENT_REQUIRED');

    // Hết hạn.
    await expireResponseWindow(inc);
    expect(
      await codeOf(() =>
        taskerSvc.upsertDecisionResponse(taskerUserId, inc, {
          decisionVersion: view.decision.version,
          responseType: 'AGREE',
        } as never),
      ),
    ).toBe('TASKER_RESPONSE_WINDOW_EXPIRED');
  });

  // ── Phía Khách ─────────────────────────────────────────────────────────────

  it('12. Khách rút được khi đang thẩm định, nhưng không rút sau khi quyết định đã gửi', async () => {
    const inc = await mintIncident(2_000_000);
    const drafted = await draftAdverse(inc, 1_000_000);
    await decision.sendToTasker(admin1, inc, {
      expectedDecisionVersion: drafted.decision.version,
    } as never);

    expect(
      await codeOf(() =>
        incidentSvc.withdraw(customerUserId, inc, {} as never),
      ),
    ).toBe('INCIDENT_NOT_WITHDRAWABLE');

    const other = await mintIncident(2_000_000);
    const accepted = await adminSvc.accept(admin1, other, {});
    const held = accepted.taskerWalletHoldAmount ?? 0;
    expect(held).toBe(2_000_000);

    const holdBefore = await taskerHold();
    const withdrawn = await incidentSvc.withdraw(customerUserId, other, {
      reason: 'Hai bên đã tự thoả thuận xong',
    } as never);
    expect(withdrawn.status).toBe('CLOSED');
    // Rút khi đang thẩm định phải trả lại đúng khoản đã tạm giữ lúc tiếp nhận — so theo
    // DELTA, vì các test khác trong file cũng đang giữ tiền trên cùng một ví.
    expect(await taskerHold()).toBe(holdBefore - held);
    expect((await adminSvc.findOne(other)).taskerWalletHoldAmount).toBe(0);
  });

  it('13. Hạng mục cần bổ sung bằng chứng chặn chốt; khách bổ sung → về chờ thẩm định lại', async () => {
    const inc = await mintIncident(2_000_000);
    await adminSvc.accept(admin1, inc, {});
    let view = await adminSvc.findOne(inc);
    const itemId = view.damageItems[0].id;

    view = await decision.saveDecision(admin1, inc, {
      expectedDecisionVersion: view.decision.version,
      outcome: 'COMPENSATE',
      items: [
        {
          damageItemId: itemId,
          approvedAmount: 800_000,
          status: 'NEED_MORE_EVIDENCE',
        },
      ],
      responsibilityParty: 'PLATFORM',
      responsibilityReason: 'Chờ khách bổ sung ảnh hiện trạng rõ hơn',
      taskerBorneAmount: 0,
      platformBorneAmount: 800_000,
      customerDecisionSummary:
        'CleanZ cần thêm bằng chứng để hoàn tất thẩm định.',
    } as never);

    expect(
      await codeOf(() =>
        decision.finalizeDecision(admin1, inc, {
          expectedDecisionVersion: view.decision.version,
        } as never),
      ),
    ).toBe('DAMAGE_ITEMS_NOT_FINALIZABLE');

    const evidenceId = (
      await ds.query(
        `INSERT INTO incident_evidences (file_url, file_type, purpose, uploaded_by_user_id)
         VALUES ('https://example.local/wf.jpg','IMAGE','DAMAGE_PHOTO',$1) RETURNING id`,
        [customerUserId],
      )
    )[0].id as string;
    await incidentSvc.attachItemEvidence(customerUserId, inc, itemId, [
      evidenceId,
    ]);

    const [item] = await ds.query(
      `SELECT verification_status FROM incident_damage_items WHERE id=$1`,
      [itemId],
    );
    expect(item.verification_status).toBe('PENDING');
  });

  // ── Thu hồi quyết định khi chưa chi ────────────────────────────────────────

  /**
   * Trước đây `AWAITING_PAYOUT → REVIEWING` được khai báo trong bảng trạng thái nhưng không
   * lệnh nào đi được: chốt nhầm thì phải chi tiền sai đi rồi mới đảo lại.
   */
  it('20. Thu hồi quyết định đã chốt: về đúng trạng thái trước đó, phản biện cũ còn hiệu lực', async () => {
    const inc = await mintIncident(3_000_000);
    let view = await draftAdverse(inc, 2_000_000);
    view = await decision.sendToTasker(admin1, inc, {
      expectedDecisionVersion: view.decision.version,
    } as never);
    await taskerSvc.upsertDecisionResponse(taskerUserId, inc, {
      decisionVersion: view.decision.version,
      responseType: 'AGREE',
      content: 'Đồng ý với mức bồi thường',
    } as never);
    view = await decision.finalizeDecision(admin1, inc, {
      expectedDecisionVersion: view.decision.version,
    } as never);
    expect(view.status).toBe('AWAITING_PAYOUT');
    expect(view.decision.allowedActions).toContain('WITHDRAW_DECISION');

    const versionBefore = view.decision.version;
    view = await decision.withdrawDecision(admin1, inc, {
      expectedDecisionVersion: versionBefore,
      reason: 'Chốt nhầm mức duyệt, cần xem lại hoá đơn sửa chữa',
    } as never);

    // Đã từng gửi Tasker → về AWAITING_RESPONSE chứ không phải REVIEWING.
    expect(view.status).toBe('AWAITING_RESPONSE');
    expect(view.decision.version).toBe(versionBefore);
    expect(view.decision.finalizedAt).toBeNull();
    // Phản hồi cũ vẫn thuộc version hiện tại nên chốt lại được ngay, không phải gửi lại.
    view = await decision.finalizeDecision(admin1, inc, {
      expectedDecisionVersion: versionBefore,
    } as never);
    expect(view.status).toBe('AWAITING_PAYOUT');
  });

  it('21. Quyết định nền tảng chịu (chưa từng gửi Tasker) thu hồi thì về REVIEWING', async () => {
    const inc = await mintIncident(2_000_000);
    await adminSvc.accept(admin1, inc, {});
    let view = await adminSvc.findOne(inc);
    view = await decision.saveDecision(admin1, inc, {
      expectedDecisionVersion: view.decision.version,
      outcome: 'COMPENSATE',
      items: [
        { damageItemId: view.damageItems[0].id, approvedAmount: 1_000_000 },
      ],
      responsibilityParty: 'PLATFORM',
      responsibilityReason: 'Lỗi quy trình của CleanZ, Tasker không có lỗi',
      taskerBorneAmount: 0,
      platformBorneAmount: 1_000_000,
      customerDecisionSummary: 'CleanZ hỗ trợ toàn bộ chi phí khắc phục.',
    } as never);
    view = await decision.finalizeDecision(admin1, inc, {
      expectedDecisionVersion: view.decision.version,
    } as never);

    view = await decision.withdrawDecision(admin1, inc, {
      expectedDecisionVersion: view.decision.version,
      reason: 'Phát hiện thiệt hại thấp hơn con số đã duyệt',
    } as never);
    expect(view.status).toBe('REVIEWING');

    // Và sửa lại được — đây chính là mục đích của việc thu hồi.
    view = await decision.saveDecision(admin1, inc, {
      expectedDecisionVersion: view.decision.version,
      outcome: 'COMPENSATE',
      items: [
        { damageItemId: view.damageItems[0].id, approvedAmount: 600_000 },
      ],
      responsibilityParty: 'PLATFORM',
      responsibilityReason: 'Lỗi quy trình của CleanZ, mức thiệt hại thấp hơn',
      taskerBorneAmount: 0,
      platformBorneAmount: 600_000,
      customerDecisionSummary:
        'CleanZ điều chỉnh mức hỗ trợ sau khi thẩm định lại.',
    } as never);
    expect(view.approvedAmount).toBe(600_000);
  });

  it('22. Không thu hồi được khi chưa chốt, và đã chi rồi thì phải dùng đảo bồi thường', async () => {
    const notFinalized = await mintIncident(2_000_000);
    const drafted = await draftAdverse(notFinalized, 1_000_000);
    expect(
      await codeOf(() =>
        decision.withdrawDecision(admin1, notFinalized, {
          expectedDecisionVersion: drafted.decision.version,
          reason: 'Thử thu hồi khi chưa chốt gì cả',
        } as never),
      ),
    ).toBe('DECISION_NOT_FINALIZED');

    const paid = await mintIncident(2_000_000);
    let view = await draftAdverse(paid, 1_000_000);
    view = await decision.sendToTasker(admin1, paid, {
      expectedDecisionVersion: view.decision.version,
    } as never);
    await expireResponseWindow(paid);
    view = await decision.finalizeDecision(admin1, paid, {
      expectedDecisionVersion: view.decision.version,
    } as never);
    view = await executor.execute(admin1, paid);

    expect(
      await codeOf(() =>
        decision.withdrawDecision(admin1, paid, {
          expectedDecisionVersion: view.decision.version,
          reason: 'Thử thu hồi sau khi tiền đã rời ví',
        } as never),
      ),
    ).toBe('COMPENSATION_ALREADY_PAID');
  });

  // ── Chống trùng hồ sơ trên cùng một booking ────────────────────────────────

  /**
   * Ràng buộc này từng chỉ tồn tại trong code bắt lỗi: `createWithConflictGuard` bắt 23505
   * theo tên `uq_inc_active_per_booking`, nhưng index đó chưa bao giờ được tạo. Lớp chặn
   * thật khi ấy chỉ là một pha check-then-act không khoá.
   */
  it('18. Hai request song song trên cùng booking chỉ tạo được MỘT sự cố', async () => {
    seq += 1;
    const booking = (
      await ds.query(
        `INSERT INTO bookings (booking_code, customer_id, tasker_id, package_id, address,
           duration_hours, base_price, total_price, status, payment_method, payment_status,
           completed_at)
         VALUES ($1,$2,$3,$4,'WF race',2,300000,300000,'COMPLETED','CASH','PAID', now())
         RETURNING id`,
        [`BKG-WF-RACE-${seq}`, customerId, taskerId, packageId],
      )
    )[0].id as string;

    const evidenceOf = async (): Promise<string> =>
      (
        await ds.query(
          `INSERT INTO incident_evidences (file_url, file_type, purpose, uploaded_by_user_id)
           VALUES ('https://example.local/race.jpg','IMAGE','DAMAGE_PHOTO',$1) RETURNING id`,
          [customerUserId],
        )
      )[0].id as string;

    const report = (evidenceId: string) =>
      incidentSvc.create(customerUserId, {
        bookingId: booking,
        title: 'Báo cáo double-submit',
        description: 'Khách bấm gửi hai lần / mở hai tab.',
        damageItems: [
          {
            description: 'Hạng mục race',
            claimedAmount: 500_000,
            evidenceIds: [evidenceId],
          },
        ],
      } as never);

    const [a, b] = await Promise.allSettled([
      report(await evidenceOf()),
      report(await evidenceOf()),
    ]);
    const ok = [a, b].filter((r) => r.status === 'fulfilled');
    const failed = [a, b].filter((r) => r.status === 'rejected');

    expect(ok).toHaveLength(1);
    expect(failed).toHaveLength(1);

    const [row] = await ds.query(
      `SELECT count(*)::int n FROM incidents WHERE booking_id=$1 AND status <> 'CLOSED'`,
      [booking],
    );
    expect(row.n).toBe(1);

    // Tuỳ thời điểm, request thua có thể bị chặn bởi pha kiểm `active` HOẶC bởi unique
    // index — đó là bản chất của cuộc đua, không đoán trước được bên nào thắng. Điều PHẢI
    // đúng ở cả hai lối: một 409 cùng hợp đồng lỗi, không phải 500 từ Postgres lọt ra ngoài
    // và cũng không phải hai dạng lỗi khác nhau cho cùng một tình huống.
    const reason = failed[0].reason as {
      status?: number;
      response?: { code?: string; incidentId?: string };
    };
    expect(reason.status).toBe(409);
    expect(reason.response?.code).toBe('INCIDENT_ALREADY_ACTIVE_FOR_BOOKING');
    expect(reason.response?.incidentId).toBeTruthy();
  });

  it('19. Booking đã đóng hồ sơ cũ thì báo cáo lại được', async () => {
    const inc = await mintIncident(1_000_000);
    const [{ booking_id: bookingId }] = await ds.query(
      `SELECT booking_id FROM incidents WHERE id=$1`,
      [inc],
    );
    await incidentSvc.withdraw(customerUserId, inc, {
      reason: 'Rút để báo cáo lại cho đúng',
    } as never);

    const evidenceId = (
      await ds.query(
        `INSERT INTO incident_evidences (file_url, file_type, purpose, uploaded_by_user_id)
         VALUES ('https://example.local/again.jpg','IMAGE','DAMAGE_PHOTO',$1) RETURNING id`,
        [customerUserId],
      )
    )[0].id as string;

    const again = await incidentSvc.create(customerUserId, {
      bookingId,
      title: 'Báo cáo lại sau khi rút',
      description: 'Hồ sơ cũ đã đóng nên booking được mở lại cho báo cáo mới.',
      damageItems: [
        {
          description: 'Hạng mục mới',
          claimedAmount: 400_000,
          evidenceIds: [evidenceId],
        },
      ],
    } as never);
    expect(again.status).toBe('REPORTED');
  });

  // ── Tạm giữ ví ─────────────────────────────────────────────────────────────

  /**
   * Lúc tiếp nhận phải giữ theo số khách TỰ KHAI vì chưa biết Tasker chịu bao nhiêu. Khi
   * quyết định đã có, giữ thừa là có hại thật: ví đóng băng chặn nhận đơn tiền mặt, và
   * tiền bị giữ ở hồ sơ này là vô hình với `recoverable` của hồ sơ khác.
   */
  it('16. Lưu quyết định co khoản giữ về đúng phần Tasker phải chịu', async () => {
    const inc = await mintIncident(9_000_000);
    const accepted = await adminSvc.accept(admin1, inc, {});
    expect(accepted.taskerWalletHoldAmount).toBe(9_000_000);

    const holdAfterAccept = await taskerHold();
    const view = await draftAdverse(inc, 1_000_000);

    expect(view.taskerWalletHoldAmount).toBe(1_000_000);
    expect(await taskerHold()).toBe(holdAfterAccept - 8_000_000);
  });

  it('17. Tiền đã trả lại nhờ co hold trở thành phần thu hồi được của hồ sơ khác', async () => {
    // Ví vừa đủ cho MỘT khoản giữ theo số khai — mô phỏng Tasker ví mỏng, nhiều hồ sơ.
    await ds.query(
      `UPDATE wallets SET balance=5000000, hold_balance=0
        WHERE tasker_id=$1 AND owner_type='TASKER'`,
      [taskerId],
    );

    const heavy = await mintIncident(5_000_000);
    await adminSvc.accept(admin1, heavy, {});
    // Trước khi co: toàn bộ ví bị hồ sơ A giữ.
    expect(await taskerHold()).toBe(5_000_000);
    await draftAdverse(heavy, 500_000); // A: Tasker chỉ chịu 500k

    // Hồ sơ B chi trả ngay sau đó — phần vừa được trả lại phải dùng được.
    const other = await mintIncident(2_000_000);
    let view = await draftAdverse(other, 2_000_000);
    view = await decision.sendToTasker(admin1, other, {
      expectedDecisionVersion: view.decision.version,
    } as never);
    await expireResponseWindow(other);
    view = await decision.finalizeDecision(admin1, other, {
      expectedDecisionVersion: view.decision.version,
    } as never);
    view = await executor.execute(admin1, other);

    expect(view.decision.recoverableFromDepositAmount).toBe(2_000_000);
    expect(view.outstandingDebtAmount).toBe(0);
  });

  // ── Khoá lạc quan & tương tranh ────────────────────────────────────────────

  /**
   * `reverse()` từng là lệnh chuyển tiền DUY NHẤT không có khoá lạc quan — chân còn thiếu
   * của kiềng ba chân thay cho duyệt cấp 2 (khoá lạc quan + cửa sổ hoàn tác + cảnh báo).
   */
  it('23. Thu hồi bồi thường bằng version cũ bị từ chối', async () => {
    const inc = await mintIncident(2_000_000);
    let view = await draftAdverse(inc, 1_000_000);
    view = await decision.sendToTasker(admin1, inc, {
      expectedDecisionVersion: view.decision.version,
    } as never);
    await expireResponseWindow(inc);
    view = await decision.finalizeDecision(admin1, inc, {
      expectedDecisionVersion: view.decision.version,
    } as never);
    view = await executor.execute(admin1, inc);

    const currentVersion = view.decision.version;
    expect(
      await codeOf(() =>
        executor.reverse(
          admin1,
          inc,
          'Đảo dựa trên dữ liệu đã cũ trên màn hình',
          currentVersion - 1,
        ),
      ),
    ).toBe('DECISION_VERSION_CONFLICT');

    // Tiền vẫn nguyên: lệnh bị chặn TRƯỚC mọi bút toán.
    expect((await adminSvc.findOne(inc)).status).toBe('COMPENSATED');

    // Đúng version thì đảo được.
    const reversed = await executor.reverse(
      admin1,
      inc,
      'Sai mức duyệt, cần soạn lại quyết định',
      currentVersion,
    );
    expect(reversed.status).toBe('REVIEWING');
  });

  /**
   * `attachItemEvidence` từng đọc hồ sơ bằng repository riêng (ngoài transaction, không
   * khoá), nên khách gửi bằng chứng đúng lúc Admin chốt sẽ kéo hạng mục về PENDING SAU khi
   * quyết định đã chốt — tạo ra "đã chốt + còn hạng mục chờ thẩm định", đúng thứ
   * `validateFinal` sinh ra để ngăn.
   */
  it('24. Bổ sung bằng chứng song song với chốt quyết định không phá vỡ bất biến', async () => {
    const inc = await mintIncident(2_000_000);
    await adminSvc.accept(admin1, inc, {});
    let view = await adminSvc.findOne(inc);
    const itemId = view.damageItems[0].id;

    // Đánh dấu chờ bổ sung bằng chứng — điều kiện để khách được gửi thêm ảnh.
    view = await decision.saveDecision(admin1, inc, {
      expectedDecisionVersion: view.decision.version,
      outcome: 'COMPENSATE',
      items: [
        {
          damageItemId: itemId,
          approvedAmount: 800_000,
          status: 'NEED_MORE_EVIDENCE',
        },
      ],
      responsibilityParty: 'PLATFORM',
      responsibilityReason: 'Cần khách bổ sung ảnh hiện trạng rõ hơn',
      taskerBorneAmount: 0,
      platformBorneAmount: 800_000,
      customerDecisionSummary:
        'CleanZ cần thêm bằng chứng để hoàn tất thẩm định.',
    } as never);

    const evidenceId = (
      await ds.query(
        `INSERT INTO incident_evidences (file_url, file_type, purpose, uploaded_by_user_id)
         VALUES ('https://example.local/race-evi.jpg','IMAGE','DAMAGE_PHOTO',$1) RETURNING id`,
        [customerUserId],
      )
    )[0].id as string;

    // Ép ĐÚNG thế đan xen gây lỗi, thay vì chạy song song rồi hi vọng nó xảy ra.
    //
    // Chỉ kiểm "lệnh có bị chặn không" là chưa đủ: `incident_damage_items` và
    // `incident_evidences` đều có khoá ngoại trỏ về `incidents`, nên UPDATE con luôn phải
    // xin FOR KEY SHARE trên hàng cha — nó bị chặn kể cả khi code KHÔNG hề khoá. Điều phân
    // biệt được là hồ sơ đọc lên MỚI hay CŨ sau khi khoá được nhả.
    const runner = ds.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();

    let attach: Promise<unknown>;
    try {
      // Đóng vai Admin đang chốt: giữ khoá hàng hồ sơ.
      await runner.query(`SELECT id FROM incidents WHERE id = $1 FOR UPDATE`, [
        inc,
      ]);

      // Khách bấm gửi trong lúc đó. Code CŨ đọc trạng thái ngay bằng connection khác
      // (thấy REVIEWING) rồi mới bị chặn ở bước ghi; code MỚI chặn ngay từ bước đọc.
      attach = incidentSvc
        .attachItemEvidence(customerUserId, inc, itemId, [evidenceId])
        .catch((e: unknown) => e);
      await new Promise((r) => setTimeout(r, 500));

      // Admin chốt xong và commit — hồ sơ không còn ở REVIEWING nữa.
      await runner.query(
        `UPDATE incidents SET status = 'AWAITING_PAYOUT' WHERE id = $1`,
        [inc],
      );
      await runner.commitTransaction();
    } catch (e) {
      await runner.rollbackTransaction();
      throw e;
    } finally {
      await runner.release();
    }

    // Đọc trong khoá ⟹ thấy trạng thái MỚI ⟹ từ chối. Đọc ngoài khoá ⟹ vẫn tin ảnh chụp cũ
    // và ghi tiếp, tạo ra "đã chốt + hạng mục chờ thẩm định".
    const outcome = await attach;
    expect((outcome as { response?: { code?: string } })?.response?.code).toBe(
      'INCIDENT_NOT_EDITABLE',
    );

    const [row] = await ds.query(
      `SELECT verification_status AS s FROM incident_damage_items WHERE id = $1`,
      [itemId],
    );
    expect(row.s).toBe('NEED_MORE_EVIDENCE');
  });

  /**
   * `canSubmit` chỉ còn là gợi ý cho giao diện. Chốt chặn thật nằm trong `submitStatement`,
   * đọc dưới khoá — trước đây nó tin ảnh chụp lấy ngoài transaction, nên Tasker gửi giải
   * trình đúng lúc Admin chốt sẽ ghi vào một hồ sơ đã khép lại.
   */
  it('26. Gửi giải trình bị chặn khi hồ sơ vừa chuyển trạng thái ở nơi khác', async () => {
    const inc = await mintIncident(2_000_000);
    await adminSvc.accept(admin1, inc, {});

    const runner = ds.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();

    let submit: Promise<unknown>;
    try {
      await runner.query(`SELECT id FROM incidents WHERE id = $1 FOR UPDATE`, [
        inc,
      ]);

      submit = taskerSvc
        .submitStatement(taskerUserId, inc, {
          body: 'Em xin giải trình về sự việc.',
        } as never)
        .catch((e: unknown) => e);
      await new Promise((r) => setTimeout(r, 500));

      await runner.query(
        `UPDATE incidents SET status = 'AWAITING_PAYOUT' WHERE id = $1`,
        [inc],
      );
      await runner.commitTransaction();
    } catch (e) {
      await runner.rollbackTransaction();
      throw e;
    } finally {
      await runner.release();
    }

    const outcome = await submit;
    expect((outcome as Error)?.message).toMatch(/đang được thẩm định/);

    const [row] = await ds.query(
      `SELECT count(*)::int n FROM incident_statements WHERE incident_id = $1`,
      [inc],
    );
    expect(row.n).toBe(0);
  });

  it('27. Quá hạn giải trình thì bị chặn, còn hạn thì ghi được', async () => {
    const inc = await mintIncident(2_000_000);
    await adminSvc.accept(admin1, inc, {});

    await ds.query(
      `UPDATE incidents SET statement_due_at = now() - interval '1 hour' WHERE id=$1`,
      [inc],
    );
    expect(
      await codeOf(() =>
        taskerSvc.submitStatement(taskerUserId, inc, {
          body: 'Giải trình gửi sau khi đã hết hạn.',
        } as never),
      ),
    ).toMatch(/quá thời hạn/);

    await ds.query(
      `UPDATE incidents SET statement_due_at = now() + interval '1 hour' WHERE id=$1`,
      [inc],
    );
    const ok = await taskerSvc.submitStatement(taskerUserId, inc, {
      body: 'Giải trình gửi trong thời hạn cho phép.',
    } as never);
    expect(ok.id).toBeTruthy();
  });

  /**
   * Bộ lọc quá hạn nay so bằng `now()` của DB thay vì đồng hồ Node — `decision_due_at` do
   * chính DB sinh ra, so bằng đồng hồ khác là hàng đợi lệch đúng bằng độ lệch hai máy.
   *
   * Test này KHÔNG chứng minh được nguồn thời gian: app và DB chạy cùng máy nên hai đồng hồ
   * trùng nhau, đổi qua lại vẫn xanh. Nó chỉ khoá HÀNH VI của bộ lọc (đúng hồ sơ quá hạn,
   * không dính hồ sơ còn hạn) — muốn kiểm nguồn thời gian thật thì phải dựng lệch đồng hồ
   * giữa hai máy, nằm ngoài phạm vi test tự động.
   */
  it('25. Bộ lọc quá hạn chọn đúng hồ sơ', async () => {
    const overdue = await mintIncident(1_000_000);
    await adminSvc.accept(admin1, overdue, {});
    await ds.query(
      `UPDATE incidents SET decision_due_at = now() - interval '1 hour' WHERE id=$1`,
      [overdue],
    );
    const fresh = await mintIncident(1_000_000);
    await adminSvc.accept(admin1, fresh, {});
    await ds.query(
      `UPDATE incidents SET decision_due_at = now() + interval '10 years' WHERE id=$1`,
      [fresh],
    );

    const page = await adminSvc.list({
      overdue: 'true',
      limit: 100,
    } as never);
    const ids = page.data.map((i) => i.id);
    expect(ids).toContain(overdue);
    expect(ids).not.toContain(fresh);
  });

  // ── Housekeeping ───────────────────────────────────────────────────────────

  it('14. Sự cố quá hạn tiếp nhận được tự đóng và trả lại hold', async () => {
    const inc = await mintIncident(2_000_000);
    await ds.query(
      `UPDATE incidents SET reported_at = now() - interval '400 days' WHERE id=$1`,
      [inc],
    );

    const result = await automation.runHousekeeping();
    expect(result.expiredCount).toBeGreaterThanOrEqual(1);
    expect(await statusOf(inc)).toBe('CLOSED');
    const [row] = await ds.query(
      `SELECT closure_reason FROM incidents WHERE id=$1`,
      [inc],
    );
    expect(row.closure_reason).toBe('EXPIRED');
  });

  /**
   * Ảnh chỉ dùng `storagePublicId = NULL` để không gọi ra storage thật trong test; phần
   * xoá file đã có unit test riêng. Ở đây kiểm đúng hai thứ mà unit test không với tới:
   * điều kiện SQL chọn đúng hàng, và vòng quét thật sự được nối vào housekeeping.
   */
  it('15b. Housekeeping dọn ảnh upload bỏ dở, không đụng ảnh đã gắn sự cố', async () => {
    const inc = await mintIncident(1_000_000);
    const [item] = await ds.query(
      `SELECT id FROM incident_damage_items WHERE incident_id=$1`,
      [inc],
    );
    const attached = (
      await ds.query(
        `INSERT INTO incident_evidences (incident_id, damage_item_id, file_url, file_type, purpose, uploaded_by_user_id)
         VALUES ($1,$2,'https://example.local/kept.jpg','IMAGE','DAMAGE_PHOTO',$3) RETURNING id`,
        [inc, item.id, customerUserId],
      )
    )[0].id as string;

    const abandonedOld = (
      await ds.query(
        `INSERT INTO incident_evidences (file_url, file_type, purpose, uploaded_by_user_id, created_at)
         VALUES ('https://example.local/old.jpg','IMAGE','DAMAGE_PHOTO',$1, now() - interval '30 days')
         RETURNING id`,
        [customerUserId],
      )
    )[0].id as string;
    const abandonedFresh = (
      await ds.query(
        `INSERT INTO incident_evidences (file_url, file_type, purpose, uploaded_by_user_id)
         VALUES ('https://example.local/fresh.jpg','IMAGE','DAMAGE_PHOTO',$1) RETURNING id`,
        [customerUserId],
      )
    )[0].id as string;

    const result = await automation.runHousekeeping();
    expect(result.abandonedEvidencePurged).toBeGreaterThanOrEqual(1);

    const alive = async (id: string): Promise<boolean> => {
      const [r] = await ds.query(
        `SELECT count(*)::int n FROM incident_evidences WHERE id=$1`,
        [id],
      );
      return r.n === 1;
    };
    expect(await alive(abandonedOld)).toBe(false);
    // Vừa upload xong, người dùng có thể đang điền form dở — chưa được đụng vào.
    expect(await alive(abandonedFresh)).toBe(true);
    expect(await alive(attached)).toBe(true);
  });

  it('15. Auto-close bỏ qua sự cố còn nợ, đóng khi hết nợ', async () => {
    const inc = await mintIncident(3_000_000);
    let view = await draftAdverse(inc, 2_000_000);
    view = await decision.sendToTasker(admin1, inc, {
      expectedDecisionVersion: view.decision.version,
    } as never);
    await expireResponseWindow(inc);
    view = await decision.finalizeDecision(admin1, inc, {
      expectedDecisionVersion: view.decision.version,
    } as never);

    // Ví trống ngay trước khi chi → toàn bộ phần Tasker chịu thành nợ.
    await ds.query(
      `UPDATE wallets SET balance=0, hold_balance=0 WHERE tasker_id=$1 AND owner_type='TASKER'`,
      [taskerId],
    );
    view = await executor.execute(admin1, inc);
    expect(view.status).toBe('COMPENSATED');
    expect(view.outstandingDebtAmount).toBe(2_000_000);

    await ds.query(
      `UPDATE incidents SET updated_at = now() - interval '400 days' WHERE id=$1`,
      [inc],
    );
    await automation.runHousekeeping();
    expect(await statusOf(inc)).toBe('COMPENSATED');

    // Xoá nợ (đủ tuổi) → hồ sơ mới được đóng nguội.
    await ds.query(
      `UPDATE tasker_debts SET created_at = now() - interval '400 days'
        WHERE source='INCIDENT_COMPENSATION' AND source_ref_id=$1`,
      [inc],
    );
    await adminSvc.writeOffDebt(
      admin1,
      inc,
      'Tasker đã ngừng hoạt động, không còn nguồn thu hồi',
    );
    await ds.query(
      `UPDATE incidents SET updated_at = now() - interval '400 days' WHERE id=$1`,
      [inc],
    );
    await automation.runHousekeeping();
    expect(await statusOf(inc)).toBe('CLOSED');
  });
});
