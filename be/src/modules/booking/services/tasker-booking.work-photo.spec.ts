import { BadRequestException } from '@nestjs/common';
import { BookingStatus } from 'src/common/enums/booking-status.enum';
import { PaymentMethod } from 'src/common/enums/payment-method.enum';
import { PaymentStatus } from 'src/common/enums/payment-status.enum';
import { BookingSurchargeStatus } from 'src/common/enums/booking-surcharge-status.enum';
import { BookingWorkPhotoPhase } from 'src/common/enums/booking-work-photo-phase.enum';
import { BookingEntity } from '../entity/booking.entity';
import { TaskerBookingService } from './tasker-booking.service';

/**
 * Gắn dependency theo TÊN thay vì theo vị trí constructor — cùng lý do đã ghi trong
 * `tasker-booking.service.spec.ts`: thêm dependency mới không được làm gãy test.
 */
function instantiate(deps: Record<string, unknown>): TaskerBookingService {
  const service = Object.create(
    TaskerBookingService.prototype,
  ) as TaskerBookingService;
  Object.assign(service, deps);
  return service;
}

const bookingInProgress = {
  id: 'booking-1',
  bookingCode: 'CZ-0001',
  status: BookingStatus.IN_PROGRESS,
  surchargeStatus: BookingSurchargeStatus.NONE,
  paymentMethod: PaymentMethod.CASH,
  paymentStatus: PaymentStatus.PENDING,
  checkedInAt: new Date('2026-08-15T01:00:00.000Z'),
  durationHours: 2,
  basePrice: 300_000,
  approvedOvertimeMinutes: 0,
  tasker: { id: 'tasker-1', user: { id: 'user-1' } },
} as unknown as BookingEntity;

function buildService(savedAfterCount: number) {
  const settleCompletedBooking = jest.fn();
  const saveWorkPhotos = jest.fn().mockResolvedValue(savedAfterCount);

  const queryBuilder = {
    leftJoinAndSelect: () => queryBuilder,
    setLock: () => queryBuilder,
    where: () => queryBuilder,
    andWhere: () => queryBuilder,
    getOne: () => Promise.resolve(bookingInProgress),
  };
  const manager = {
    getRepository: () => ({
      createQueryBuilder: () => queryBuilder,
      save: (entity: unknown) => Promise.resolve(entity),
      create: (entity: unknown) => entity,
    }),
  };

  const service = instantiate({
    dataSource: {
      transaction: (cb: (m: unknown) => Promise<unknown>) => cb(manager),
    },
    bookingWorkPhotoService: { saveWorkPhotos },
    bookingSettlementService: { settleCompletedBooking },
  });

  // Guard sở hữu booking không phải thứ test này soi.
  (
    service as unknown as { findTaskerProfile: () => Promise<unknown> }
  ).findTaskerProfile = () => Promise.resolve({ id: 'tasker-1' });

  return { service, saveWorkPhotos, settleCompletedBooking };
}

describe('TaskerBookingService.markCompleted — ràng buộc ảnh cuối ca', () => {
  it('không có ảnh cuối ca → BadRequest và KHÔNG quyết toán', async () => {
    const { service, saveWorkPhotos, settleCompletedBooking } = buildService(0);

    await expect(
      service.markCompleted('user-1', 'booking-1', { afterPhotos: [] }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(settleCompletedBooking).not.toHaveBeenCalled();
    expect(saveWorkPhotos).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ phase: BookingWorkPhotoPhase.AFTER }),
    );
  });

  it('ảnh cuối ca đi qua đúng phase AFTER và đúng người nộp', async () => {
    const { service, saveWorkPhotos } = buildService(1);

    // Không quan tâm phần quyết toán chạy tới đâu — chỉ soi payload ảnh.
    await service
      .markCompleted('user-1', 'booking-1', {
        afterPhotos: [{ url: 'https://cdn.test/after.jpg' }],
      })
      .catch(() => undefined);

    expect(saveWorkPhotos).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        phase: BookingWorkPhotoPhase.AFTER,
        userId: 'user-1',
        photos: [{ url: 'https://cdn.test/after.jpg' }],
      }),
    );
  });
});
