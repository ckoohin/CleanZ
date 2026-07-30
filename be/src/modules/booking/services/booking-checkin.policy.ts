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
/**
 * Sai số GPS lớn hơn ngưỡng này không đủ tin cậy để tự duyệt check-in, kể cả
 * tọa độ trả về đang nằm trong bán kính 50m.
 */
export const CHECKIN_MAX_ACCURACY_METERS = 100;

export type CheckinLocationReviewReason =
  | 'GPS_UNAVAILABLE'
  | 'TARGET_UNAVAILABLE'
  | 'LOW_ACCURACY'
  | 'OUTSIDE_RADIUS'
  | null;

export interface CheckinLocationAssessment {
  /** Khoảng cách đường chim bay tới địa chỉ khách; null nếu không đo được. */
  distanceMeters: number | null;
  /** true = không đủ điều kiện tự duyệt → cần ảnh minh chứng. */
  isFar: boolean;
  /** Lý do cần review để API trả đúng hướng dẫn và lưu đúng nguồn xác minh. */
  reviewReason: CheckinLocationReviewReason;
}

/**
 * Quyết định check-in gần/xa — hàm thuần để test độc lập.
 *
 * Địa chỉ thiếu tọa độ hoặc thiết bị thiếu GPS đều không thể xác minh tự động,
 * nên cần ảnh và chuyển Admin duyệt. Admin phân biệt hai trường hợp bằng nguồn
 * xác minh được lưu trên booking; không tự quy lỗi cho Tasker.
 */
export function assessCheckinLocation(input: {
  currentLatitude?: number;
  currentLongitude?: number;
  accuracyMeters?: number;
  addressLatitude: number | null;
  addressLongitude: number | null;
  maxDistanceMeters?: number;
  maxAccuracyMeters?: number;
}): CheckinLocationAssessment {
  const maxDistance = input.maxDistanceMeters ?? CHECKIN_MAX_DISTANCE_METERS;
  const maxAccuracy = input.maxAccuracyMeters ?? CHECKIN_MAX_ACCURACY_METERS;
  const { currentLatitude, currentLongitude } = input;
  const { addressLatitude, addressLongitude } = input;

  if (
    currentLatitude === undefined ||
    currentLongitude === undefined ||
    !Number.isFinite(currentLatitude) ||
    !Number.isFinite(currentLongitude)
  ) {
    return {
      distanceMeters: null,
      isFar: true,
      reviewReason: 'GPS_UNAVAILABLE',
    };
  }
  if (
    addressLatitude === null ||
    addressLongitude === null ||
    !Number.isFinite(addressLatitude) ||
    !Number.isFinite(addressLongitude)
  ) {
    return {
      distanceMeters: null,
      isFar: true,
      reviewReason: 'TARGET_UNAVAILABLE',
    };
  }

  const distanceMeters = haversineDistanceMeters(
    currentLatitude,
    currentLongitude,
    addressLatitude,
    addressLongitude,
  );
  if (distanceMeters > maxDistance) {
    return {
      distanceMeters,
      isFar: true,
      reviewReason: 'OUTSIDE_RADIUS',
    };
  }

  if (
    input.accuracyMeters === undefined ||
    !Number.isFinite(input.accuracyMeters) ||
    input.accuracyMeters < 0 ||
    input.accuracyMeters > maxAccuracy
  ) {
    return {
      distanceMeters,
      isFar: true,
      reviewReason: 'LOW_ACCURACY',
    };
  }

  return { distanceMeters, isFar: false, reviewReason: null };
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
