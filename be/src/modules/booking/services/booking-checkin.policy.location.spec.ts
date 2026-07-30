import {
  assessCheckinLocation,
  CHECKIN_MAX_DISTANCE_METERS,
} from './booking-checkin.policy';

// Địa chỉ neo tại Hồ Gươm; 1 độ vĩ ≈ 111.32km ⇒ xê dịch vĩ độ để tạo khoảng
// cách chính xác quanh mốc 50m.
const ADDRESS_LAT = 21.0285;
const ADDRESS_LNG = 105.8542;
const METERS_PER_LAT_DEGREE = 111_320;

function latOffsetMeters(meters: number): number {
  return ADDRESS_LAT + meters / METERS_PER_LAT_DEGREE;
}

describe('assessCheckinLocation', () => {
  it('trong bán kính (≈30m) → không xa, trả đúng khoảng cách', () => {
    const result = assessCheckinLocation({
      currentLatitude: latOffsetMeters(30),
      currentLongitude: ADDRESS_LNG,
      accuracyMeters: 10,
      addressLatitude: ADDRESS_LAT,
      addressLongitude: ADDRESS_LNG,
    });

    expect(result.isFar).toBe(false);
    expect(result.distanceMeters).not.toBeNull();
    expect(result.distanceMeters!).toBeGreaterThan(25);
    expect(result.distanceMeters!).toBeLessThan(35);
  });

  it('sát mốc 49m → vẫn hợp lệ', () => {
    const result = assessCheckinLocation({
      currentLatitude: latOffsetMeters(49),
      currentLongitude: ADDRESS_LNG,
      accuracyMeters: 10,
      addressLatitude: ADDRESS_LAT,
      addressLongitude: ADDRESS_LNG,
    });

    expect(result.isFar).toBe(false);
  });

  it('vượt mốc (≈60m) → xa, cần ảnh minh chứng', () => {
    const result = assessCheckinLocation({
      currentLatitude: latOffsetMeters(60),
      currentLongitude: ADDRESS_LNG,
      accuracyMeters: 10,
      addressLatitude: ADDRESS_LAT,
      addressLongitude: ADDRESS_LNG,
    });

    expect(result.isFar).toBe(true);
    expect(result.distanceMeters!).toBeGreaterThan(CHECKIN_MAX_DISTANCE_METERS);
  });

  it('rất xa (≈2km) → xa', () => {
    const result = assessCheckinLocation({
      currentLatitude: latOffsetMeters(2_000),
      currentLongitude: ADDRESS_LNG,
      accuracyMeters: 10,
      addressLatitude: ADDRESS_LAT,
      addressLongitude: ADDRESS_LNG,
    });

    expect(result.isFar).toBe(true);
    expect(result.distanceMeters!).toBeGreaterThan(1_900);
    expect(result.distanceMeters!).toBeLessThan(2_100);
  });

  it('đứng đúng vị trí khách (0m) → hợp lệ', () => {
    const result = assessCheckinLocation({
      currentLatitude: ADDRESS_LAT,
      currentLongitude: ADDRESS_LNG,
      accuracyMeters: 10,
      addressLatitude: ADDRESS_LAT,
      addressLongitude: ADDRESS_LNG,
    });

    expect(result.isFar).toBe(false);
    expect(result.distanceMeters).toBeCloseTo(0, 5);
    expect(result.reviewReason).toBeNull();
  });

  it('đúng vị trí nhưng GPS sai số lớn → cần ảnh và hậu kiểm', () => {
    const result = assessCheckinLocation({
      currentLatitude: ADDRESS_LAT,
      currentLongitude: ADDRESS_LNG,
      accuracyMeters: 250,
      addressLatitude: ADDRESS_LAT,
      addressLongitude: ADDRESS_LNG,
    });

    expect(result).toEqual({
      distanceMeters: 0,
      isFar: true,
      reviewReason: 'LOW_ACCURACY',
    });
  });

  it('thiếu GPS (tasker từ chối định vị) → coi như xa, không đo được', () => {
    const result = assessCheckinLocation({
      addressLatitude: ADDRESS_LAT,
      addressLongitude: ADDRESS_LNG,
    });

    expect(result).toEqual({
      distanceMeters: null,
      isFar: true,
      reviewReason: 'GPS_UNAVAILABLE',
    });
  });

  it('GPS không hợp lệ (NaN) → coi như xa', () => {
    const result = assessCheckinLocation({
      currentLatitude: Number.NaN,
      currentLongitude: ADDRESS_LNG,
      addressLatitude: ADDRESS_LAT,
      addressLongitude: ADDRESS_LNG,
    });

    expect(result).toEqual({
      distanceMeters: null,
      isFar: true,
      reviewReason: 'GPS_UNAVAILABLE',
    });
  });

  it('địa chỉ thiếu tọa độ → cần ảnh và chuyển Admin hậu kiểm', () => {
    const result = assessCheckinLocation({
      currentLatitude: ADDRESS_LAT,
      currentLongitude: ADDRESS_LNG,
      accuracyMeters: 10,
      addressLatitude: null,
      addressLongitude: null,
    });

    expect(result).toEqual({
      distanceMeters: null,
      isFar: true,
      reviewReason: 'TARGET_UNAVAILABLE',
    });
  });

  it('tôn trọng maxDistanceMeters tuỳ biến', () => {
    const result = assessCheckinLocation({
      currentLatitude: latOffsetMeters(80),
      currentLongitude: ADDRESS_LNG,
      accuracyMeters: 10,
      addressLatitude: ADDRESS_LAT,
      addressLongitude: ADDRESS_LNG,
      maxDistanceMeters: 100,
    });

    expect(result.isFar).toBe(false);
  });
});
