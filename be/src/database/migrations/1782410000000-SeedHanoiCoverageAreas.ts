import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedHanoiCoverageAreas1782410000000 implements MigrationInterface {
  name = 'SeedHanoiCoverageAreas1782410000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Kiểm tra xem đã có dữ liệu Hà Nội chưa để tránh duplicate
    const existing = await queryRunner.query(
      `SELECT COUNT(*) AS cnt FROM "coverage_areas" WHERE "city" = 'Hà Nội'`,
    );
    if (existing[0]?.cnt > 0) {
      console.log('[Migration] Coverage areas Hà Nội đã tồn tại, bỏ qua seed.');
      return;
    }

    await queryRunner.query(`
      INSERT INTO "coverage_areas" ("id", "name", "city", "transport_fee", "is_active", "created_at")
      VALUES
        -- ─── Quận nội thành (phí vận chuyển = 0) ───────────────────────────
        (gen_random_uuid(), 'Ba Đình',        'Hà Nội',      0, true, NOW()),
        (gen_random_uuid(), 'Hoàn Kiếm',      'Hà Nội',      0, true, NOW()),
        (gen_random_uuid(), 'Tây Hồ',         'Hà Nội',      0, true, NOW()),
        (gen_random_uuid(), 'Cầu Giấy',       'Hà Nội',      0, true, NOW()),
        (gen_random_uuid(), 'Đống Đa',        'Hà Nội',      0, true, NOW()),
        (gen_random_uuid(), 'Hai Bà Trưng',   'Hà Nội',      0, true, NOW()),
        (gen_random_uuid(), 'Thanh Xuân',     'Hà Nội',      0, true, NOW()),
        -- ─── Quận có phí nhỏ ─────────────────────────────────────────────
        (gen_random_uuid(), 'Long Biên',      'Hà Nội',  10000, true, NOW()),
        (gen_random_uuid(), 'Hoàng Mai',      'Hà Nội',  10000, true, NOW()),
        (gen_random_uuid(), 'Nam Từ Liêm',    'Hà Nội',  10000, true, NOW()),
        (gen_random_uuid(), 'Bắc Từ Liêm',    'Hà Nội',  10000, true, NOW()),
        (gen_random_uuid(), 'Hà Đông',        'Hà Nội',  15000, true, NOW()),
        -- ─── Huyện ngoại thành gần (phí 20-30k) ─────────────────────────
        (gen_random_uuid(), 'Thanh Trì',      'Hà Nội',  20000, true, NOW()),
        (gen_random_uuid(), 'Gia Lâm',        'Hà Nội',  20000, true, NOW()),
        (gen_random_uuid(), 'Đông Anh',       'Hà Nội',  25000, true, NOW()),
        (gen_random_uuid(), 'Hoài Đức',       'Hà Nội',  25000, true, NOW()),
        (gen_random_uuid(), 'Mê Linh',        'Hà Nội',  30000, true, NOW()),
        (gen_random_uuid(), 'Đan Phượng',     'Hà Nội',  30000, true, NOW()),
        -- ─── Huyện ngoại thành vừa (phí 35-45k) ─────────────────────────
        (gen_random_uuid(), 'Thanh Oai',      'Hà Nội',  35000, true, NOW()),
        (gen_random_uuid(), 'Thường Tín',     'Hà Nội',  35000, true, NOW()),
        (gen_random_uuid(), 'Quốc Oai',       'Hà Nội',  35000, true, NOW()),
        (gen_random_uuid(), 'Phúc Thọ',       'Hà Nội',  45000, true, NOW()),
        (gen_random_uuid(), 'Thạch Thất',     'Hà Nội',  40000, true, NOW()),
        -- ─── Huyện ngoại thành xa (phí 40-60k) ──────────────────────────
        (gen_random_uuid(), 'Sóc Sơn',        'Hà Nội',  40000, true, NOW()),
        (gen_random_uuid(), 'Chương Mỹ',      'Hà Nội',  40000, true, NOW()),
        (gen_random_uuid(), 'Phú Xuyên',      'Hà Nội',  50000, true, NOW()),
        (gen_random_uuid(), 'Ứng Hòa',        'Hà Nội',  50000, true, NOW()),
        (gen_random_uuid(), 'Mỹ Đức',         'Hà Nội',  60000, true, NOW()),
        (gen_random_uuid(), 'Ba Vì',          'Hà Nội',  60000, true, NOW())
    `);

    console.log('[Migration] Đã seed 29 quận/huyện Hà Nội vào coverage_areas.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "coverage_areas" WHERE "city" = 'Hà Nội'`,
    );
    console.log('[Migration] Đã xóa toàn bộ coverage_areas của Hà Nội.');
  }
}
