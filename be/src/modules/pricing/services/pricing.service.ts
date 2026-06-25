import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import {
  PricingConfigRepository,
  PeakDayConfigRepository,
} from '../pricing.repository';
import { ServiceRepository } from '../../service/service.repository';
import { PricingConfigEntity } from '../entity/pricing-config.entity';
import { PeakDayConfigEntity } from '../entity/peak-day-config.entity';
import { PricingTierEntity, PricingMode } from '../entity/pricing-tier.entity';
import { PaginatedData } from '../../../common/helpers/response.interface';
import { CreatePricingConfigDto } from '../dto/create-pricing.dto';
import { PricingListQueryDto } from '../dto/list-query-pricing.dto';
import { UpdatePricingConfigDto } from '../dto/update-pricing.dto';
import { CreatePeakDayConfigDto } from '../dto/create-peak-day.dto';
import { UpdatePeakDayConfigDto } from '../dto/update-peak-day.dto';
import { EntityManager, In, Repository } from 'typeorm';
import { SubServiceEntity } from 'src/modules/service/entity/sub-service.entity';
import { ServicePackageEntity } from 'src/modules/service/entity/service-package.entity';
import { toNumber } from 'src/common/helpers/number.helper';
import { VouchersService } from 'src/modules/voucher/services/vouchers.service';
import { SystemConfigService } from 'src/modules/system-config/system-config.service';
import { VoucherEntity } from 'src/modules/voucher/entity/voucher.entity';

export interface CalculateBookingPriceInput {
  packageId?: string;
  subServiceIds?: string[];
  durationHours?: number;
  areaM2?: number;
  pricingTierId?: string;
  scheduledStart: Date;
  scheduledStartTime: string;
  hasPet: boolean;
  voucherCode?: string;
}

export interface ServiceSummary {
  id: string;
  name: string;
  description?: string | null;
}

export interface BookingPriceResult {
  package: ServicePackageEntity;
  subServices: SubServiceEntity[];
  durationHours: number;
  basePrice: number;
  addonPrice: number;
  peakFee: number;
  petFee: number;
  waitingFee: number;
  subtotal: number;
  discountAmount: number;
  totalPrice: number;
  voucher?: VoucherEntity | null;
  pricingTierId?: string;
}

@Injectable()
export class PricingService {
  constructor(
    private readonly pricingRepo: PricingConfigRepository,
    private readonly peakDayRepo: PeakDayConfigRepository,
    private readonly serviceRepo: ServiceRepository,
    private readonly voucherService: VouchersService,
    private readonly systemConfigService: SystemConfigService,
  ) {}

  async createPricingConfig(
    dto: CreatePricingConfigDto,
  ): Promise<PricingConfigEntity> {
    const entity = this.pricingRepo.create({
      name: dto.name,
      basePrice: dto.basePrice,
      peakPrice: dto.peakPrice ?? null,
      petFee: dto.petFee ?? 0,
      waitingFee: dto.waitingFee ?? 0,
      platformCommissionRate: dto.platformCommissionRate ?? 20.0,
      isActive: dto.isActive ?? true,
    });

    return this.pricingRepo.save(entity);
  }

  async findAllPricingConfigs(
    query: PricingListQueryDto,
  ): Promise<PaginatedData<PricingConfigEntity>> {
    return this.pricingRepo.findWithPagination(query);
  }

  async findOnePricingConfig(id: string): Promise<PricingConfigEntity> {
    const config = await this.pricingRepo.findOne({
      where: { id },
    });
    if (!config) throw new NotFoundException('PRICING_CONFIG_NOT_FOUND');
    return config;
  }

  async updatePricingConfig(
    id: string,
    dto: UpdatePricingConfigDto,
  ): Promise<PricingConfigEntity> {
    const config = await this.findOnePricingConfig(id);

    Object.assign(config, {
      name: dto.name ?? config.name,
      basePrice: dto.basePrice ?? config.basePrice,
      peakPrice: dto.peakPrice !== undefined ? dto.peakPrice : config.peakPrice,
      petFee: dto.petFee ?? config.petFee,
      waitingFee: dto.waitingFee ?? config.waitingFee,
      platformCommissionRate:
        dto.platformCommissionRate ?? config.platformCommissionRate,
      isActive: dto.isActive !== undefined ? dto.isActive : config.isActive,
    });

    return this.pricingRepo.save(config);
  }

  async removePricingConfig(id: string): Promise<void> {
    const config = await this.findOnePricingConfig(id);
    await this.pricingRepo.remove(config);
  }

  async createPeakDayConfig(
    dto: CreatePeakDayConfigDto,
  ): Promise<PeakDayConfigEntity> {
    const startAt = dto.startAt ? new Date(dto.startAt) : null;
    const endAt = dto.endAt ? new Date(dto.endAt) : null;
    const startTime = this.normalizeTime(dto.startTime);
    const endTime = this.normalizeTime(dto.endTime);

    this.validatePeakRange(startAt, endAt, startTime, endTime);
    if (dto.isActive !== false) {
      await this.assertNoDuplicatePeakRange({
        startAt,
        endAt,
        startTime,
        endTime,
      });
    }

    const entity = this.peakDayRepo.create({
      name: dto.name,
      startAt,
      endAt,
      startTime,
      endTime,
      peakRate: dto.peakRate,
      isActive: dto.isActive ?? true,
    });

    return this.peakDayRepo.save(entity);
  }

  async findAllPeakDayConfigs(
    onlyActive?: boolean,
  ): Promise<PeakDayConfigEntity[]> {
    return this.peakDayRepo.findAll(onlyActive);
  }

  async findOnePeakDayConfig(id: string): Promise<PeakDayConfigEntity> {
    const config = await this.peakDayRepo.findOne({ where: { id } });
    if (!config) throw new NotFoundException('PEAK_DAY_CONFIG_NOT_FOUND');
    return config;
  }

  async updatePeakDayConfig(
    id: string,
    dto: UpdatePeakDayConfigDto,
  ): Promise<PeakDayConfigEntity> {
    const config = await this.findOnePeakDayConfig(id);

    const startAt =
      dto.startAt !== undefined
        ? dto.startAt
          ? new Date(dto.startAt)
          : null
        : (config.startAt ?? null);
    const endAt =
      dto.endAt !== undefined
        ? dto.endAt
          ? new Date(dto.endAt)
          : null
        : (config.endAt ?? null);
    const startTime =
      dto.startTime !== undefined
        ? this.normalizeTime(dto.startTime)
        : (config.startTime ?? null);
    const endTime =
      dto.endTime !== undefined
        ? this.normalizeTime(dto.endTime)
        : (config.endTime ?? null);
    const isActive =
      dto.isActive !== undefined ? dto.isActive : config.isActive;

    this.validatePeakRange(startAt, endAt, startTime, endTime);
    if (isActive) {
      await this.assertNoDuplicatePeakRange(
        { startAt, endAt, startTime, endTime },
        id,
      );
    }

    Object.assign(config, {
      name: dto.name ?? config.name,
      startAt,
      endAt,
      startTime,
      endTime,
      peakRate: dto.peakRate ?? config.peakRate,
      isActive,
    });

    return this.peakDayRepo.save(config);
  }

  async removePeakDayConfig(id: string): Promise<void> {
    const config = await this.findOnePeakDayConfig(id);
    await this.peakDayRepo.remove(config);
  }

  async calculateBookingPrice(
    manager: EntityManager,
    input: CalculateBookingPriceInput,
  ): Promise<BookingPriceResult> {
    if (!input.packageId) {
      throw new BadRequestException('Mã gói dịch vụ (packageId) là bắt buộc');
    }

    const packageRepository = manager.getRepository(ServicePackageEntity);
    const subServiceRepository = manager.getRepository(SubServiceEntity);

    const servicePackage = await packageRepository.findOne({
      where: { id: input.packageId, isActive: true },
      relations: ['coverageAreas'],
    });

    if (!servicePackage) {
      throw new NotFoundException(
        'Không tìm thấy gói dịch vụ hoặc gói đã ngừng hoạt động',
      );
    }

    let subServices: SubServiceEntity[] = [];
    if (input.subServiceIds && input.subServiceIds.length > 0) {
      subServices = await subServiceRepository.find({
        where: { id: In(input.subServiceIds), isActive: true },
        relations: ['pricingConfig'],
      });
    }

    if (subServices.length === 0) {
      throw new BadRequestException(
        'Vui lòng chọn ít nhất một dịch vụ con hợp lệ',
      );
    }

    const durationHours = subServices.reduce(
      (sum, sub) => sum + toNumber(sub.durationHours),
      0,
    );

    if (durationHours > toNumber(servicePackage.maxHours)) {
      throw new BadRequestException(
        `Tổng thời lượng công việc (${durationHours}h) vượt quá số giờ tối đa cho phép của gói (${servicePackage.maxHours}h)`,
      );
    }

    let basePrice = 0;
    let matchedTierId: string | undefined;

    // 1. Tải các pricing tiers hoạt động của package này
    const pricingTierRepo = manager.getRepository(PricingTierEntity);
    const activeTiers = await pricingTierRepo.find({
      where: { packageId: servicePackage.id, isActive: true },
      order: { sortOrder: 'ASC' },
    });

    if (activeTiers.length > 0) {
      let matchedTier: PricingTierEntity | null = null;

      // Nếu truyền thẳng ID mức giá lên
      if (input.pricingTierId) {
        matchedTier = activeTiers.find((t) => t.id === input.pricingTierId) ?? null;
      }

      // Nếu không khớp hoặc không gửi, tự động tìm dựa trên Pricing Mode
      if (!matchedTier) {
        const mode = servicePackage.pricingMode ?? PricingMode.HOURLY;
        if (mode === PricingMode.HOURLY) {
          // Khớp khoảng giờ
          matchedTier = activeTiers.find(
            (t) =>
              t.pricingMode === PricingMode.HOURLY &&
              durationHours >= toNumber(t.minHours) &&
              durationHours <= toNumber(t.maxHours),
          ) ?? null;
        } else if (mode === PricingMode.AREA_HOURLY) {
          // Khớp khoảng diện tích
          const area = input.areaM2 ?? 0;
          matchedTier = activeTiers.find((t) => {
            if (t.pricingMode !== PricingMode.AREA_HOURLY) return false;
            const minArea = t.areaMinM2 ? toNumber(t.areaMinM2) : 0;
            const maxArea = t.areaMaxM2 ? toNumber(t.areaMaxM2) : Infinity;
            return area >= minArea && area <= maxArea;
          }) ?? null;
        } else if (mode === PricingMode.FIXED) {
          // Lấy cái đầu tiên hoạt động
          matchedTier = activeTiers.find((t) => t.pricingMode === PricingMode.FIXED) ?? null;
        }
      }

      if (matchedTier) {
        matchedTierId = matchedTier.id;
        if (matchedTier.pricingMode === PricingMode.HOURLY) {
          basePrice = toNumber(matchedTier.pricePerHour) * durationHours;
        } else if (matchedTier.pricingMode === PricingMode.AREA_HOURLY) {
          basePrice = toNumber(matchedTier.pricePerM2) * (input.areaM2 ?? 0) * durationHours;
        } else if (matchedTier.pricingMode === PricingMode.FIXED) {
          basePrice = toNumber(matchedTier.fixedPrice);
        }
      }
    }

    // Fallback: Nếu không tìm thấy Pricing Tier, tính theo tổng giá trị mặc định của subServices như cũ
    if (basePrice === 0) {
      for (const sub of subServices) {
        const pricing = sub.pricingConfig;
        if (!pricing || !pricing.isActive) {
          throw new NotFoundException(
            `Không tìm thấy cấu hình giá hoạt động cho dịch vụ con ${sub.name}`,
          );
        }
        basePrice += toNumber(pricing.basePrice);
      }
    }

    // Phụ phí đêm/sớm
    let addonPrice = toNumber(servicePackage.toolFee);
    const startTime = input.scheduledStartTime;
    if (startTime) {
      const hour = parseInt(startTime.split(':')[0], 10);
      if (hour < 7 || hour >= 19) {
        addonPrice += toNumber(servicePackage.nightSurcharge);
      }
    }

    // 2. Tính tỷ lệ cao điểm & ngày lễ tết (Peak Days)
    const basePeakRate = toNumber(servicePackage.peakRatePercent) / 100;
    let holidayPeakRate = 0;
    const peakDays = await this.peakDayRepo.findAll(true);

    if (peakDays.length > 0 && input.scheduledStart) {
      const bookingDate = new Date(input.scheduledStart);
      const bookingTimeStr = input.scheduledStartTime;

      const matchingPeakDays = peakDays.filter((pd) => {
        // Kiểm tra ngày
        if (pd.startAt && bookingDate < new Date(pd.startAt)) return false;
        if (pd.endAt && bookingDate > new Date(pd.endAt)) return false;

        // Kiểm tra giờ
        if (pd.startTime && pd.endTime && bookingTimeStr) {
          const t = bookingTimeStr.slice(0, 5);
          const start = pd.startTime.slice(0, 5);
          const end = pd.endTime.slice(0, 5);

          if (start < end) {
            if (t < start || t > end) return false;
          } else {
            if (t < start && t > end) return false;
          }
        }
        return true;
      });

      if (matchingPeakDays.length > 0) {
        holidayPeakRate = Math.max(...matchingPeakDays.map((pd) => toNumber(pd.peakRate)), 0);
      }
    }

    const totalPeakRate = basePeakRate + holidayPeakRate;
    const peakFee = totalPeakRate > 0 ? Math.round(basePrice * totalPeakRate) : 0;
    const petFee = input.hasPet ? toNumber(servicePackage.petSurcharge) : 0;
    const waitingFee = 0;
    const subtotal = basePrice + addonPrice + peakFee + petFee + waitingFee;

    const voucher: VoucherEntity | null = input.voucherCode
      ? await this.voucherService.findValidForBooking(
          manager,
          input.voucherCode,
          input.subServiceIds || [],
          subtotal,
        )
      : null;
    const discountAmount: number = voucher
      ? this.voucherService.calculateDiscount(voucher, subtotal)
      : 0;
    const totalPrice: number = Math.max(subtotal - discountAmount, 0);

    return {
      package: servicePackage,
      subServices,
      durationHours,
      basePrice,
      addonPrice,
      peakFee,
      petFee,
      waitingFee,
      subtotal,
      discountAmount,
      totalPrice,
      voucher,
      pricingTierId: matchedTierId,
    };
  }

  getServiceById(
    manager: EntityManager,
    serviceId: string,
  ): Promise<SubServiceEntity | null> {
    return manager.getRepository(SubServiceEntity).findOne({
      where: { id: serviceId },
    });
  }

  getServicesByIds(
    manager: EntityManager,
    serviceIds: string[],
  ): Promise<SubServiceEntity[]> {
    if (!serviceIds.length) {
      return Promise.resolve([]);
    }

    return manager.getRepository(SubServiceEntity).find({
      where: { id: In(serviceIds) },
    });
  }

  async getServiceSummaryById(
    manager: EntityManager,
    serviceId: string,
  ): Promise<ServiceSummary> {
    const service = await this.getServiceById(manager, serviceId);
    if (service) {
      return {
        id: service.id,
        name: service.name,
        description: service.description,
      };
    }

    return {
      id: serviceId,
      name: 'Dịch vụ đã ngừng hoạt động',
      description: null,
    };
  }

  async getPlatformCommissionRateByServiceId(
    manager: EntityManager,
    serviceId: string,
  ): Promise<number> {
    const service = await manager
      .getRepository(SubServiceEntity)
      .findOne({ where: { id: serviceId }, relations: ['pricingConfig'] });

    if (!service || !service.pricingConfig || !service.pricingConfig.isActive) {
      throw new NotFoundException(
        'Không tìm thấy cấu hình hoa hồng dịch vụ con',
      );
    }

    return toNumber(service.pricingConfig.platformCommissionRate);
  }

  private findBookingService(
    serviceRepository: Repository<SubServiceEntity>,
    durationHours?: number,
    serviceId?: string,
  ): Promise<SubServiceEntity | null> {
    if (serviceId) {
      return serviceRepository.findOne({
        where: { id: serviceId, isActive: true },
        relations: ['pricingConfig'],
      });
    }
    if (durationHours === undefined) {
      return Promise.resolve(null);
    }

    return serviceRepository
      .createQueryBuilder('service')
      .leftJoinAndSelect('service.pricingConfig', 'pricingConfig')
      .where('service.isActive = true')
      .andWhere('service.durationHours = :durationHours', {
        durationHours,
      })
      .orderBy('service.createdAt', 'ASC')
      .getOne();
  }

  private validatePeakRange(
    startAt: Date | null,
    endAt: Date | null,
    startTime: string | null,
    endTime: string | null,
  ): void {
    if (!startAt && !endAt && !startTime && !endTime) {
      throw new BadRequestException(
        'PEAK_RANGE_REQUIRED: Provide a date range or daily time range',
      );
    }
    if (startAt && endAt && startAt >= endAt) {
      throw new BadRequestException(
        'INVALID_DATE_RANGE: startAt must be before endAt',
      );
    }
    if (startTime && endTime && startTime === endTime) {
      throw new BadRequestException(
        'INVALID_TIME_RANGE: startTime and endTime must be different',
      );
    }
  }

  private async assertNoDuplicatePeakRange(
    range: {
      startAt: Date | null;
      endAt: Date | null;
      startTime: string | null;
      endTime: string | null;
    },
    excludeId?: string,
  ): Promise<void> {
    const configs = await this.peakDayRepo.findAll(true);
    const duplicate = configs.find(
      (config) =>
        config.id !== excludeId &&
        this.sameDate(range.startAt, config.startAt ?? null) &&
        this.sameDate(range.endAt, config.endAt ?? null) &&
        range.startTime === (config.startTime ?? null) &&
        range.endTime === (config.endTime ?? null),
    );

    if (duplicate) {
      throw new ConflictException(
        `PEAK_DAY_CONFIG_EXISTS: Duplicates existing peak period "${duplicate.name}"`,
      );
    }
  }

  private sameDate(first: Date | null, second: Date | null): boolean {
    if (!first || !second) {
      return first === second;
    }

    return first.getTime() === second.getTime();
  }

  private normalizeTime(value?: string | null): string | null {
    if (!value) {
      return null;
    }

    return value.length === 5 ? `${value}:00` : value;
  }

  private isDefaultPeakHour(scheduledStartTime: string): boolean {
    const [hour, minute = 0] = scheduledStartTime.split(':').map(Number);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
      return false;
    }

    return hour * 60 + minute >= 18 * 60;
  }
}
