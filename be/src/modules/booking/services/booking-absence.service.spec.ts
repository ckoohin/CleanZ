import { BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { BookingAbsenceReportStatus } from 'src/common/enums/booking-absence-report-status.enum';
import { BookingStatus } from 'src/common/enums/booking-status.enum';
import { PaymentMethod } from 'src/common/enums/payment-method.enum';
import { PaymentStatus } from 'src/common/enums/payment-status.enum';
import { DEFAULT_CUSTOMER_ABSENCE_POLICY } from 'src/modules/system-config/operational-policy';
import {
  getTrustedAbsenceProofAssetKey,
  isTrustedAbsenceProofPhotoUrl,
  ReportBookingAbsenceDto,
} from '../dto/report-booking-absence.dto';
import { BookingAbsenceReportEntity } from '../entity/booking-absence-report.entity';
import { BookingEntity } from '../entity/booking.entity';
import {
  BookingAbsenceEligibility,
  BookingAbsenceService,
} from './booking-absence.service';

const NOW = new Date('2026-08-09T03:00:00.000Z');

const makeBooking = (over: Partial<BookingEntity> = {}): BookingEntity =>
  ({
    id: 'booking-1',
    bookingCode: 'BK-ABS-1',
    status: BookingStatus.CHECKED_IN,
    checkedInAt: new Date(NOW.getTime() - 20 * 60_000),
    paymentMethod: PaymentMethod.CASH,
    paymentStatus: PaymentStatus.PENDING,
    totalPrice: 200_000,
    discountAmount: 0,
    customer: { id: 'customer-1' },
    tasker: { id: 'tasker-1' },
    ...over,
  }) as BookingEntity;

function makeService(): BookingAbsenceService {
  const blank = {} as never;
  return new BookingAbsenceService(
    blank,
    blank,
    {
      getEscrowAvailable: (booking: BookingEntity) =>
        booking.paymentMethod !== PaymentMethod.CASH &&
        booking.paymentStatus === PaymentStatus.PAID
          ? Number(booking.totalPrice)
          : 0,
    } as never,
    blank,
    blank,
    blank,
    blank,
    blank,
    blank,
  );
}

const eligibility = (
  service: BookingAbsenceService,
  booking: BookingEntity,
  existing: BookingAbsenceReportEntity | null = null,
): BookingAbsenceEligibility =>
  (
    service as unknown as {
      buildEligibility: (
        booking: BookingEntity,
        policy: typeof DEFAULT_CUSTOMER_ABSENCE_POLICY,
        now: Date,
        existing: BookingAbsenceReportEntity | null,
      ) => BookingAbsenceEligibility;
    }
  ).buildEligibility(booking, DEFAULT_CUSTOMER_ABSENCE_POLICY, NOW, existing);

describe('BookingAbsenceService eligibility guards', () => {
  const service = makeService();

  it('chưa đủ thời gian chờ thì chặn và trả đúng thời điểm mở', () => {
    const booking = makeBooking({
      checkedInAt: new Date(NOW.getTime() - 10 * 60_000),
    });
    const result = eligibility(service, booking);
    expect(result).toMatchObject({
      canReport: false,
      reasonCode: 'ABSENCE_REPORT_WAIT_REQUIRED',
      waitedMinutes: 10,
      minWaitMinutes: 15,
    });
    expect(result.availableAt).toBe(
      new Date(NOW.getTime() + 5 * 60_000).toISOString(),
    );
  });

  it('quá reportWindowMinutes thì chặn', () => {
    const result = eligibility(
      service,
      makeBooking({
        checkedInAt: new Date(NOW.getTime() - 61 * 60_000),
      }),
    );
    expect(result).toMatchObject({
      canReport: false,
      reasonCode: 'ABSENCE_REPORT_WINDOW_EXPIRED',
    });
  });

  it('chưa CHECKED_IN thì chặn', () => {
    const result = eligibility(
      service,
      makeBooking({ status: BookingStatus.CONFIRMED, checkedInAt: null }),
    );
    expect(result.reasonCode).toBe('ABSENCE_REPORT_REQUIRES_CHECKIN');
  });

  it('báo cáo trùng thì chặn trước các guard khác', () => {
    const result = eligibility(service, makeBooking(), {
      id: 'report-existing',
      status: BookingAbsenceReportStatus.PENDING_REVIEW,
      booking: makeBooking(),
    } as BookingAbsenceReportEntity);
    expect(result.reasonCode).toBe('ABSENCE_REPORT_ALREADY_EXISTS');
    expect(result.existingReport).toBeDefined();
  });

  it('guest trả trước bị chặn; guest CASH đủ thời gian được báo', () => {
    const prepaid = eligibility(
      service,
      makeBooking({
        customer: null,
        paymentMethod: PaymentMethod.ONLINE,
        paymentStatus: PaymentStatus.PAID,
      }),
    );
    expect(prepaid.reasonCode).toBe('GUEST_PREPAID_ABSENCE_UNSUPPORTED');

    const cash = eligibility(service, makeBooking({ customer: null }));
    expect(cash.canReport).toBe(true);
    expect(cash.estimatedCompensation).toBe(
      DEFAULT_CUSTOMER_ABSENCE_POLICY.guestCompensation,
    );
  });

  it('DTO bắt buộc ảnh HTTPS và giới hạn ghi chú', async () => {
    const missing = new ReportBookingAbsenceDto();
    expect(await validate(missing)).not.toHaveLength(0);

    const insecure = new ReportBookingAbsenceDto();
    insecure.proofPhotoUrl = 'http://cdn.local/proof.jpg';
    insecure.callHistoryPhotoUrl = 'https://cdn.local/call-history.jpg';
    expect(await validate(insecure)).not.toHaveLength(0);

    const valid = new ReportBookingAbsenceDto();
    valid.proofPhotoUrl = 'https://cdn.local/proof.jpg';
    valid.callHistoryPhotoUrl = 'https://cdn.local/call-history.jpg';
    valid.note = 'Khách không phản hồi sau nhiều lần gọi cửa.';
    expect(await validate(valid)).toHaveLength(0);
  });

  it('chỉ tin URL từ đúng Cloudinary account và thư mục upload CleanZ', () => {
    const trusted =
      'https://res.cloudinary.com/cleanz-test/image/upload/v1788000000/CleanZ/uploads/proof.jpg';
    expect(isTrustedAbsenceProofPhotoUrl(trusted, 'cleanz-test')).toBe(true);
    expect(
      isTrustedAbsenceProofPhotoUrl(
        'https://res.cloudinary.com/other/image/upload/v1/CleanZ/uploads/proof.jpg',
        'cleanz-test',
      ),
    ).toBe(false);
    expect(
      isTrustedAbsenceProofPhotoUrl(
        'https://internal.example/proof.jpg',
        'cleanz-test',
      ),
    ).toBe(false);
  });

  it('nhận diện cùng một Cloudinary asset dù URL khác version', () => {
    const first =
      'https://res.cloudinary.com/cleanz-test/image/upload/v1/CleanZ/uploads/same-proof.jpg';
    const second =
      'https://res.cloudinary.com/cleanz-test/image/upload/v2/CleanZ/uploads/same-proof.png';
    expect(getTrustedAbsenceProofAssetKey(first, 'cleanz-test')).toBe(
      getTrustedAbsenceProofAssetKey(second, 'cleanz-test'),
    );
  });

  it('từ chối khi hai bằng chứng trỏ cùng một Cloudinary asset', async () => {
    const previousCloudName = process.env.CLOUDINARY_CLOUD_NAME;
    process.env.CLOUDINARY_CLOUD_NAME = 'cleanz-test';
    const dto = new ReportBookingAbsenceDto();
    dto.proofPhotoUrl =
      'https://res.cloudinary.com/cleanz-test/image/upload/v1/CleanZ/uploads/same-proof.jpg';
    dto.callHistoryPhotoUrl =
      'https://res.cloudinary.com/cleanz-test/image/upload/v2/CleanZ/uploads/same-proof.png';

    try {
      let caught: unknown;
      try {
        await makeService().report('tasker-1', 'booking-1', dto);
      } catch (error: unknown) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(BadRequestException);
      if (!(caught instanceof BadRequestException)) {
        throw new Error('Expected BadRequestException');
      }
      expect(caught.getResponse()).toMatchObject({
        code: 'ABSENCE_EVIDENCE_PHOTOS_MUST_DIFFER',
      });
    } finally {
      if (previousCloudName === undefined) {
        delete process.env.CLOUDINARY_CLOUD_NAME;
      } else {
        process.env.CLOUDINARY_CLOUD_NAME = previousCloudName;
      }
    }
  });
});

describe('BookingAbsenceService expire idempotency', () => {
  it('sweep gọi lại không chốt/chi trả lần hai', async () => {
    const report = {
      id: 'report-expired',
      status: BookingAbsenceReportStatus.PENDING_REVIEW,
      booking: makeBooking({
        tasker: { id: 'tasker-1' } as never,
        customer: { id: 'customer-1' } as never,
      }),
    } as BookingAbsenceReportEntity;
    const reportRepo = {
      createQueryBuilder: () => {
        const qb: Record<string, unknown> = {};
        for (const method of ['leftJoinAndSelect', 'setLock', 'where']) {
          qb[method] = () => qb;
        }
        qb.getOne = () => Promise.resolve(report);
        return qb;
      },
      save: (value: BookingAbsenceReportEntity) => Promise.resolve(value),
    };
    const manager = { getRepository: () => reportRepo };
    const dataSource = {
      transaction: <T>(run: (value: typeof manager) => Promise<T>) =>
        run(manager),
      getRepository: () => ({ find: () => Promise.resolve([]) }),
    };
    const settlement = { expire: jest.fn().mockResolvedValue(0) };
    const service = new BookingAbsenceService(
      dataSource as never,
      {} as never,
      settlement as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { notify: jest.fn() } as never,
      {} as never,
    );

    await expect(service.expire(report.id)).resolves.toBe(true);
    await expect(service.expire(report.id)).resolves.toBe(false);
    expect(settlement.expire).toHaveBeenCalledTimes(1);
    expect(report.status).toBe(BookingAbsenceReportStatus.EXPIRED);
  });
});
