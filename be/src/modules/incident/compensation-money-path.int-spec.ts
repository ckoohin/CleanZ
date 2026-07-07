/**
 * P1.5 — Integration test ĐƯỜNG TIỀN bồi thường (chạy trong CI).
 *
 * Dựng DB scratch từ 0 (migration:run) → boot Nest app thật → drive nguyên luồng qua service
 * (không mock) → assert số dư ví/cọc/quỹ + bút toán. Khóa hồi quy cho:
 *   1. HOLD tại accept + chặn withdrawal + release khi chi trả (P0.2)
 *   2. Full flow chi trả tiền thật, bảo toàn tổng (P2.1)
 *   3. Idempotency: double-compensate tuần tự + concurrent race (C8)
 *   4. Quỹ SYSTEM thiếu → 409 + rollback nguyên tử (P0.4-guard)
 *   5. Uncovered → topup_due + thu hồi nợ → gỡ soft-block (P0.3)
 *   6. Reversal (Admin #2) → hoàn tiền + reopen + re-compensate version mới (P1.1)
 *
 * Chạy: `npm run test:integration` (cần Postgres theo .env; tạo/xoá DB `cleanz_money_test`).
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
import { IncidentDebtRecoveryService } from './services/incident-debt-recovery.service';
import { IncidentReconciliationService } from './services/incident-reconciliation.service';
import { WalletService } from '../wallet/wallet.service';
import { IncidentAdminView } from './dto/incident-response.dto';

jest.setTimeout(300_000);

const TESTDB = 'cleanz_money_test';

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

describe('Money path integration (P1.5)', () => {
  let app: INestApplicationContext;
  let ds: DataSource;
  let adminSvc: IncidentAdminService;
  let decision: IncidentDecisionService;
  let taskerSvc: IncidentTaskerService;
  let incidentSvc: IncidentService;
  let executor: CompensationExecutorService;
  let debtRecovery: IncidentDebtRecoveryService;
  let reconciliation: IncidentReconciliationService;
  let wallet: WalletService;

  // Fixture ids
  let admin1: string;
  let admin2: string;
  let customerId: string;
  let customerUserId: string;
  let taskerId: string;
  let taskerUserId: string;
  let packageId: string;
  let seq = 0;
  let inc1 = ''; // incident dùng chung test 1→3

  beforeAll(async () => {
    loadEnv();
    const base = {
      type: 'postgres' as const,
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
    };

    // 1) DB scratch + migrate từ 0 (validate luôn migration chain — P0.1).
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

    // 2) Boot app thật trỏ vào DB scratch; tắt các timer nền.
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
    debtRecovery = app.get(IncidentDebtRecoveryService);
    reconciliation = app.get(IncidentReconciliationService);
    wallet = app.get(WalletService);

    // 3) Fixtures nền.
    const u = async (email: string, role: string): Promise<string> =>
      (
        await ds.query(
          `INSERT INTO users (email, full_name, role, is_active, is_verified, provider)
           VALUES ($1,$2,$3,true,true,'LOCAL') RETURNING id`,
          [email, `Test ${role} ${email}`, role],
        )
      )[0].id as string;

    admin1 = await u('a1@test.local', 'ADMIN');
    admin2 = await u('a2@test.local', 'ADMIN');
    customerUserId = await u('cus@test.local', 'CUSTOMER');
    taskerUserId = await u('tk@test.local', 'TASKER');
    customerId = (
      await ds.query(
        `INSERT INTO customers (user_id) VALUES ($1) RETURNING id`,
        [customerUserId],
      )
    )[0].id as string;
    taskerId = (
      await ds.query(
        `INSERT INTO taskers (user_id, status, doc_status, deposit_amount, current_deposit_balance)
         VALUES ($1,'ACTIVE','APPROVED',400000,400000) RETURNING id`,
        [taskerUserId],
      )
    )[0].id as string;
    packageId = (
      await ds.query(
        `INSERT INTO service_packages (name, package_code) VALUES ('PKG Test','PKG-TEST') RETURNING id`,
      )
    )[0].id as string;
  });

  afterAll(async () => {
    await app?.close();
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

  /** Tạo incident REPORTED (booking + 1 damage item) qua SQL, trả về id. */
  async function mintIncident(claimed: number): Promise<string> {
    seq += 1;
    const booking = (
      await ds.query(
        `INSERT INTO bookings (booking_code, customer_id, tasker_id, package_id, address,
           duration_hours, base_price, total_price, status, payment_method, payment_status)
         VALUES ($1,$2,$3,$4,'Test addr',2,300000,300000,'COMPLETED','CASH','PAID') RETURNING id`,
        [`BKG-INT-${seq}`, customerId, taskerId, packageId],
      )
    )[0].id as string;
    const inc = (
      await ds.query(
        `INSERT INTO incidents (incident_code, booking_id, customer_id, tasker_id, title,
           description, status, claimed_amount, reported_at)
         VALUES ($1,$2,$3,$4,'INT test','money path test','REPORTED',$5, now()) RETURNING id`,
        [`IC-INT-${seq}`, booking, customerId, taskerId, claimed],
      )
    )[0].id as string;
    await ds.query(
      `INSERT INTO incident_damage_items (incident_id, description, claimed_amount)
       VALUES ($1,'Item test',$2)`,
      [inc, claimed],
    );
    return inc;
  }

  async function setTaskerWallet(balance: number, hold = 0): Promise<void> {
    await ds.transaction(async (m) => {
      const w = await wallet.getOrCreateTaskerWallet(m, {
        id: taskerId,
      } as never);
      await m.query(`UPDATE wallets SET balance=$2, hold_balance=$3 WHERE id=$1`, [
        w.id,
        balance,
        hold,
      ]);
    });
  }

  async function setCustomerWallet(balance: number): Promise<void> {
    await ds.transaction(async (m) => {
      const w = await wallet.getOrCreateCustomerWallet(m, {
        id: customerId,
      } as never);
      await m.query(`UPDATE wallets SET balance=$2 WHERE id=$1`, [w.id, balance]);
    });
  }

  async function setSystemWallet(balance: number): Promise<void> {
    await ds.transaction(async (m) => {
      const w = await wallet.getOrCreateSystemWallet(m);
      await m.query(`UPDATE wallets SET balance=$2 WHERE id=$1`, [w.id, balance]);
    });
  }

  async function balances(): Promise<{
    tasker: number;
    taskerHold: number;
    deposit: number;
    customer: number;
    system: number;
  }> {
    const [t] = await ds.query(
      `SELECT balance, hold_balance FROM wallets WHERE tasker_id=$1 AND owner_type='TASKER'`,
      [taskerId],
    );
    const [c] = await ds.query(
      `SELECT balance FROM wallets WHERE customer_id=$1 AND owner_type='CUSTOMER'`,
      [customerId],
    );
    const [s] = await ds.query(
      `SELECT balance FROM wallets WHERE owner_type='SYSTEM'`,
    );
    const [d] = await ds.query(
      `SELECT current_deposit_balance FROM taskers WHERE id=$1`,
      [taskerId],
    );
    return {
      tasker: Number(t?.balance ?? 0),
      taskerHold: Number(t?.hold_balance ?? 0),
      deposit: Number(d.current_deposit_balance),
      customer: Number(c?.balance ?? 0),
      system: Number(s?.balance ?? 0),
    };
  }

  /** Xoá nhiễu giữa các test: coi mọi nợ cũ đã thu hồi + gỡ soft-block. */
  async function clearDebts(): Promise<void> {
    await ds.query(
      `UPDATE incidents SET uncovered_recovered_amount = COALESCE(uncovered_liability_amount,0)
        WHERE tasker_id=$1`,
      [taskerId],
    );
    await ds.query(`UPDATE taskers SET deposit_topup_due=NULL WHERE id=$1`, [
      taskerId,
    ]);
  }

  /** Drive quyết định BẤT LỢI (Tasker chịu toàn bộ) tới FINAL/APPROVED/PENDING. */
  async function driveAdverseToFinal(
    incidentId: string,
    approved: number,
  ): Promise<IncidentAdminView> {
    let view = await adminSvc.findOne(incidentId);
    const itemId = view.damageItems[0].id;
    view = await adminSvc.verifyItems(incidentId, {
      items: [{ itemId, verifiedAmount: approved }],
    } as never);
    view = await decision.saveDraft(admin1, incidentId, {
      expectedDecisionVersion: view.decision.version,
      decision: 'APPROVE',
      items: [{ damageItemId: itemId, approvedAmount: approved }],
      responsibilityParty: 'TASKER',
      responsibilityReason: 'Tasker trực tiếp gây thiệt hại (integration)',
      taskerBorneAmount: approved,
      platformBorneAmount: 0,
      taskerDecisionReason: 'Trừ vào ví/cọc theo quy định',
      customerDecisionSummary: 'CleanZ duyệt bồi thường theo thẩm định.',
    } as never);
    view = await decision.submitDraftForTaskerResponse(admin1, incidentId, {
      expectedDecisionVersion: view.decision.version,
    } as never);
    const resp = (await taskerSvc.upsertDecisionResponse(
      taskerUserId,
      incidentId,
      {
        decisionVersion: view.decision.version,
        responseType: 'AGREE',
        content: 'Đồng ý với quyết định (integration test)',
      } as never,
    )) as { id: string };
    view = await decision.reviewDecisionResponse(admin1, incidentId, {
      expectedDecisionVersion: view.decision.version,
      responseId: resp.id,
      result: 'KEEP_DECISION',
      adminReviewNote: 'Giữ nguyên quyết định (integration test)',
    } as never);
    return decision.finalizeDecision(admin1, incidentId, {
      expectedDecisionVersion: view.decision.version,
    } as never);
  }

  /** Drive quyết định KHÔNG bất lợi (Quỹ chịu toàn bộ) — finalize thẳng từ DRAFT. */
  async function drivePlatformToFinal(
    incidentId: string,
    approved: number,
  ): Promise<IncidentAdminView> {
    let view = await adminSvc.findOne(incidentId);
    const itemId = view.damageItems[0].id;
    view = await adminSvc.verifyItems(incidentId, {
      items: [{ itemId, verifiedAmount: approved }],
    } as never);
    view = await decision.saveDraft(admin1, incidentId, {
      expectedDecisionVersion: view.decision.version,
      decision: 'APPROVE',
      items: [{ damageItemId: itemId, approvedAmount: approved }],
      responsibilityParty: 'PLATFORM',
      responsibilityReason: 'Lỗi quy trình nền tảng (integration test)',
      taskerBorneAmount: 0,
      platformBorneAmount: approved,
      customerDecisionSummary: 'CleanZ hỗ trợ toàn bộ chi phí.',
    } as never);
    return decision.finalizeDecision(admin1, incidentId, {
      expectedDecisionVersion: view.decision.version,
    } as never);
  }

  async function settlementTxs(
    incidentId: string,
  ): Promise<{ type: string; amount: number; ref: string }[]> {
    const rows = await ds.query(
      `SELECT type, amount, reference_type ref FROM wallet_transactions
        WHERE reference_id=$1 AND reference_type LIKE 'INCIDENT_COMPENSATION%'
        ORDER BY created_at, type`,
      [incidentId],
    );
    return rows.map((r: { type: string; amount: string; ref: string }) => ({
      type: r.type,
      amount: Number(r.amount),
      ref: r.ref,
    }));
  }

  // ── Tests (tuần tự, chia sẻ app) ───────────────────────────────────────────

  it('1. HOLD tại accept = min(claimed, ví) + chặn withdrawal khi điều tra', async () => {
    await clearDebts();
    await setTaskerWallet(2_000_000);
    const inc = await mintIncident(1_500_000);

    await adminSvc.accept(admin1, inc, {});
    const b = await balances();
    expect(b.tasker).toBe(500_000); // 2tr − hold 1.5tr
    expect(b.taskerHold).toBe(1_500_000);
    const [row] = await ds.query(
      `SELECT tasker_wallet_hold_amount h FROM incidents WHERE id=$1`,
      [inc],
    );
    expect(Number(row.h)).toBe(1_500_000);

    await expect(
      wallet.createTaskerWithdrawalRequest(taskerUserId, {
        amount: 100_000,
      } as never),
    ).rejects.toThrow(/sự cố bồi thường/);

    inc1 = inc; // giữ cho test 2–3
  });

  it('2. Full flow chi trả: bảo toàn tổng, release hold, bút toán versioned', async () => {
    const inc = inc1;
    await setCustomerWallet(0);
    await setSystemWallet(2_000_000);

    await driveAdverseToFinal(inc, 1_500_000);
    await executor.execute(admin1, inc);

    const b = await balances();
    // hold 1.5tr released về balance rồi bị trừ đúng 1.5tr → tasker còn 500k
    expect(b.tasker).toBe(500_000);
    expect(b.taskerHold).toBe(0);
    expect(b.deposit).toBe(400_000); // ví đủ, không đụng cọc gốc
    expect(b.customer).toBe(1_500_000);
    expect(b.system).toBe(2_000_000); // không cần quỹ ứng

    const txs = await settlementTxs(inc);
    expect(txs).toHaveLength(2);
    expect(txs.map((t) => t.type).sort()).toEqual(['DEPOSIT_DEDUCT', 'REFUND']);
    for (const t of txs) expect(t.ref).toBe('INCIDENT_COMPENSATION:v1');

    const [st] = await ds.query(
      `SELECT status, compensation_status cs FROM incidents WHERE id=$1`,
      [inc],
    );
    expect(st.status).toBe('COMPENSATED');
    expect(st.cs).toBe('RECORDED');
  });

  it('3. Idempotency: double-compensate tuần tự + concurrent race không nhân đôi bút toán', async () => {
    const inc = inc1;
    await executor.execute(admin1, inc); // tuần tự lần 2 → no-op
    expect(await settlementTxs(inc)).toHaveLength(2);

    // race trên incident mới
    await clearDebts();
    await setTaskerWallet(2_000_000);
    await setCustomerWallet(0);
    const inc2 = await mintIncident(1_000_000);
    await adminSvc.accept(admin1, inc2, {});
    await driveAdverseToFinal(inc2, 1_000_000);

    const results = await Promise.allSettled([
      executor.execute(admin1, inc2),
      executor.execute(admin1, inc2),
    ]);
    expect(results.some((r) => r.status === 'fulfilled')).toBe(true);
    expect(await settlementTxs(inc2)).toHaveLength(2);
    const b = await balances();
    expect(b.customer).toBe(1_000_000); // hoàn đúng 1 lần
  });

  it('4. Quỹ SYSTEM thiếu → 409 PLATFORM_FUND_INSUFFICIENT + rollback nguyên tử', async () => {
    await clearDebts();
    await setTaskerWallet(0);
    await setCustomerWallet(0);
    await setSystemWallet(0);
    await ds.query(
      `UPDATE taskers SET current_deposit_balance=0 WHERE id=$1`,
      [taskerId],
    );

    const inc = await mintIncident(1_000_000);
    await adminSvc.accept(admin1, inc, {});
    await drivePlatformToFinal(inc, 1_000_000);

    await expect(executor.execute(admin1, inc)).rejects.toThrow(
      /Quỹ nền tảng không đủ/,
    );
    const [st] = await ds.query(
      `SELECT status, compensation_status cs FROM incidents WHERE id=$1`,
      [inc],
    );
    expect(st.status).toBe('APPROVED'); // rollback — chưa COMPENSATED
    expect(st.cs).toBe('PENDING');
    expect((await balances()).customer).toBe(0);

    // nạp quỹ → chi trả được
    await setSystemWallet(2_000_000);
    await executor.execute(admin1, inc);
    const b = await balances();
    expect(b.customer).toBe(1_000_000);
    expect(b.system).toBe(1_000_000); // quỹ chi 1tr

    // khôi phục cọc gốc cho test sau
    await ds.query(
      `UPDATE taskers SET current_deposit_balance=400000 WHERE id=$1`,
      [taskerId],
    );
  });

  it('5. Uncovered: nợ + topup_due; thu hồi dần → gỡ soft-block, hoàn quỹ SYSTEM', async () => {
    await clearDebts();
    await setTaskerWallet(0);
    await setCustomerWallet(0);
    await setSystemWallet(3_000_000);
    await ds.query(
      `UPDATE taskers SET current_deposit_balance=0 WHERE id=$1`,
      [taskerId],
    );

    const inc = await mintIncident(1_000_000);
    await adminSvc.accept(admin1, inc, {}); // ví 0 → hold 0
    await driveAdverseToFinal(inc, 1_000_000);
    await executor.execute(admin1, inc);

    let [row] = await ds.query(
      `SELECT uncovered_liability_amount u, uncovered_recovered_amount r FROM incidents WHERE id=$1`,
      [inc],
    );
    expect(Number(row.u)).toBe(1_000_000); // toàn bộ thành nợ
    expect(Number(row.r)).toBe(0);
    let [tk] = await ds.query(
      `SELECT deposit_topup_due d FROM taskers WHERE id=$1`,
      [taskerId],
    );
    expect(tk.d).not.toBeNull(); // soft-block
    expect((await balances()).system).toBe(2_000_000); // quỹ ứng 1tr
    expect((await balances()).customer).toBe(1_000_000); // khách vẫn đủ

    // Tasker nạp 600k → thu hồi một phần
    await setTaskerWallet(600_000);
    const r1 = await ds.transaction((m) =>
      debtRecovery.recoverForTasker(m, taskerId),
    );
    expect(r1).toBe(600_000);
    [tk] = await ds.query(
      `SELECT deposit_topup_due d FROM taskers WHERE id=$1`,
      [taskerId],
    );
    expect(tk.d).not.toBeNull(); // còn nợ → còn block

    // nạp nốt 400k → hết nợ, gỡ block, quỹ hoàn đủ
    await setTaskerWallet(400_000);
    const r2 = await ds.transaction((m) =>
      debtRecovery.recoverForTasker(m, taskerId),
    );
    expect(r2).toBe(400_000);
    [row] = await ds.query(
      `SELECT uncovered_liability_amount u, uncovered_recovered_amount r FROM incidents WHERE id=$1`,
      [inc],
    );
    expect(Number(row.u) - Number(row.r)).toBe(0);
    [tk] = await ds.query(
      `SELECT deposit_topup_due d FROM taskers WHERE id=$1`,
      [taskerId],
    );
    expect(tk.d).toBeNull();
    expect((await balances()).system).toBe(3_000_000); // hoàn đủ phần ứng

    await ds.query(
      `UPDATE taskers SET current_deposit_balance=400000 WHERE id=$1`,
      [taskerId],
    );
  });

  it('6. Reversal: chặn maker, Admin #2 đảo → hoàn tiền + reopen v2 + re-compensate được', async () => {
    await clearDebts();
    await setTaskerWallet(0);
    await setCustomerWallet(0);
    await setSystemWallet(5_000_000);

    // dùng luồng PLATFORM (không bất lợi) để re-finalize v2 nhanh sau reverse
    const inc = await mintIncident(1_000_000);
    await adminSvc.accept(admin1, inc, {});
    await drivePlatformToFinal(inc, 1_000_000);
    await executor.execute(admin1, inc);
    expect((await balances()).customer).toBe(1_000_000);
    expect((await balances()).system).toBe(4_000_000);

    // maker (admin1) không được reverse
    await expect(
      executor.reverse(admin1, inc, 'Sai số tiền cần đảo lại'),
    ).rejects.toThrow(/Admin khác/);

    // Admin #2 reverse → tiền hoàn về, reopen v2
    await executor.reverse(admin2, inc, 'Sai số tiền, cần soạn lại quyết định');
    let b = await balances();
    expect(b.customer).toBe(0);
    expect(b.system).toBe(5_000_000);
    const [st] = await ds.query(
      `SELECT status, decision_status dst, decision_version v, compensation_status cs
         FROM incidents WHERE id=$1`,
      [inc],
    );
    expect(st.status).toBe('INVESTIGATING');
    expect(st.dst).toBe('DRAFT');
    expect(Number(st.v)).toBe(2);
    expect(st.cs).toBe('NONE');

    // re-finalize + re-compensate ở v2 — versioned unique index không được chặn
    const view = await adminSvc.findOne(inc);
    await decision.finalizeDecision(admin1, inc, {
      expectedDecisionVersion: view.decision.version,
    } as never);
    await executor.execute(admin1, inc);
    b = await balances();
    expect(b.customer).toBe(1_000_000);
    expect(b.system).toBe(4_000_000);

    const refs = (await settlementTxs(inc)).map((t) => t.ref);
    expect(refs).toContain('INCIDENT_COMPENSATION:v1');
    expect(refs).toContain('INCIDENT_COMPENSATION:v2');
    expect(refs).toContain('INCIDENT_COMPENSATION_REVERSAL');
  });

  it('7. P0.4 manual: quỹ thiếu → chi trả thủ công (proof), thu Tasker về SYSTEM, không đụng ví khách; manual không tự đảo', async () => {
    await clearDebts();
    await setTaskerWallet(600_000);
    await setCustomerWallet(0);
    await setSystemWallet(0); // quỹ cạn
    await ds.query(
      `UPDATE taskers SET current_deposit_balance=400000 WHERE id=$1`,
      [taskerId],
    );

    const inc = await mintIncident(1_500_000);
    await adminSvc.accept(admin1, inc, {}); // hold 600k (ví)
    await driveAdverseToFinal(inc, 1_500_000);

    // digital chặn vì quỹ thiếu (uncovered... recoverable 1tr < 1.5tr → cần SYSTEM ứng 500k)
    await expect(executor.execute(admin1, inc)).rejects.toThrow(
      /Quỹ nền tảng không đủ/,
    );

    // proof: thiếu/không hợp lệ → chặn
    await expect(
      executor.executeManual(
        admin1,
        inc,
        '00000000-0000-4000-8000-000000000000',
      ),
    ).rejects.toThrow(/minh chứng/);

    // upload proof (detached, đúng purpose) rồi chi trả thủ công
    const proofId = (
      await ds.query(
        `INSERT INTO incident_evidences (file_url, file_type, purpose, visibility, uploaded_by_user_id)
         VALUES ('https://proof.test/1.png','IMAGE','COMPENSATION_TRANSFER_PROOF','ADMIN_ONLY',$1)
         RETURNING id`,
        [admin1],
      )
    )[0].id as string;
    await executor.executeManual(admin1, inc, proofId, 'chuyển VCB');

    const b = await balances();
    expect(b.customer).toBe(0); // khách nhận NGOÀI — ví không đổi
    expect(b.tasker).toBe(0); // ví 600k bị trừ hết
    expect(b.deposit).toBe(0); // cọc 400k bị trừ nốt (recoverable 1tr)
    expect(b.system).toBe(1_000_000); // thu hồi từ Tasker chảy về quỹ

    const [st] = await ds.query(
      `SELECT status, compensation_status cs, uncovered_liability_amount u FROM incidents WHERE id=$1`,
      [inc],
    );
    expect(st.status).toBe('COMPENSATED');
    expect(st.cs).toBe('RECORDED');
    expect(Number(st.u)).toBe(500_000); // phần thiếu thành nợ

    const [proof] = await ds.query(
      `SELECT incident_id FROM incident_evidences WHERE id=$1`,
      [proofId],
    );
    expect(proof.incident_id).toBe(inc); // proof đã gắn vào sự cố

    // manual không tự đảo được
    await expect(
      executor.reverse(admin2, inc, 'Thử đảo chi trả thủ công'),
    ).rejects.toThrow(/thủ công/);
  });

  it('8. P2 reconciliation: dữ liệu đã settle sạch → 0 chênh lệch; bơm lệch → CRITICAL', async () => {
    // Sau các test trên, mọi incident COMPENSATED phải đối soát sạch (digital + manual + reversed→re-settle).
    const clean = await reconciliation.reconcile();
    expect(clean.checkedCount).toBeGreaterThan(0);
    if (clean.discrepancyCount !== 0) {
      // In ra để debug nếu có hồi quy.
      // eslint-disable-next-line no-console
      console.error('DISCREPANCIES:', JSON.stringify(clean.discrepancies, null, 2));
    }
    expect(clean.discrepancyCount).toBe(0);

    // Bơm lệch allocation trên 1 incident đã settle → phải bắt được CRITICAL.
    const [row] = await ds.query(
      `SELECT id FROM incidents WHERE status='COMPENSATED' AND compensation_status='RECORDED' LIMIT 1`,
    );
    const before = (
      await ds.query(
        `SELECT platform_borne_amount p FROM incidents WHERE id=$1`,
        [row.id],
      )
    )[0].p;
    await ds.query(
      `UPDATE incidents SET platform_borne_amount = COALESCE(platform_borne_amount,0) + 123456 WHERE id=$1`,
      [row.id],
    );
    const dirty = await reconciliation.reconcile();
    const hit = dirty.discrepancies.find(
      (d) => d.incidentId === row.id && d.kind === 'ALLOCATION_MISMATCH',
    );
    expect(hit).toBeDefined();
    expect(hit?.severity).toBe('CRITICAL');

    // khôi phục
    await ds.query(
      `UPDATE incidents SET platform_borne_amount=$2 WHERE id=$1`,
      [row.id, before],
    );
  });

  it('9. APPROVE_NO_COMPENSATION: công nhận sự cố nhưng không bồi thường → CLOSED/NO_COMPENSATION, không tiền, không nợ', async () => {
    await clearDebts();
    await setTaskerWallet(500_000);
    await setCustomerWallet(0);
    const before = await balances();

    const inc = await mintIncident(800_000);
    await adminSvc.accept(admin1, inc, {});

    let view = await adminSvc.findOne(inc);
    view = await decision.saveDraft(admin1, inc, {
      expectedDecisionVersion: view.decision.version,
      decision: 'APPROVE_NO_COMPENSATION',
      internalDecisionNote: 'Lỗi thuộc về khách, ngoài phạm vi bồi thường',
      customerDecisionSummary:
        'CleanZ ghi nhận sự cố nhưng không phát sinh bồi thường theo chính sách.',
    } as never);
    // không cần Tasker phản hồi → finalize thẳng
    view = await decision.finalizeDecision(admin1, inc, {
      expectedDecisionVersion: view.decision.version,
    } as never);

    const [st] = await ds.query(
      `SELECT status, compensation_status cs, closure_reason cr, decision_outcome outcome,
              approved_compensation_amount approved FROM incidents WHERE id=$1`,
      [inc],
    );
    expect(st.status).toBe('CLOSED');
    expect(st.cs).toBe('NONE');
    expect(st.cr).toBe('NO_COMPENSATION');
    expect(st.outcome).toBe('APPROVE_NO_COMPENSATION');
    expect(Number(st.approved)).toBe(0);

    // không chuyển tiền + không phát sinh bút toán settlement
    const after = await balances();
    expect(after.customer).toBe(before.customer);
    expect(after.system).toBe(before.system);
    const txs = await ds.query(
      `SELECT count(*)::int n FROM wallet_transactions
        WHERE reference_id=$1 AND reference_type LIKE 'INCIDENT_COMPENSATION%'`,
      [inc],
    );
    expect(txs[0].n).toBe(0);

    // không strike gian lận khách (khác REJECT)
    const strikes = await ds.query(
      `SELECT count(*)::int n FROM incidents WHERE id=$1 AND closure_reason='REJECTED'`,
      [inc],
    );
    expect(strikes[0].n).toBe(0);

    // reconciliation không tính sự cố CLOSED (chỉ COMPENSATED/RECORDED) → không cờ.
    const recon = await reconciliation.reconcile();
    expect(recon.discrepancies.find((d) => d.incidentId === inc)).toBeUndefined();
  });

  it('10. BR29: Customer tự rút ở REPORTED; chặn sau khi quyết định đã submit', async () => {
    // Rút được ở REPORTED → CLOSED/WITHDRAWN.
    const inc = await mintIncident(500_000);
    await incidentSvc.withdraw(customerUserId, inc, { reason: 'Đổi ý' } as never);
    const [st] = await ds.query(
      `SELECT status, closure_reason cr FROM incidents WHERE id=$1`,
      [inc],
    );
    expect(st.status).toBe('CLOSED');
    expect(st.cr).toBe('WITHDRAWN');

    // Sau khi submit quyết định cho Tasker → decisionStatus rời NONE/DRAFT → chặn.
    const inc2 = await mintIncident(500_000);
    await adminSvc.accept(admin1, inc2, {});
    let view = await adminSvc.findOne(inc2);
    const itemId = view.damageItems[0].id;
    view = await adminSvc.verifyItems(inc2, {
      items: [{ itemId, verifiedAmount: 500_000 }],
    } as never);
    view = await decision.saveDraft(admin1, inc2, {
      expectedDecisionVersion: view.decision.version,
      decision: 'APPROVE',
      items: [{ damageItemId: itemId, approvedAmount: 500_000 }],
      responsibilityParty: 'TASKER',
      responsibilityReason: 'Tasker gây thiệt hại (BR29 test)',
      taskerBorneAmount: 500_000,
      platformBorneAmount: 0,
      taskerDecisionReason: 'Trừ theo quy định',
      customerDecisionSummary: 'CleanZ duyệt bồi thường theo thẩm định.',
    } as never);
    await decision.submitDraftForTaskerResponse(admin1, inc2, {
      expectedDecisionVersion: view.decision.version,
    } as never);
    await expect(
      incidentSvc.withdraw(customerUserId, inc2, {} as never),
    ).rejects.toThrow(/submit/);
  });

  it('11. Rounding: số dư ví lẻ xu → phần trừ & snapshot nguyên VND, bảo toàn tổng', async () => {
    await clearDebts();
    await setCustomerWallet(0);
    await setSystemWallet(5_000_000);
    await ds.query(`UPDATE taskers SET current_deposit_balance=0 WHERE id=$1`, [
      taskerId,
    ]);

    const inc = await mintIncident(1_000_000);
    await adminSvc.accept(admin1, inc, {}); // ví 0 → hold 0
    await driveAdverseToFinal(inc, 1_000_000); // taskerBorne 1tr

    // Bơm số dư ví lẻ xu SAU accept (tránh ảnh hưởng hold).
    await ds.transaction(async (m) => {
      const w = await wallet.getOrCreateTaskerWallet(m, { id: taskerId } as never);
      await m.query(`UPDATE wallets SET balance=500000.50 WHERE id=$1`, [w.id]);
    });

    await executor.execute(admin1, inc);

    const [row] = await ds.query(
      `SELECT recoverable_from_deposit_amount r, uncovered_liability_amount u,
              deposit_balance_snapshot snap FROM incidents WHERE id=$1`,
      [inc],
    );
    // available floor(500000.50)=500000 → recoverable 500000, uncovered 500000 (nguyên).
    expect(Number(row.r)).toBe(500_000);
    expect(Number(row.u)).toBe(500_000);
    expect(Number(row.snap)).toBe(500_000);
    expect(Number.isInteger(Number(row.r))).toBe(true);

    const b = await balances();
    expect(b.customer).toBe(1_000_000); // hoàn đủ (nguyên)
    // ví trừ 500000 (floor) → còn 0.50 xu lẻ; bút toán trừ là số nguyên.
    expect(b.tasker).toBeCloseTo(0.5, 2);
    const [tx] = await ds.query(
      `SELECT balance_before - balance_after AS delta FROM wallet_transactions
        WHERE reference_id=$1 AND type='DEPOSIT_DEDUCT'`,
      [inc],
    );
    expect(Number(tx.delta)).toBe(500_000);
  });
});
