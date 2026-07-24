import { EntityManager } from 'typeorm';
import { TaskerScheduleAvailabilityService } from './tasker-schedule-availability.service';

describe('TaskerScheduleAvailabilityService', () => {
  it('chặn lịch trùng khi PostgreSQL trả cột date dưới dạng Date', async () => {
    const queryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        {
          taskerId: 'tasker-1',
          bookingCode: 'BOOKING-1',
          scheduledStartDate: new Date('2026-07-24T00:00:00+07:00'),
          scheduledStartTime: '08:00:00',
          scheduledEndDate: new Date('2026-07-24T00:00:00+07:00'),
          scheduledEndTime: '11:30:00',
        },
      ]),
    };
    const manager = {
      getRepository: jest.fn().mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      }),
    } as unknown as EntityManager;
    const service = new TaskerScheduleAvailabilityService();

    const availability = await service.getForTasker(manager, 'tasker-1', {
      scheduledStartDate: '2026-07-24',
      scheduledStartTime: '08:00',
      scheduledEndDate: '2026-07-24',
      scheduledEndTime: '10:00',
    });

    expect(availability).toMatchObject({
      status: 'BUSY',
      isAvailable: false,
      reason: 'OVERLAP',
      conflict: {
        bookingCode: 'BOOKING-1',
        scheduledStartDate: '2026-07-24',
        scheduledEndDate: '2026-07-24',
      },
    });
  });
});
