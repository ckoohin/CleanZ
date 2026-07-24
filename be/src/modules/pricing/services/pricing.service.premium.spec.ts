import { BadRequestException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { BookingServiceTier } from 'src/common/enums/booking-service-tier.enum';
import { ServicePackageEntity } from 'src/modules/service/entity/service-package.entity';
import { SubServiceEntity } from 'src/modules/service/entity/sub-service.entity';
import { ServiceAddonEntity } from 'src/modules/service/entity/service-addon.entity';
import { PricingTierEntity } from '../entity/pricing-tier.entity';
import { PricingService } from './pricing.service';

/**
 * Khoá công thức giá của hạng PREMIUM.
 *
 * Trọng tâm: giá Cao cấp phải bằng giá tiêu chuẩn nhân hệ số
 * premium_hourly_rate / base_hourly_rate — đúng bằng con số mà màn cấu hình gói
 * của admin đang preview. Lệch công thức ở đây nghĩa là khách bị tính khác với
 * bảng giá admin nhìn thấy khi cấu hình.
 */
const PACKAGE_ID = 'pkg-1';

function buildPackage(
  overrides: Partial<ServicePackageEntity> = {},
): ServicePackageEntity {
  return {
    id: PACKAGE_ID,
    name: 'Dọn nhà theo giờ',
    baseHourlyRate: 100_000,
    premiumHourlyRate: 150_000,
    maxHours: 8,
    toolFee: 0,
    petSurcharge: 50_000,
    peakHours: [],
    coverageAreas: [],
    ...overrides,
  } as unknown as ServicePackageEntity;
}

function buildManager(servicePackage: ServicePackageEntity): EntityManager {
  const repositories = new Map<unknown, unknown>([
    [
      ServicePackageEntity,
      { findOne: jest.fn().mockResolvedValue(servicePackage) },
    ],
    [SubServiceEntity, { find: jest.fn().mockResolvedValue([]) }],
    [ServiceAddonEntity, { find: jest.fn().mockResolvedValue([]) }],
    [PricingTierEntity, { find: jest.fn().mockResolvedValue([]) }],
  ]);

  return {
    getRepository: (entity: unknown) => repositories.get(entity),
  } as unknown as EntityManager;
}

function buildService(): PricingService {
  return new PricingService(
    {} as never,
    {} as never,
    {} as never,
    { findValidForBooking: jest.fn(), calculateDiscount: jest.fn() } as never,
    {} as never,
  );
}

const BASE_INPUT = {
  packageId: PACKAGE_ID,
  durationHours: 3,
  scheduledStart: new Date('2026-08-01T09:00:00+07:00'),
  scheduledStartTime: '09:00',
  hasPet: false,
};

describe('PricingService — hạng dịch vụ PREMIUM', () => {
  it('STANDARD dùng đơn giá cơ bản và không phát sinh premiumFee', async () => {
    const result = await buildService().calculateBookingPrice(
      buildManager(buildPackage()),
      { ...BASE_INPUT, serviceTier: BookingServiceTier.STANDARD },
    );

    expect(result.basePrice).toBe(300_000); // 100k × 3h
    expect(result.premiumFee).toBe(0);
    expect(result.serviceTier).toBe(BookingServiceTier.STANDARD);
  });

  it('mặc định là STANDARD khi caller không truyền serviceTier', async () => {
    const result = await buildService().calculateBookingPrice(
      buildManager(buildPackage()),
      BASE_INPUT,
    );

    expect(result.serviceTier).toBe(BookingServiceTier.STANDARD);
    expect(result.basePrice).toBe(300_000);
  });

  it('PREMIUM nâng giá theo hệ số premium/base', async () => {
    const result = await buildService().calculateBookingPrice(
      buildManager(buildPackage()),
      { ...BASE_INPUT, serviceTier: BookingServiceTier.PREMIUM },
    );

    expect(result.basePrice).toBe(450_000); // 150k × 3h
    expect(result.premiumFee).toBe(150_000); // 450k − 300k
    expect(result.serviceTier).toBe(BookingServiceTier.PREMIUM);
  });

  it('premiumFee nằm TRONG basePrice, không bị cộng thêm lần nữa vào subtotal', async () => {
    const result = await buildService().calculateBookingPrice(
      buildManager(buildPackage()),
      { ...BASE_INPUT, serviceTier: BookingServiceTier.PREMIUM },
    );

    expect(result.subtotal).toBe(
      result.basePrice + result.addonPrice + result.peakFee + result.petFee,
    );
    expect(result.subtotal).toBe(450_000);
  });

  it('subtotal tăng theo giá Cao cấp — hoa hồng nền tảng vì thế tự động tính đúng', async () => {
    const service = buildService();
    const [standard, premium] = await Promise.all([
      service.calculateBookingPrice(buildManager(buildPackage()), {
        ...BASE_INPUT,
        serviceTier: BookingServiceTier.STANDARD,
      }),
      service.calculateBookingPrice(buildManager(buildPackage()), {
        ...BASE_INPUT,
        serviceTier: BookingServiceTier.PREMIUM,
      }),
    ]);

    const rate = 20;
    expect(Math.round((premium.subtotal * rate) / 100)).toBe(90_000);
    expect(Math.round((standard.subtotal * rate) / 100)).toBe(60_000);
    // Phần chênh lệch Cao cấp cũng chịu hoa hồng như mọi khoản khác.
    expect(
      Math.round((premium.subtotal * rate) / 100) -
        Math.round((standard.subtotal * rate) / 100),
    ).toBe(Math.round((premium.premiumFee * rate) / 100));
  });

  it('từ chối khi gói chưa cấu hình đơn giá Cao cấp', async () => {
    await expect(
      buildService().calculateBookingPrice(
        buildManager(buildPackage({ premiumHourlyRate: 0 })),
        { ...BASE_INPUT, serviceTier: BookingServiceTier.PREMIUM },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('từ chối khi đơn giá Cao cấp bị cấu hình thấp hơn đơn giá tiêu chuẩn', async () => {
    await expect(
      buildService().calculateBookingPrice(
        buildManager(buildPackage({ premiumHourlyRate: 80_000 })),
        { ...BASE_INPUT, serviceTier: BookingServiceTier.PREMIUM },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
