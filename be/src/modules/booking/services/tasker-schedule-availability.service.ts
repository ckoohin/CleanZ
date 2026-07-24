import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { BookingStatus } from 'src/common/enums/booking-status.enum';
import { formatVietnamDate } from 'src/common/helpers/vietnam-time.helper';
import { BookingEntity } from '../entity/booking.entity';
import {
  evaluateTaskerScheduleAvailability,
  TaskerScheduleAvailability,
  TaskerScheduleWindow,
} from '../helpers/tasker-schedule-availability.helper';

const TASKER_SCHEDULE_BUSY_STATUSES = [
  BookingStatus.CONFIRMED,
  BookingStatus.TASKER_ON_THE_WAY,
  BookingStatus.CHECKED_IN,
  BookingStatus.IN_PROGRESS,
];

interface TaskerBookingScheduleRow extends Omit<
  TaskerScheduleWindow,
  'scheduledStartDate' | 'scheduledEndDate'
> {
  taskerId: string;
  scheduledStartDate: string | Date;
  scheduledEndDate: string | Date;
}

function normalizeScheduleDate(value: string | Date): string | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : formatVietnamDate(value);
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : formatVietnamDate(parsed);
}

@Injectable()
export class TaskerScheduleAvailabilityService {
  async getForTaskers(
    manager: EntityManager,
    taskerIds: string[],
    requested: TaskerScheduleWindow,
  ): Promise<Map<string, TaskerScheduleAvailability>> {
    const uniqueTaskerIds = [...new Set(taskerIds)];
    if (uniqueTaskerIds.length === 0) return new Map();

    const rows = await manager
      .getRepository(BookingEntity)
      .createQueryBuilder('booking')
      .select('booking.tasker_id', 'taskerId')
      .addSelect('booking.booking_code', 'bookingCode')
      .addSelect('booking.scheduled_start_date', 'scheduledStartDate')
      .addSelect('booking.scheduled_start_time', 'scheduledStartTime')
      .addSelect('booking.scheduled_end_date', 'scheduledEndDate')
      .addSelect('booking.scheduled_end_time', 'scheduledEndTime')
      .where('booking.tasker_id IN (:...taskerIds)', {
        taskerIds: uniqueTaskerIds,
      })
      .andWhere('booking.status IN (:...statuses)', {
        statuses: TASKER_SCHEDULE_BUSY_STATUSES,
      })
      .getRawMany<TaskerBookingScheduleRow>();

    const bookingsByTasker = new Map<string, TaskerScheduleWindow[]>();
    for (const row of rows) {
      const scheduledStartDate = normalizeScheduleDate(row.scheduledStartDate);
      const scheduledEndDate = normalizeScheduleDate(row.scheduledEndDate);
      if (
        !scheduledStartDate ||
        !row.scheduledStartTime ||
        !scheduledEndDate ||
        !row.scheduledEndTime
      ) {
        continue;
      }

      const current = bookingsByTasker.get(row.taskerId) ?? [];
      current.push({
        bookingCode: row.bookingCode,
        scheduledStartDate,
        scheduledStartTime: String(row.scheduledStartTime),
        scheduledEndDate,
        scheduledEndTime: String(row.scheduledEndTime),
      });
      bookingsByTasker.set(row.taskerId, current);
    }

    return new Map(
      uniqueTaskerIds.map((taskerId) => [
        taskerId,
        evaluateTaskerScheduleAvailability(
          requested,
          bookingsByTasker.get(taskerId) ?? [],
        ),
      ]),
    );
  }

  async getForTasker(
    manager: EntityManager,
    taskerId: string,
    requested: TaskerScheduleWindow,
  ): Promise<TaskerScheduleAvailability> {
    const results = await this.getForTaskers(manager, [taskerId], requested);
    return (
      results.get(taskerId) ?? evaluateTaskerScheduleAvailability(requested, [])
    );
  }
}
