/**
 * Integration test ĐƯỜNG TIỀN hoa hồng đơn TIỀN MẶT (chạy trong CI).
 *
 * Khoá hồi quy cho lỗi: trước đây nhận đơn chỉ KIỂM số dư, tới lúc quyết toán mới TRỪ —
 * số dư tụt ở giữa (rút tiền / thu hồi nợ bồi thường / nhận thêm đơn tiền mặt khác) làm
 * `deductCashCommission` ném lỗi và **rollback cả việc hoàn tất booking**, đúng lúc việc
 * đã làm xong và khách đã trả tiền.
 *
 * Nay phí được GIỮ ngay khi nhận đơn nên quyết toán không thể thiếu tiền.
 */
import { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { AppModule } from '../../app.module';
import { BookingStatus } from 'src/common/enums/booking-status.enum';
import { BookingEntity } from './entity/booking.entity';
import { TaskerEntity } from '../tasker/entity/tasker.entity';
import { BookingSettlementService } from './services/booking-settlement.service';
import { BookingLifecycleSchedulerService } from './services/booking-lifecycle-scheduler.service';
import { TaskerBalanceService } from '../wallet/tasker-balance.service';
import { WalletService } from '../wallet/wallet.service';
import { expectMoneyConserved } from 'src/common/testing/money-conservation';
import {
  purgeQueuePrefix,
  useIsolatedQueuePrefix,
} from 'src/common/testing/queue-isolation';

jest.setTimeout(300_000);

const TESTDB = 'cleanz_cash_commission_test';
let queuePrefix = '';

function loadEnv(): void {
  const p = resolve(process.cwd(), '.env');
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    process.env[t.slice(0, i).trim()] ??= t
      .slice(i + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '');
  }
}

describe('Cash commission hold → capture (integration)', () => {
  let app: INestApplicationContext;
  let ds: DataSource;
  let settlement: BookingSettlementService;
  let taskerBalance: TaskerBalanceService;
  let scheduler: BookingLifecycleSchedulerService;
  let wallet: WalletService;

  let customerId: string;
  let taskerId: string;
  let packageId: string;
  let adminId: string;
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
    process.env.BOOKING_LIFECYCLE_RECONCILIATION_INTERVAL_MS = '0';
    process.env.INCIDENT_HOUSEKEEPING_INTERVAL_MS = '0';
    process.env.INCIDENT_NOTIFICATION_OUTBOX_INTERVAL_MS = '0';
    app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error'],
    });
    ds = app.get(DataSource);
    settlement = app.get(BookingSettlementService);
    taskerBalance = app.get(TaskerBalanceService);
    scheduler = app.get(BookingLifecycleSchedulerService);
    wallet = app.get(WalletService);

    const u = async (email: string, role: string): Promise<string> =>
      (
        await ds.query(
          `INSERT INTO users (email, full_name, role, is_active, is_verified, provider)
           VALUES ($1,$2,$3,true,true,'LOCAL') RETURNING id`,
          [email, `Test ${role}`, role],
        )
      )[0].id as string;

    adminId = await u('admin@cash.local', 'ADMIN');
    const customerUserId = await u('cus@cash.local', 'CUSTOMER');
    const taskerUserId = await u('tk@cash.local', 'TASKER');
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
    packageId = (
      await ds.query(
        `INSERT INTO service_packages (name, package_code)
         VALUES ('PKG Cash','PKG-CASH') RETURNING id`,
      )
    )[0].id as string;
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

  async function setTaskerWallet(balance: number, hold = 0): Promise<void> {
    const tasker = await ds
      .getRepository(TaskerEntity)
      .findOneOrFail({ where: { id: taskerId } });
    const w = await wallet.getOrCreateTaskerWallet(ds.manager, tasker);
    await ds.query(
      `UPDATE wallets SET balance=$2, hold_balance=$3 WHERE id=$1`,
      [w.id, balance, hold],
    );
  }

  async function walletState(): Promise<{ balance: number; hold: number }> {
    const [w] = await ds.query(
      `SELECT balance, hold_balance FROM wallets
        WHERE tasker_id=$1 AND owner_type='TASKER'`,
      [taskerId],
    );
    return { balance: Number(w.balance), hold: Number(w.hold_balance) };
  }

  /** Đơn TIỀN MẶT đã CONFIRMED, giá 1.000.000đ. */
  async function mintCashBooking(
    totalPrice = 1_000_000,
  ): Promise<BookingEntity> {
    seq += 1;
    const id = (
      await ds.query(
        `INSERT INTO bookings (booking_code, customer_id, tasker_id, package_id, address,
           duration_hours, base_price, total_price, discount_amount, status,
           payment_method, payment_status)
         VALUES ($1,$2,$3,$4,'Addr',2,$5,$5,0,'CONFIRMED','CASH','PENDING') RETURNING id`,
        [`BKG-CASH-${seq}`, customerId, taskerId, packageId, totalPrice],
      )
    )[0].id as string;
    return ds.getRepository(BookingEntity).findOneOrFail({
      where: { id },
      relations: ['tasker', 'customer'],
    });
  }

  async function commissionOf(booking: BookingEntity): Promise<number> {
    const [row] = await ds.query(
      `SELECT config_value v FROM system_configs WHERE config_key='PLATFORM_COMMISSION_RATE'`,
    );
    const rate = Number(row?.v ?? 20);
    return Math.round((Number(booking.totalPrice) * rate) / 100);
  }

  /**
   * Một assertion không bao giờ đỏ được thì vô dụng. Ba test này cố tình vi phạm từng
   * bất biến để chứng minh helper thật sự bắt lỗi, trước khi tin vào các test dùng nó.
   */
  describe('0. expectMoneyConserved tự kiểm — phải BẮT được vi phạm', () => {
    it('tiền bốc hơi khỏi hệ thống → báo lỗi', async () => {
      await setTaskerWallet(500_000);
      const walletId = (
        await ds.query(
          `SELECT id FROM wallets WHERE tasker_id=$1 AND owner_type='TASKER'`,
          [taskerId],
        )
      )[0].id as string;

      await expect(
        expectMoneyConserved(ds, async () => {
          await ds.query(
            `UPDATE wallets SET balance = balance - 100000 WHERE id=$1`,
            [walletId],
          );
        }),
      ).rejects.toThrow(/Vi phạm bảo toàn tiền/);
      await setTaskerWallet(500_000);
    });

    it('ví bị âm → báo lỗi', async () => {
      await setTaskerWallet(0);
      const walletId = (
        await ds.query(
          `SELECT id FROM wallets WHERE tasker_id=$1 AND owner_type='TASKER'`,
          [taskerId],
        )
      )[0].id as string;

      await expect(
        expectMoneyConserved(
          ds,
          async () => {
            await ds.query(`UPDATE wallets SET balance = -50000 WHERE id=$1`, [
              walletId,
            ]);
          },
          { externalOut: 50_000 },
        ),
      ).rejects.toThrow(/bị âm/);
      await setTaskerWallet(0);
    });

    it('đổi số dư mà không ghi bút toán → báo lỗi (mất dấu lịch sử)', async () => {
      await setTaskerWallet(500_000);
      const walletId = (
        await ds.query(
          `SELECT id FROM wallets WHERE tasker_id=$1 AND owner_type='TASKER'`,
          [taskerId],
        )
      )[0].id as string;

      await expect(
        expectMoneyConserved(
          ds,
          async () => {
            await ds.query(
              `UPDATE wallets SET balance = balance - 70000 WHERE id=$1`,
              [walletId],
            );
          },
          { externalOut: 70_000 },
        ),
      ).rejects.toThrow(/không được ghi sổ/);
      await setTaskerWallet(500_000);
    });
  });

  it('1. Nhận đơn: phí chuyển từ số dư sang HOLD, không mất tiền', async () => {
    await setTaskerWallet(500_000);
    const booking = await mintCashBooking();
    const fee = await commissionOf(booking);

    await ds.transaction((m) =>
      taskerBalance.holdCashCommission(m, taskerId, booking, fee),
    );
    await ds
      .getRepository(BookingEntity)
      .update(
        { id: booking.id },
        { taskerCommissionHoldAmount: booking.taskerCommissionHoldAmount },
      );

    const w = await walletState();
    expect(w.hold).toBe(fee);
    expect(w.balance).toBe(500_000 - fee);
    // Tổng tài sản không đổi — chỉ chuyển giữa hai ngăn.
    expect(w.balance + w.hold).toBe(500_000);
  });

  it('2. Ví bị vét sạch sau khi nhận đơn → quyết toán VẪN thành công (lỗi cũ)', async () => {
    await setTaskerWallet(500_000);
    const booking = await mintCashBooking();
    const fee = await commissionOf(booking);

    await ds.transaction((m) =>
      taskerBalance.holdCashCommission(m, taskerId, booking, fee),
    );
    await ds
      .getRepository(BookingEntity)
      .update({ id: booking.id }, { taskerCommissionHoldAmount: fee });

    // Mô phỏng: Tasker rút hết phần khả dụng / bị thu hồi nợ sau khi đã nhận đơn.
    const afterHold = await walletState();
    await setTaskerWallet(0, afterHold.hold);

    const fresh = await ds.getRepository(BookingEntity).findOneOrFail({
      where: { id: booking.id },
      relations: ['tasker', 'customer'],
    });
    const tasker = await ds
      .getRepository(TaskerEntity)
      .findOneOrFail({ where: { id: taskerId } });

    // Quyết toán tiền mặt: thu phí từ hold của Tasker rồi ghi thu nhập cho quỹ SYSTEM —
    // hai vế triệt tiêu nhau nên tổng hệ thống không đổi. (Tiền công khách trả tay cho
    // Tasker vốn không bao giờ đi vào ví nên không xuất hiện ở đây.)
    await expect(
      expectMoneyConserved(ds, () =>
        ds.transaction((m) =>
          settlement.settleCompletedBooking(m, {
            booking: fresh,
            tasker,
            actorUserId: adminId,
            writeStatusLog: false,
          } as never),
        ),
      ),
    ).resolves.toBeDefined();

    const [done] = await ds.query(
      `SELECT status, payment_status ps, tasker_commission_hold_amount hold
         FROM bookings WHERE id=$1`,
      [booking.id],
    );
    expect(done.status).toBe(BookingStatus.COMPLETED);
    expect(done.ps).toBe('PAID');
    expect(Number(done.hold ?? 0)).toBe(0);

    // Hold đã được thu, số dư khả dụng vẫn 0 — không bị trừ âm.
    const w = await walletState();
    expect(w.hold).toBe(0);
    expect(w.balance).toBe(0);
  });

  it('3. Huỷ đơn: sweep trả lại khoản đã giữ, không để tiền treo', async () => {
    await setTaskerWallet(500_000);
    const booking = await mintCashBooking();
    const fee = await commissionOf(booking);

    await ds.transaction((m) =>
      taskerBalance.holdCashCommission(m, taskerId, booking, fee),
    );
    await ds
      .getRepository(BookingEntity)
      .update({ id: booking.id }, { taskerCommissionHoldAmount: fee });
    expect((await walletState()).hold).toBe(fee);

    // Huỷ bằng SQL trực tiếp — mô phỏng MỘT nhánh huỷ bất kỳ không gọi release.
    await ds.query(`UPDATE bookings SET status='CANCELLED' WHERE id=$1`, [
      booking.id,
    ]);

    // Giải phóng hold chỉ chuyển tiền từ ngăn hold về ngăn khả dụng của CÙNG ví.
    const released = await expectMoneyConserved(ds, () =>
      scheduler.releaseOrphanCommissionHolds(),
    );

    expect(released).toBeGreaterThanOrEqual(1);
    const w = await walletState();
    expect(w.hold).toBe(0);
    expect(w.balance).toBe(500_000); // hoàn nguyên, không mất đồng nào
  });
});
