import { BookingSource } from 'src/common/enums/booking-source.enum';

export const CHECKIN_LATE_GRACE_MINUTES = 5;
const IMMEDIATE_BOOKING_TOLERANCE_MINUTES = 2;
const WARN_LATE_MINOR = 1;
const WARN_LATE_MAJOR = 2;

export interface CheckinTimingPolicy {
  exemptFromLatePenalty: boolean;
  lateGraceMinutes: number;
}

export interface CheckinAssessment {
  minutesLate: number;
  warningPoints: number;
  alreadyCheckedIn?: boolean;
}

export function resolveCheckinTimingPolicy(input: {
  source: BookingSource;
  scheduledStart: Date;
  createdAt: Date;
}): CheckinTimingPolicy {
  if (
    !(input.scheduledStart instanceof Date) ||
    !(input.createdAt instanceof Date) ||
    Number.isNaN(input.scheduledStart.getTime()) ||
    Number.isNaN(input.createdAt.getTime())
  ) {
    return {
      exemptFromLatePenalty: false,
      lateGraceMinutes: CHECKIN_LATE_GRACE_MINUTES,
    };
  }

  const scheduledFromCreationMinutes =
    Math.abs(input.scheduledStart.getTime() - input.createdAt.getTime()) /
    60_000;

  return {
    exemptFromLatePenalty:
      input.source === BookingSource.TASKER_CREATED &&
      scheduledFromCreationMinutes <= IMMEDIATE_BOOKING_TOLERANCE_MINUTES,
    lateGraceMinutes: CHECKIN_LATE_GRACE_MINUTES,
  };
}

export function assessCheckinLateness(
  rawMinutesLate: number,
  policy: CheckinTimingPolicy,
): CheckinAssessment {
  const normalizedLateMinutes = Math.max(0, rawMinutesLate);
  if (
    policy.exemptFromLatePenalty ||
    normalizedLateMinutes <= policy.lateGraceMinutes
  ) {
    return { minutesLate: 0, warningPoints: 0 };
  }

  return {
    minutesLate: Math.ceil(normalizedLateMinutes),
    warningPoints:
      normalizedLateMinutes > 15 ? WARN_LATE_MAJOR : WARN_LATE_MINOR,
  };
}
