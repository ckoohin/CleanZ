import { haversineDistanceMeters } from './geo.helper';

describe('haversineDistanceMeters', () => {
  it('cùng một điểm → 0m', () => {
    expect(haversineDistanceMeters(21.0285, 105.8542, 21.0285, 105.8542)).toBe(
      0,
    );
  });

  it('Hồ Gươm → Lăng Bác ≈ 2.6km', () => {
    // Hồ Gươm (21.0285, 105.8542) → Lăng Chủ tịch (21.0369, 105.8347)
    const distance = haversineDistanceMeters(
      21.0285,
      105.8542,
      21.0369,
      105.8347,
    );
    expect(distance).toBeGreaterThan(2_100);
    expect(distance).toBeLessThan(2_600);
  });

  it('1 độ vĩ ≈ 111.2km (bất biến của Trái Đất)', () => {
    const distance = haversineDistanceMeters(21, 105.8542, 22, 105.8542);
    expect(distance).toBeGreaterThan(110_000);
    expect(distance).toBeLessThan(112_500);
  });

  it('đối xứng: d(A,B) = d(B,A)', () => {
    const ab = haversineDistanceMeters(21.0285, 105.8542, 10.7769, 106.7009);
    const ba = haversineDistanceMeters(10.7769, 106.7009, 21.0285, 105.8542);
    expect(ab).toBeCloseTo(ba, 6);
  });
});
