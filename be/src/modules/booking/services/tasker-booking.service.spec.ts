import { DataSource } from 'typeorm';
import { BookingServiceTier } from 'src/common/enums/booking-service-tier.enum';
import { NotificationRefType } from 'src/common/enums/notification-ref-type.enum';
import { NotificationType } from 'src/common/enums/notification-type.enum';
import { VN_NOW_SQL } from 'src/common/helpers/vietnam-time.helper';
import { BookingEntity } from '../entity/booking.entity';
import { POSTED_LIST_OPEN_TO_ALL_AFTER_MS } from './booking-dispatch.service';
import { TaskerBookingService } from './tasker-booking.service';

type BookingAccessReader = {
  resolveTaskerBookingInvitationAccess(
    userId: string,
    booking: Pick<BookingEntity, 'id' | 'serviceTier' | 'createdAt'>,
  ): Promise<{
    isInvited: boolean;
    isExclusive: boolean;
    isPublic: boolean;
    publicAt: Date | null;
  }>;
  assertTaskerHasActiveDispatchInvitation(
    userId: string,
    booking: BookingEntity,
  ): Promise<void>;
};

function buildService(
  query: jest.Mock,
  premiumWaitMs = 15 * 60 * 1000,
): BookingAccessReader {
  const dataSource = { query } as unknown as DataSource;
  const bookingDispatchService = {
    getPremiumDispatchConfig: jest
      .fn()
      .mockResolvedValue({ favoriteWaitMs: premiumWaitMs }),
  };

  return new TaskerBookingService(
    dataSource,
    undefined as never,
    undefined as never,
    undefined as never,
    undefined as never,
    undefined as never,
    undefined as never,
    undefined as never,
    undefined as never,
    undefined as never,
    undefined as never,
    bookingDispatchService as never,
    undefined as never,
    undefined as never,
  ) as unknown as BookingAccessReader;
}

const booking = {
  id: 'booking-id',
  serviceTier: BookingServiceTier.PREMIUM,
  createdAt: new Date('2026-07-24T08:00:00.000Z'),
} as BookingEntity;

describe('TaskerBookingService — quyền xem và nhận booking được mời', () => {
  it('giữ đơn Premium riêng 15 phút cho Tasker đã được mời', async () => {
    const query = jest
      .fn()
      .mockResolvedValue([{ is_public: false, is_invited: true }]);
    const service = buildService(query);

    await expect(
      service.resolveTaskerBookingInvitationAccess('user-id', booking),
    ).resolves.toEqual({
      isInvited: true,
      isExclusive: true,
      isPublic: false,
      publicAt: new Date('2026-07-24T08:15:00.000Z'),
    });
    expect(query).toHaveBeenCalledWith(expect.stringContaining(VN_NOW_SQL), [
      'booking-id',
      'user-id',
      NotificationRefType.BOOKING,
      POSTED_LIST_OPEN_TO_ALL_AFTER_MS / 1000,
      15 * 60,
      BookingServiceTier.PREMIUM,
      NotificationType.BOOKING_NEW_AVAILABLE,
    ]);
  });

  it('chặn Tasker chưa được mời trước khi hết 15 phút', async () => {
    const service = buildService(
      jest.fn().mockResolvedValue([{ is_public: false, is_invited: false }]),
    );

    await expect(
      service.assertTaskerHasActiveDispatchInvitation('other-user', booking),
    ).rejects.toThrow('Đơn này chưa được gửi cho bạn hoặc lượt nhận đã hết');
  });

  it('cho Tasker phù hợp nhận sau khi đơn đã mở công khai', async () => {
    const service = buildService(
      jest.fn().mockResolvedValue([{ is_public: true, is_invited: false }]),
    );

    await expect(
      service.assertTaskerHasActiveDispatchInvitation('other-user', booking),
    ).resolves.toBeUndefined();
  });

  it('không mở quyền khi booking không còn tồn tại', async () => {
    const service = buildService(jest.fn().mockResolvedValue([]));

    await expect(
      service.resolveTaskerBookingInvitationAccess('user-id', booking),
    ).resolves.toMatchObject({
      isInvited: false,
      isExclusive: false,
      isPublic: false,
    });
  });
});
