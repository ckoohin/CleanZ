import { BadRequestException, Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { CustomerAddressEntity } from 'src/modules/customer/entity/customer-address.entity';
import { SystemConfigService } from 'src/modules/system-config/system-config.service';
import { SYSTEM_CONFIG_KEYS } from 'src/modules/system-config/system-config.keys';
import { BookingScheduleDraft } from './booking-schedule.service';

@Injectable()
export class BookingLocationPolicyService {
  constructor(private readonly systemConfigService: SystemConfigService) {}

  async assertSupportedBookingArea(
    manager: EntityManager,
    dto: BookingScheduleDraft,
    bookingAddress: string,
    addressRef: CustomerAddressEntity | null,
  ): Promise<void> {
    const [supportedAreaName, supportedProvinceCodes, supportedAreaKeywords] =
      await Promise.all([
        this.systemConfigService.getRequiredString(
          manager,
          SYSTEM_CONFIG_KEYS.SUPPORTED_AREA_NAME,
        ),
        this.systemConfigService.getRequiredStringList(
          manager,
          SYSTEM_CONFIG_KEYS.SUPPORTED_PROVINCE_CODES,
        ),
        this.systemConfigService.getRequiredStringList(
          manager,
          SYSTEM_CONFIG_KEYS.SUPPORTED_AREA_KEYWORDS,
        ),
      ]);

    const provinceCode = dto.provinceCode?.trim();
    if (provinceCode) {
      const normalizedProvinceCode = this.normalizeProvinceCode(provinceCode);
      const normalizedSupportedProvinceCodes = supportedProvinceCodes.map(
        (code) => this.normalizeProvinceCode(code),
      );
      if (normalizedSupportedProvinceCodes.includes(normalizedProvinceCode)) {
        return;
      }

      throw new BadRequestException(
        `Hiện hệ thống chỉ hỗ trợ khu vực ${supportedAreaName}`,
      );
    }

    const locationText = this.normalizeLocationText(
      [bookingAddress, addressRef?.wardDetail].filter(Boolean).join(' '),
    );
    const isSupportedArea = supportedAreaKeywords
      .map((keyword) => this.normalizeLocationText(keyword))
      .some((keyword) => locationText.includes(keyword));

    if (!isSupportedArea) {
      throw new BadRequestException(
        `Hiện hệ thống chỉ hỗ trợ khu vực ${supportedAreaName}`,
      );
    }
  }

  private normalizeProvinceCode(value: string): string {
    return this.normalizeLocationText(value)
      .replace(/[\s-]+/g, '_')
      .toUpperCase();
  }

  private normalizeLocationText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }
}
