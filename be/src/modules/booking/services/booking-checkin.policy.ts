import { BookingSource } from 'src/common/enums/booking-source.enum';
import { haversineDistanceMeters } from 'src/common/helpers/geo.helper';

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

/**
 * Bán kính check-in hợp lệ quanh địa chỉ khách (mét). Xa hơn — hoặc không lấy
 * được GPS — thì bắt buộc kèm ảnh minh chứng và đơn bị gắn cờ checkin_far.
 */
export const CHECKIN_MAX_DISTANCE_METERS = 50;

export interface CheckinLocationAssessment {
  /** Khoảng cách đường chim bay tới địa chỉ khách; null nếu không đo được. */
  distanceMeters: number | null;
  /** true = ngoài bán kính cho phép hoặc thiếu GPS → cần ảnh minh chứng. */
  isFar: boolean;
}

/**
 * Quyết định check-in gần/xa — hàm thuần để test độc lập.
 *
 * Địa chỉ thiếu tọa độ (dữ liệu cũ) thì không thể đo: không coi là xa vì lỗi
 * không thuộc về tasker. Thiếu GPS của TASKER thì ngược lại — coi như xa,
 * vì đó là thứ tasker kiểm soát được (bật định vị).
 */
export function assessCheckinLocation(input: {
  currentLatitude?: number;
  currentLongitude?: number;
  addressLatitude: number | null;
  addressLongitude: number | null;
  maxDistanceMeters?: number;
}): CheckinLocationAssessment {
  const maxDistance = input.maxDistanceMeters ?? CHECKIN_MAX_DISTANCE_METERS;
  const { currentLatitude, currentLongitude } = input;
  const { addressLatitude, addressLongitude } = input;

  if (
    currentLatitude === undefined ||
    currentLongitude === undefined ||
    !Number.isFinite(currentLatitude) ||
    !Number.isFinite(currentLongitude)
  ) {
    return { distanceMeters: null, isFar: true };
  }
  if (
    addressLatitude === null ||
    addressLongitude === null ||
    !Number.isFinite(addressLatitude) ||
    !Number.isFinite(addressLongitude)
  ) {
    return { distanceMeters: null, isFar: false };
  }

  const distanceMeters = haversineDistanceMeters(
    currentLatitude,
    currentLongitude,
    addressLatitude,
    addressLongitude,
  );
  return { distanceMeters, isFar: distanceMeters > maxDistance };
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
