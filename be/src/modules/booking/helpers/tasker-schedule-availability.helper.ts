export const TASKER_MAX_CONCURRENT_BOOKINGS = 3;
export const TASKER_TIGHT_SCHEDULE_MINUTES = 60;

export type TaskerScheduleAvailabilityStatus =
  | 'AVAILABLE'
  | 'TIGHT_SCHEDULE'
  | 'BUSY';

export type TaskerScheduleUnavailableReason =
  | 'OVERLAP'
  | 'MAX_CONCURRENT'
  | null;

export interface TaskerScheduleWindow {
  scheduledStartDate: string;
  scheduledStartTime: string;
  scheduledEndDate: string;
  scheduledEndTime: string;
  bookingCode?: string;
}

export interface NearbyTaskerScheduleWindow extends TaskerScheduleWindow {
  relation: 'BEFORE' | 'AFTER';
  gapMinutes: number;
}

export interface TaskerScheduleAvailability {
  status: TaskerScheduleAvailabilityStatus;
  isAvailable: boolean;
  reason: TaskerScheduleUnavailableReason;
  activeBookingCount: number;
  conflict: TaskerScheduleWindow | null;
  nearby: NearbyTaskerScheduleWindow | null;
}

function scheduleTimestamp(date: string, time: string): number | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})(?::(\d{2}))?/.exec(time);
  if (!dateMatch || !timeMatch) return null;

  const [, year, month, day] = dateMatch;
  const [, hour, minute, second = '0'] = timeMatch;
  const timestamp = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );

  return Number.isFinite(timestamp) ? timestamp : null;
}

function scheduleParts(timestamp: number): {
  date: string;
  time: string;
} {
  const iso = new Date(timestamp).toISOString();
  return {
    date: iso.slice(0, 10),
    time: iso.slice(11, 16),
  };
}

/**
 * Dùng UTC như một trục số "naive local time", không phải chuyển múi giờ.
 * Booking lưu ngày/giờ Việt Nam ở cột date + time nên cách này giữ nguyên
 * chính xác giá trị người dùng chọn và xử lý đúng cả trường hợp qua ngày.
 */
export function buildTaskerScheduleWindow(
  scheduledDate: string,
  scheduledTime: string,
  durationHours: number,
): TaskerScheduleWindow | null {
  const start = scheduleTimestamp(scheduledDate, scheduledTime);
  const durationMinutes = Math.round(durationHours * 60);
  if (start === null || durationMinutes <= 0) return null;

  const end = scheduleParts(start + durationMinutes * 60_000);
  return {
    scheduledStartDate: scheduledDate,
    scheduledStartTime: scheduledTime,
    scheduledEndDate: end.date,
    scheduledEndTime: end.time,
  };
}

export function evaluateTaskerScheduleAvailability(
  requested: TaskerScheduleWindow,
  activeBookings: TaskerScheduleWindow[],
  tightScheduleMinutes = TASKER_TIGHT_SCHEDULE_MINUTES,
): TaskerScheduleAvailability {
  const requestedStart = scheduleTimestamp(
    requested.scheduledStartDate,
    requested.scheduledStartTime,
  );
  const requestedEnd = scheduleTimestamp(
    requested.scheduledEndDate,
    requested.scheduledEndTime,
  );

  if (requestedStart === null || requestedEnd === null) {
    return {
      status: 'BUSY',
      isAvailable: false,
      reason: 'OVERLAP',
      activeBookingCount: activeBookings.length,
      conflict: null,
      nearby: null,
    };
  }

  let nearby: NearbyTaskerScheduleWindow | null = null;

  for (const booking of activeBookings) {
    const existingStart = scheduleTimestamp(
      booking.scheduledStartDate,
      booking.scheduledStartTime,
    );
    const existingEnd = scheduleTimestamp(
      booking.scheduledEndDate,
      booking.scheduledEndTime,
    );
    if (existingStart === null || existingEnd === null) continue;

    if (requestedStart < existingEnd && requestedEnd > existingStart) {
      return {
        status: 'BUSY',
        isAvailable: false,
        reason: 'OVERLAP',
        activeBookingCount: activeBookings.length,
        conflict: booking,
        nearby: null,
      };
    }

    const relation = existingEnd <= requestedStart ? 'BEFORE' : 'AFTER';
    const gapMs =
      relation === 'BEFORE'
        ? requestedStart - existingEnd
        : existingStart - requestedEnd;
    const gapMinutes = Math.max(0, Math.round(gapMs / 60_000));

    if (!nearby || gapMinutes < nearby.gapMinutes) {
      nearby = { ...booking, relation, gapMinutes };
    }
  }

  if (activeBookings.length >= TASKER_MAX_CONCURRENT_BOOKINGS) {
    return {
      status: 'BUSY',
      isAvailable: false,
      reason: 'MAX_CONCURRENT',
      activeBookingCount: activeBookings.length,
      conflict: null,
      nearby: null,
    };
  }

  if (nearby && nearby.gapMinutes <= tightScheduleMinutes) {
    return {
      status: 'TIGHT_SCHEDULE',
      isAvailable: true,
      reason: null,
      activeBookingCount: activeBookings.length,
      conflict: null,
      nearby,
    };
  }

  return {
    status: 'AVAILABLE',
    isAvailable: true,
    reason: null,
    activeBookingCount: activeBookings.length,
    conflict: null,
    nearby: null,
  };
}

export function formatTaskerScheduleTime(date: string, time: string): string {
  const [year, month, day] = date.split('-');
  return `${time.slice(0, 5)} ${day}/${month}/${year}`;
}
