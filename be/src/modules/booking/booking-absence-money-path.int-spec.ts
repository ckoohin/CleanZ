/**
 * Integration test đường tiền báo khách vắng.
 *
 * Chạy trên PostgreSQL thật và đi qua transaction/service thật cho WALLET, ONLINE,
 * CASH, guest và EXPIRED. Mọi ca đều khoá bất biến tổng ví + sổ giao dịch.
 */
import { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app.module';
import { BookingAbsenceReportStatus } from 'src/common/enums/booking-absence-report-status.enum';
import { PaymentMethod } from 'src/common/enums/payment-method.enum';
import { PaymentStatus } from 'src/common/enums/payment-status.enum';
import { expectMoneyConserved } from 'src/common/testing/money-conservation';
import {
  purgeQueuePrefix,
  useIsolatedQueuePrefix,
} from 'src/common/testing/queue-isolation';
import { CustomerEntity } from '../customer/entity/customer.entity';
import { TaskerEntity } from '../tasker/entity/tasker.entity';
import { CustomerDebtEntity } from '../wallet/entity/customer-debt.entity';
import { WalletService } from '../wallet/wallet.service';
import { BookingAbsenceReportEntity } from './entity/booking-absence-report.entity';
import { BookingEntity } from './entity/booking.entity';
import { BookingAbsenceService } from './services/booking-absence.service';
import { BookingWalletPaymentService } from './services/booking-wallet-payment.service';

jest.setTimeout(300_000);

const TEST_DB = 'cleanz_booking_absence_test';
let queuePrefix = '';

function loadEnv(): void {
  const path = resolve(process.cwd(), '.env');
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;
    process.env[trimmed.slice(0, separator).trim()] ??= trimmed
      .slice(separator + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '');
  }
}

describe('Booking customer absence money path (integration)', () => {
  let app: INestApplicationContext;
  let ds: DataSource;
  let absence: BookingAbsenceService;
  let walletService: WalletService;
  let bookingWalletPayment: BookingWalletPaymentService;
  let taskerId: string;
  let taskerUserId: string;
  let adminUserId: string;
  let packageId: string;
  let sequence = 0;

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
      .query(`DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE)`)
      .catch(() => undefined);
    await admin.query(`CREATE DATABASE ${TEST_DB}`);
    await admin.destroy();

    const migrations = new DataSource({
      ...base,
      database: TEST_DB,
      migrations: ['src/database/migrations/*.ts'],
      migrationsTableName: 'migrations',
      synchronize: false,
    });
    await migrations.initialize();
    await migrations.runMigrations({ transaction: 'each' });
    await migrations.destroy();

    queuePrefix = useIsolatedQueuePrefix(TEST_DB);
    await purgeQueuePrefix(queuePrefix);
    process.env.DB_DATABASE = TEST_DB;
    process.env.BOOKING_ABSENCE_AUTOMATION_INTERVAL_MS = '0';
    process.env.CLOUDINARY_CLOUD_NAME = 'absence-test';
    process.env.BOOKING_LIFECYCLE_RECONCILIATION_INTERVAL_MS = '0';
    process.env.BOOKING_EXPIRATION_INTERVAL_MS = '0';
    process.env.INCIDENT_HOUSEKEEPING_INTERVAL_MS = '0';
    process.env.INCIDENT_NOTIFICATION_OUTBOX_INTERVAL_MS = '0';
    process.env.PAYOUT_RECONCILIATION_INTERVAL_MS = '0';

    app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error'],
    });
    ds = app.get(DataSource);
    absence = app.get(BookingAbsenceService);
    walletService = app.get(WalletService);
    bookingWalletPayment = app.get(BookingWalletPaymentService);

    const insertUser = async (email: string, role: string): Promise<string> =>
      (
        await ds.query(
          `INSERT INTO users (email, full_name, role, is_active, is_verified, provider)
           VALUES ($1,$2,$3,true,true,'LOCAL') RETURNING id`,
          [email, `Absence ${role}`, role],
        )
      )[0].id as string;

    adminUserId = await insertUser('admin@absence.local', 'ADMIN');
    taskerUserId = await insertUser('tasker@absence.local', 'TASKER');
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
         VALUES ('Gói test khách vắng','PKG-ABSENCE') RETURNING id`,
      )
    )[0].id as string;

    const systemWallet = await walletService.getOrCreateSystemWallet(
      ds.manager,
    );
    await ds.query(`UPDATE wallets SET balance=5000000 WHERE id=$1`, [
      systemWallet.id,
    ]);
    const tasker = await ds
      .getRepository(TaskerEntity)
      .findOneOrFail({ where: { id: taskerId } });
    const taskerWallet = await walletService.getOrCreateTaskerWallet(
      ds.manager,
      tasker,
    );
    await ds.query(
      `UPDATE wallets SET balance=1000000, hold_balance=0 WHERE id=$1`,
      [taskerWallet.id],
    );
  });

  afterAll(async () => {
    await app?.close();
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
      .query(`DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE)`)
      .catch(() => undefined);
    await admin.destroy();
  });

  async function makeCustomer(label: string): Promise<CustomerEntity> {
    const userId = (
      await ds.query(
        `INSERT INTO users (email, full_name, role, is_active, is_verified, provider)
         VALUES ($1,$2,'CUSTOMER',true,true,'LOCAL') RETURNING id`,
        [`customer-${label}@absence.local`, `Customer ${label}`],
      )
    )[0].id as string;
    const customerId = (
      await ds.query(
        `INSERT INTO customers (user_id) VALUES ($1) RETURNING id`,
        [userId],
      )
    )[0].id as string;
    return ds.getRepository(CustomerEntity).findOneOrFail({
      where: { id: customerId },
      relations: ['user'],
    });
  }

  async function setCustomerBalance(
    customer: CustomerEntity,
    balance: number,
  ): Promise<void> {
    const wallet = await walletService.getOrCreateCustomerWallet(
      ds.manager,
      customer,
    );
    await ds.query(
      `UPDATE wallets SET balance=$2, hold_balance=0 WHERE id=$1`,
      [wallet.id, balance],
    );
  }

  async function mintBooking(input: {
    paymentMethod: PaymentMethod;
    customer?: CustomerEntity | null;
    totalPrice?: number;
    commissionHold?: number;
  }): Promise<BookingEntity> {
    sequence += 1;
    const paymentStatus =
      input.paymentMethod === PaymentMethod.ONLINE
        ? PaymentStatus.PAID
        : PaymentStatus.PENDING;
    const id = (
      await ds.query(
        `INSERT INTO bookings (
           booking_code, customer_id, tasker_id, package_id, address,
           duration_hours, base_price, total_price, discount_amount, status,
           payment_method, payment_status, checked_in_at,
           tasker_commission_hold_amount
         ) VALUES (
           $1,$2,$3,$4,'Địa chỉ test khách vắng',2,$5,$5,0,'CHECKED_IN',
           $6,$7,$9,$8
         ) RETURNING id`,
        [
          `BKG-ABS-${sequence}`,
          input.customer?.id ?? null,
          taskerId,
          packageId,
          input.totalPrice ?? 100_000,
          input.paymentMethod,
          paymentStatus,
          input.commissionHold ?? 0,
          new Date(Date.now() - 20 * 60_000),
        ],
      )
    )[0].id as string;
    let booking = await ds.getRepository(BookingEntity).findOneOrFail({
      where: { id },
      relations: ['tasker', 'tasker.user', 'customer', 'customer.user'],
    });
    if (input.paymentMethod === PaymentMethod.WALLET && input.customer) {
      const customerWallet = await walletService.getOrCreateCustomerWallet(
        ds.manager,
        input.customer,
      );
      await ds.query(`UPDATE wallets SET balance=$2 WHERE id=$1`, [
        customerWallet.id,
        input.totalPrice ?? 100_000,
      ]);
      await ds.transaction((manager) =>
        bookingWalletPayment.chargeEscrow(
          manager,
          booking,
          input.customer ?? null,
        ),
      );
      booking = await ds.getRepository(BookingEntity).findOneOrFail({
        where: { id },
        relations: ['tasker', 'tasker.user', 'customer', 'customer.user'],
      });
    }
    if (input.paymentMethod === PaymentMethod.ONLINE) {
      await ds.query(
        `INSERT INTO payments (
           booking_id, customer_id, method, status, amount, transaction_code, paid_at
         ) VALUES ($1,$2,'ONLINE','PAID',$3,$4,NOW())`,
        [
          id,
          input.customer?.id ?? null,
          input.totalPrice ?? 100_000,
          `ABSENCE-ONLINE-${sequence}`,
        ],
      );
    }
    return booking;
  }

  async function reportAndReview(
    booking: BookingEntity,
    target: BookingAbsenceReportStatus.APPROVED,
  ): Promise<BookingAbsenceReportEntity> {
    const created = await absence.report(taskerUserId, booking.id, {
      proofPhotoUrl: `https://res.cloudinary.com/absence-test/image/upload/v1/CleanZ/uploads/${booking.bookingCode}.jpg`,
      callHistoryPhotoUrl: `https://res.cloudinary.com/absence-test/image/upload/v1/CleanZ/uploads/${booking.bookingCode}-calls.jpg`,
      note: 'Đã gọi cửa và gọi điện nhiều lần nhưng khách không phản hồi.',
    });
    await absence.review(
      String(created.id),
      adminUserId,
      target,
      'Ảnh và mốc check-in phù hợp, duyệt bồi hoàn cho Tasker.',
    );
    return ds.getRepository(BookingAbsenceReportEntity).findOneOrFail({
      where: { id: String(created.id) },
      relations: ['booking', 'customer', 'tasker'],
    });
  }

  it.each([PaymentMethod.WALLET, PaymentMethod.ONLINE])(
    '%s: hoàn phần không tranh chấp rồi trả C từ escrow',
    async (paymentMethod) => {
      const customer = await makeCustomer(paymentMethod.toLowerCase());
      await setCustomerBalance(customer, 0);
      const booking = await mintBooking({ paymentMethod, customer });

      const report = await expectMoneyConserved(ds, () =>
        reportAndReview(booking, BookingAbsenceReportStatus.APPROVED),
      );

      expect(Number(report.refundedUpfront)).toBe(50_000);
      expect(Number(report.heldForReview)).toBe(50_000);
      expect(Number(report.paidFromEscrow)).toBe(50_000);
      expect(Number(report.advancedByPlatform)).toBe(0);
      expect(
        await ds.getRepository(CustomerDebtEntity).count({
          where: { sourceRefId: report.id },
        }),
      ).toBe(0);
    },
  );

  it('CASH: giải phóng commission hold, dùng ví khách trước và mở đúng phần nợ', async () => {
    const customer = await makeCustomer('cash');
    await setCustomerBalance(customer, 20_000);
    const booking = await mintBooking({
      paymentMethod: PaymentMethod.CASH,
      customer,
      commissionHold: 20_000,
    });
    const tasker = await ds
      .getRepository(TaskerEntity)
      .findOneOrFail({ where: { id: taskerId } });
    const taskerWallet = await walletService.getOrCreateTaskerWallet(
      ds.manager,
      tasker,
    );
    await ds.query(
      `UPDATE wallets SET balance=980000, hold_balance=20000 WHERE id=$1`,
      [taskerWallet.id],
    );

    const report = await expectMoneyConserved(ds, () =>
      reportAndReview(booking, BookingAbsenceReportStatus.APPROVED),
    );

    expect(Number(report.paidFromCustomerWallet)).toBe(20_000);
    expect(Number(report.advancedByPlatform)).toBe(30_000);
    const debt = await ds.getRepository(CustomerDebtEntity).findOneOrFail({
      where: { sourceRefId: report.id },
    });
    expect(Number(debt.originalAmount)).toBe(30_000);
    const [holdState] = await ds.query(
      `SELECT w.hold_balance, b.tasker_commission_hold_amount
         FROM wallets w CROSS JOIN bookings b
        WHERE w.id=$1 AND b.id=$2`,
      [taskerWallet.id, booking.id],
    );
    expect(Number(holdState.hold_balance)).toBe(0);
    expect(Number(holdState.tasker_commission_hold_amount)).toBe(0);
  });

  it('guest CASH: nền tảng chịu khoản cố định, không tạo nợ', async () => {
    const booking = await mintBooking({
      paymentMethod: PaymentMethod.CASH,
      customer: null,
    });

    const report = await expectMoneyConserved(ds, () =>
      reportAndReview(booking, BookingAbsenceReportStatus.APPROVED),
    );

    expect(report.isGuest).toBe(true);
    expect(Number(report.platformBorneAmount)).toBe(50_000);
    expect(
      await ds.getRepository(CustomerDebtEntity).count({
        where: { sourceRefId: report.id },
      }),
    ).toBe(0);
  });

  it('EXPIRED: hoàn đủ khách, Tasker vẫn nhận C và tuyệt đối không mở nợ', async () => {
    const customer = await makeCustomer('expired');
    await setCustomerBalance(customer, 0);
    const booking = await mintBooking({
      paymentMethod: PaymentMethod.ONLINE,
      customer,
    });

    const report = await expectMoneyConserved(ds, async () => {
      const created = await absence.report(taskerUserId, booking.id, {
        proofPhotoUrl:
          'https://res.cloudinary.com/absence-test/image/upload/v1/CleanZ/uploads/expired-proof.jpg',
        callHistoryPhotoUrl:
          'https://res.cloudinary.com/absence-test/image/upload/v1/CleanZ/uploads/expired-calls.jpg',
      });
      await expect(absence.expire(String(created.id))).resolves.toBe(true);
      await expect(absence.expire(String(created.id))).resolves.toBe(false);
      return ds.getRepository(BookingAbsenceReportEntity).findOneOrFail({
        where: { id: String(created.id) },
        relations: ['booking'],
      });
    });

    expect(report.status).toBe(BookingAbsenceReportStatus.EXPIRED);
    expect(Number(report.refundedUpfront)).toBe(50_000);
    expect(Number(report.refundedOnClose)).toBe(50_000);
    expect(Number(report.platformBorneAmount)).toBe(50_000);
    expect(report.booking.paymentStatus).toBe(PaymentStatus.REFUNDED);
    expect(
      await ds.getRepository(CustomerDebtEntity).count({
        where: { sourceRefId: report.id },
      }),
    ).toBe(0);
  });
});
