import { DataSource } from 'typeorm';
import { BookingStatus } from 'src/common/enums/booking-status.enum';
import { BookingServiceTier } from 'src/common/enums/booking-service-tier.enum';
import { NotificationRefType } from 'src/common/enums/notification-ref-type.enum';
import { NotificationType } from 'src/common/enums/notification-type.enum';
import { TaskerEquipmentStatus } from 'src/common/enums/tasker-equipment-status.enum';
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

type PostedBookingReader = {
  findPostedBookings(userId: string): Promise<{
    total: number;
    items: Array<{
      id: string;
      invitation: { isInvited: boolean };
    }>;
  }>;
};

/**
 * Dựng service KHÔNG qua constructor, chỉ gắn đúng dependency mà test dùng.
 *
 * Trước đây spec truyền một dãy dài `undefined as never` theo vị trí. Mỗi lần
 * `TaskerBookingService` nhận thêm một dependency là dãy này lệch, `tsc` báo lỗi arity
 * còn Jest thì vẫn xanh (không kiểm kiểu lúc chạy) — lỗi trôi qua CI mà không ai thấy.
 * Gắn theo TÊN thuộc tính thì test miễn nhiễm với thay đổi constructor.
 */
function instantiate(deps: Record<string, unknown>): TaskerBookingService {
  const service = Object.create(
    TaskerBookingService.prototype,
  ) as TaskerBookingService;
  Object.assign(service, deps);
  return service;
}

function buildService(
  query: jest.Mock,
  premiumWaitMs = 15 * 60 * 1000,
): BookingAccessReader {
  return instantiate({
    dataSource: { query } as unknown as DataSource,
    bookingDispatchService: {
      getPremiumDispatchConfig: jest
        .fn()
        .mockResolvedValue({ favoriteWaitMs: premiumWaitMs }),
    },
  }) as unknown as BookingAccessReader;
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

describe('TaskerBookingService — danh sách booking posted', () => {
  it('giữ booking.id khi query thêm trạng thái lời mời', async () => {
    const postedBooking = {
      id: 'booking-id',
      bookingCode: 'BOOKING-1',
      status: BookingStatus.POSTED,
      serviceTier: BookingServiceTier.STANDARD,
      packageId: 'package-id',
      address: 'Phường Dịch Vọng, Cầu Giấy',
      addressRef: { hasPet: false },
      scheduledStartDate: '2026-07-25',
      scheduledStartTime: '08:00:00',
      scheduledEndDate: '2026-07-25',
      scheduledEndTime: '10:00:00',
      durationHours: 2,
      totalPrice: 264_000,
      basePrice: 264_000,
      addonPrice: 0,
      peakFee: 0,
      petFee: 0,
      discountAmount: 0,
      createdAt: new Date('2026-07-24T08:00:00.000Z'),
    } as BookingEntity;
    const queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      setParameters: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getRawAndEntities: jest.fn().mockResolvedValue({
        entities: [postedBooking],
        raw: [
          {
            booking_id: postedBooking.id,
            access_is_invited: true,
            access_is_public: false,
          },
        ],
      }),
    };
    const bookingRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };
    const packageRepository = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'package-id',
          name: 'Dọn văn phòng',
          policyDescription: null,
        },
      ]),
    };
    const dataSource = {
      getRepository: jest.fn().mockReturnValue(bookingRepository),
      manager: {
        getRepository: jest.fn().mockReturnValue(packageRepository),
      },
    } as unknown as DataSource;
    const service = instantiate({
      dataSource,
      bookingDispatchService: {
        getPremiumDispatchConfig: jest
          .fn()
          .mockResolvedValue({ favoriteWaitMs: 15 * 60 * 1000 }),
      },
    });
    (
      service as unknown as {
        findTaskerProfile: jest.Mock;
      }
    ).findTaskerProfile = jest.fn().mockResolvedValue({
      equipmentStatus: TaskerEquipmentStatus.APPROVED,
    });

    const result = await (
      service as unknown as PostedBookingReader
    ).findPostedBookings('tasker-user-id');

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe(postedBooking.id);
    expect(result.items[0]?.invitation.isInvited).toBe(true);
    expect(queryBuilder.addSelect).not.toHaveBeenCalledWith(
      'booking.id',
      'access_booking_id',
    );
  });
});
