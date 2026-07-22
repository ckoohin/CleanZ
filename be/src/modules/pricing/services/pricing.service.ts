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
import { ServiceAddonEntity } from 'src/modules/service/entity/service-addon.entity';
import { toNumber } from 'src/common/helpers/number.helper';
import {
  createVietnamDateTime,
  formatVietnamDate,
  formatVietnamTime,
} from 'src/common/helpers/vietnam-time.helper';
import { ServicePeakHourEntity } from 'src/modules/service/entity/service-peak-hour.entity';
import { VouchersService } from 'src/modules/voucher/services/vouchers.service';
import { SystemConfigService } from 'src/modules/system-config/system-config.service';
import { SYSTEM_CONFIG_KEYS } from 'src/modules/system-config/system-config.keys';
import { VoucherEntity } from 'src/modules/voucher/entity/voucher.entity';

export interface CalculateBookingPriceInput {
  packageId?: string;
  subServiceIds?: string[];
  addonIds?: string[];
  durationHours?: number;
  areaM2?: number;
  pricingTierId?: string;
  scheduledStart: Date;
  scheduledStartTime: string;
  hasPet: boolean;
  voucherCode?: string;
  customerId?: string;
  currentBookingId?: string;
}

export interface ServiceSummary {
  id: string;
  name: string;
  description?: string | null;
}

export interface PeakBreakdownItem {
  from: string;
  to: string;
  hours: number;
  rate: number;
  fee: number;
}

interface PeakInterval {
  start: number;
  end: number;
  rate: number;
}

export interface BookingPriceResult {
  package: ServicePackageEntity;
  subServices: SubServiceEntity[];
  addons: ServiceAddonEntity[];
  durationHours: number;
  basePrice: number;
  addonPrice: number;
  peakFee: number;
  peakBreakdown: PeakBreakdownItem[];
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
    const addonRepository = manager.getRepository(ServiceAddonEntity);
    const pricingTierRepo = manager.getRepository(PricingTierEntity);

    const uniqueAddonIds = input.addonIds ? [...new Set(input.addonIds)] : [];

    const [servicePackage, subServices, addons, activeTiers] =
      await Promise.all([
        packageRepository.findOne({
          where: { id: input.packageId, isActive: true },
          relations: ['coverageAreas', 'peakHours'],
        }),
        input.subServiceIds?.length
          ? subServiceRepository.find({
              where: { id: In(input.subServiceIds), isActive: true },
              relations: ['pricingConfig'],
            })
          : Promise.resolve([] as SubServiceEntity[]),
        uniqueAddonIds.length
          ? addonRepository.find({
              where: uniqueAddonIds.map((id) => ({
                id,
                packageId: input.packageId,
                isActive: true,
              })),
            })
          : Promise.resolve([] as ServiceAddonEntity[]),
        pricingTierRepo.find({
          where: { packageId: input.packageId, isActive: true },
          order: { sortOrder: 'ASC' },
        }),
      ]);

    if (!servicePackage) {
      throw new NotFoundException(
        'Không tìm thấy gói dịch vụ hoặc gói đã ngừng hoạt động',
      );
    }

    if (uniqueAddonIds.length > 0 && addons.length !== uniqueAddonIds.length) {
      throw new BadRequestException(
        'Một hoặc nhiều dịch vụ thêm không hợp lệ hoặc không thuộc gói dịch vụ đã chọn',
      );
    }

    let durationHours =
      input.durationHours && input.durationHours > 0
        ? toNumber(input.durationHours)
        : 0;
    const subServicesDurationHours = subServices.reduce(
      (sum, sub) => sum + toNumber(sub.durationHours),
      0,
    );
    if (durationHours <= 0) durationHours = subServicesDurationHours;

    let basePrice = 0;
    let matchedTierId: string | undefined;

    // 1. Tải các pricing tiers hoạt động của package này

    if (activeTiers.length > 0) {
      let matchedTier: PricingTierEntity | null = null;

      // Nếu truyền thẳng ID mức giá lên
      if (input.pricingTierId) {
        matchedTier =
          activeTiers.find((t) => t.id === input.pricingTierId) ?? null;
      }

      // Nếu không khớp hoặc không gửi, tự động tìm dựa trên Pricing Mode
      if (!matchedTier) {
        const mode = servicePackage.pricingMode ?? PricingMode.HOURLY;
        if (mode === PricingMode.HOURLY) {
          // Khớp khoảng giờ
          matchedTier =
            activeTiers.find(
              (t) =>
                t.pricingMode === PricingMode.HOURLY &&
                durationHours >= toNumber(t.minHours) &&
                durationHours <= toNumber(t.maxHours),
            ) ?? null;
        } else if (mode === PricingMode.AREA_HOURLY) {
          // Khớp khoảng diện tích
          const area = input.areaM2 ?? 0;
          matchedTier =
            activeTiers.find((t) => {
              if (t.pricingMode !== PricingMode.AREA_HOURLY) return false;
              const minArea = t.areaMinM2 ? toNumber(t.areaMinM2) : 0;
              const maxArea = t.areaMaxM2 ? toNumber(t.areaMaxM2) : Infinity;
              return area >= minArea && area <= maxArea;
            }) ?? null;
        } else if (mode === PricingMode.FIXED) {
          // Lấy cái đầu tiên hoạt động
          matchedTier =
            activeTiers.find((t) => t.pricingMode === PricingMode.FIXED) ??
            null;
        }
      }

      if (matchedTier) {
        matchedTierId = matchedTier.id;
        if (durationHours <= 0) {
          durationHours =
            toNumber(matchedTier.defaultHours) ||
            toNumber(matchedTier.minHours) ||
            1;
        }
        if (
          matchedTier.pricingMode === PricingMode.HOURLY &&
          (durationHours < toNumber(matchedTier.minHours) ||
            durationHours > toNumber(matchedTier.maxHours))
        ) {
          throw new BadRequestException(
            `Số giờ làm việc (${durationHours}h) không nằm trong gói giờ ${matchedTier.name}`,
          );
        }
        if (matchedTier.pricingMode === PricingMode.HOURLY) {
          basePrice = toNumber(matchedTier.pricePerHour) * durationHours;
        } else if (matchedTier.pricingMode === PricingMode.AREA_HOURLY) {
          if (!input.areaM2 || input.areaM2 <= 0) {
            throw new BadRequestException(
              'Vui lòng nhập diện tích nhà để tính giá gói này',
            );
          }
          basePrice =
            toNumber(matchedTier.pricePerM2) *
            (input.areaM2 ?? 0) *
            durationHours;
        } else if (matchedTier.pricingMode === PricingMode.FIXED) {
          basePrice = toNumber(matchedTier.fixedPrice);
        }
      }
    }

    // Fallback: Nếu không tìm thấy Pricing Tier, tính theo tổng giá trị mặc định của subServices như cũ
    if (basePrice === 0) {
      if (durationHours > 0 && toNumber(servicePackage.baseHourlyRate) > 0) {
        basePrice = toNumber(servicePackage.baseHourlyRate) * durationHours;
      } else if (subServices.length === 0) {
        throw new BadRequestException(
          'Vui lòng chọn gói giờ hoặc ít nhất một dịch vụ con hợp lệ',
        );
      } else {
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
    }

    // Dịch vụ thêm có thể cấu hình thời gian phát sinh (durationMinutes) — cộng
    // vào tổng thời lượng công việc thực tế trước khi so với maxHours của gói,
    // tránh trường hợp tổng giờ thực tế (giờ chính + giờ addon) vượt giới hạn
    // gói mà hệ thống không phát hiện được.
    const addonDurationHours = addons.reduce(
      (sum, addon) => sum + toNumber(addon.durationMinutes ?? 0) / 60,
      0,
    );
    durationHours += addonDurationHours;

    if (durationHours > toNumber(servicePackage.maxHours)) {
      const message =
        addonDurationHours > 0
          ? `Tổng thời lượng công việc (${durationHours}h, gồm ${
              durationHours - addonDurationHours
            }h công việc chính + ${addonDurationHours}h dịch vụ thêm) vượt quá số giờ tối đa cho phép của gói (${servicePackage.maxHours}h)`
          : `Tổng thời lượng công việc (${durationHours}h) vượt quá số giờ tối đa cho phép của gói (${servicePackage.maxHours}h)`;
      throw new BadRequestException(message);
    }

    // Dịch vụ thêm / phụ phí đêm/sớm
    let addonPrice = toNumber(servicePackage.toolFee);
    addonPrice += addons.reduce((sum, addon) => sum + toNumber(addon.price), 0);
    if (
      matchedTierId ||
      (durationHours > 0 && toNumber(servicePackage.baseHourlyRate) > 0)
    ) {
      for (const sub of subServices) {
        const pricing = sub.pricingConfig;
        if (!pricing || !pricing.isActive) {
          throw new NotFoundException(
            `Không tìm thấy cấu hình giá hoạt động cho dịch vụ thêm ${sub.name}`,
          );
        }
        addonPrice += toNumber(pricing.basePrice);
      }
    }
    // 2. Tính phí cao điểm — chỉ theo khung giờ cao điểm config trong gói dịch vụ
    // (service_peak_hours), prorate theo từng giờ trùng khung: giờ thường tính giá
    // thường, giờ nào trùng khung cao điểm mới tính thêm phí cao điểm
    const packagePeakHours = (servicePackage.peakHours || []).filter(
      (peakHour) => peakHour.isActive,
    );
    const { peakFee, peakBreakdown } = this.calculatePeakFee(
      input.scheduledStart,
      durationHours,
      basePrice,
      packagePeakHours,
    );
    const petFee = input.hasPet ? toNumber(servicePackage.petSurcharge) : 0;
    const waitingFee = 0;
    const subtotal = basePrice + addonPrice + peakFee + petFee + waitingFee;

    const voucher: VoucherEntity | null = input.voucherCode
      ? await this.voucherService.findValidForBooking(
          manager,
          input.voucherCode,
          input.customerId ?? '',
          input.packageId,
          subtotal,
          input.currentBookingId,
        )
      : null;
    const discountAmount: number = voucher
      ? this.voucherService.calculateDiscount(voucher, subtotal)
      : 0;
    const totalPrice: number = Math.max(subtotal - discountAmount, 0);

    return {
      package: servicePackage,
      subServices,
      addons,
      durationHours,
      basePrice,
      addonPrice,
      peakFee,
      peakBreakdown,
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

  async getPlatformCommissionRate(manager: EntityManager): Promise<number> {
    return this.systemConfigService.getRegisteredNumber(
      manager,
      SYSTEM_CONFIG_KEYS.PLATFORM_COMMISSION_RATE_PERCENT,
    );
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

  /**
   * Tính phí cao điểm prorate theo thời gian thực tế trùng khung peak của gói.
   * effectiveHourlyRate = basePrice / durationHours (đồng nhất cho mọi pricing mode);
   * peakFee = Σ (số giờ trùng khung i × effectiveHourlyRate × rate khung i).
   * Rate mỗi đoạn = max(multiplier-1) của các khung service_peak_hours trùng đoạn đó.
   */
  private calculatePeakFee(
    scheduledStart: Date | undefined,
    durationHours: number,
    basePrice: number,
    peakHours: ServicePeakHourEntity[],
  ): { peakFee: number; peakBreakdown: PeakBreakdownItem[] } {
    if (!scheduledStart || basePrice <= 0 || peakHours.length === 0) {
      return { peakFee: 0, peakBreakdown: [] };
    }

    const bookingStartMs = new Date(scheduledStart).getTime();
    if (Number.isNaN(bookingStartMs)) {
      return { peakFee: 0, peakBreakdown: [] };
    }
    const bookingEndMs =
      bookingStartMs + Math.max(durationHours, 0) * 60 * 60 * 1000;

    const intervals = this.buildPeakIntervals(
      bookingStartMs,
      Math.max(bookingEndMs, bookingStartMs + 1),
      peakHours,
    );
    if (intervals.length === 0) {
      return { peakFee: 0, peakBreakdown: [] };
    }

    // Không có thời lượng (không xảy ra với flow hiện tại): giữ hành vi cũ,
    // áp rate tại thời điểm bắt đầu lên toàn bộ basePrice
    if (durationHours <= 0) {
      const rate = this.peakRateAt(bookingStartMs, intervals);
      const fee = rate > 0 ? Math.round(basePrice * rate) : 0;
      if (fee <= 0) return { peakFee: 0, peakBreakdown: [] };
      const label = this.toVietnamDateTimeLabel(bookingStartMs);
      return {
        peakFee: fee,
        peakBreakdown: [{ from: label, to: label, hours: 0, rate, fee }],
      };
    }

    // Cắt khoảng booking thành các đoạn tại mọi mốc biên của khung peak
    const boundarySet = new Set<number>([bookingStartMs, bookingEndMs]);
    for (const interval of intervals) {
      boundarySet.add(interval.start);
      boundarySet.add(interval.end);
    }
    const boundaries = [...boundarySet].sort((a, b) => a - b);

    const segments: Array<{ start: number; end: number; rate: number }> = [];
    for (let i = 0; i < boundaries.length - 1; i += 1) {
      const start = boundaries[i];
      const end = boundaries[i + 1];
      if (end <= start) continue;
      const rate = this.peakRateAt((start + end) / 2, intervals);
      const last = segments[segments.length - 1];
      if (last && last.rate === rate && last.end === start) {
        last.end = end;
      } else {
        segments.push({ start, end, rate });
      }
    }

    const hourlyRate = basePrice / durationHours;
    let peakFee = 0;
    const peakBreakdown: PeakBreakdownItem[] = [];
    for (const segment of segments) {
      if (segment.rate <= 0) continue;
      const hours = (segment.end - segment.start) / (60 * 60 * 1000);
      const fee = Math.round(hourlyRate * hours * segment.rate);
      if (fee <= 0) continue;
      peakFee += fee;
      peakBreakdown.push({
        from: this.toVietnamDateTimeLabel(segment.start),
        to: this.toVietnamDateTimeLabel(segment.end),
        hours: Math.round(hours * 100) / 100,
        rate: segment.rate,
        fee,
      });
    }

    return { peakFee, peakBreakdown };
  }

  /**
   * Chuyển các khung giờ cao điểm của gói (theo dayOfWeek/khung giờ) thành các
   * khoảng datetime cụ thể đã clip vào khoảng booking. Khung peak tính theo [start, end).
   */
  private buildPeakIntervals(
    bookingStartMs: number,
    bookingEndMs: number,
    peakHours: ServicePeakHourEntity[],
  ): PeakInterval[] {
    const dayMs = 24 * 60 * 60 * 1000;
    const minuteMs = 60 * 1000;
    const intervals: PeakInterval[] = [];

    // Sinh khung theo từng ngày (VN) booking chạm tới; lùi 1 ngày để bắt khung
    // overnight của ngày hôm trước tràn sang (vd. 22:00–02:00)
    const firstDayStart = createVietnamDateTime(
      this.toDateKey(new Date(bookingStartMs - dayMs)),
      '00:00',
    ).getTime();

    for (
      let dayStart = firstDayStart;
      dayStart < bookingEndMs;
      dayStart += dayMs
    ) {
      const noon = new Date(dayStart + dayMs / 2);
      const dayKey = this.toDateKey(noon);
      const dayOfWeek = this.getVietnamDayOfWeek(noon);

      for (const peakHour of peakHours) {
        if (!this.isPeakDayMatch(peakHour.dayOfWeek, dayOfWeek)) continue;
        if (peakHour.startDate && dayKey < this.toDateKey(peakHour.startDate)) {
          continue;
        }
        if (peakHour.endDate && dayKey > this.toDateKey(peakHour.endDate)) {
          continue;
        }

        const startMin = this.timeToMinutes(peakHour.startHour);
        const endMin = this.timeToMinutes(peakHour.endHour);
        if (startMin === endMin) continue;
        const start = dayStart + startMin * minuteMs;
        const end =
          endMin > startMin
            ? dayStart + endMin * minuteMs
            : dayStart + dayMs + endMin * minuteMs; // khung vắt qua nửa đêm

        const clippedStart = Math.max(start, bookingStartMs);
        const clippedEnd = Math.min(end, bookingEndMs);
        // Làm tròn rate 4 chữ số để tránh sai số floating point (vd. 1.3 - 1)
        const rate =
          Math.round(Math.max(toNumber(peakHour.multiplier) - 1, 0) * 10000) /
          10000;
        if (rate > 0 && clippedStart < clippedEnd) {
          intervals.push({ start: clippedStart, end: clippedEnd, rate });
        }
      }
    }

    return intervals;
  }

  private peakRateAt(timeMs: number, intervals: PeakInterval[]): number {
    let rate = 0;
    for (const interval of intervals) {
      if (timeMs < interval.start || timeMs >= interval.end) continue;
      rate = Math.max(rate, interval.rate);
    }
    return rate;
  }

  private toVietnamDateTimeLabel(timeMs: number): string {
    const date = new Date(timeMs);
    return `${formatVietnamDate(date)} ${formatVietnamTime(date)}`;
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

  private toDateKey(date: Date): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const values = Object.fromEntries(
      parts.map((part) => [part.type, part.value]),
    );
    return `${values.year}-${values.month}-${values.day}`;
  }

  private getVietnamDayOfWeek(date: Date): number {
    const dateKey = this.toDateKey(date);
    const parsed = new Date(`${dateKey}T12:00:00+07:00`);
    if (Number.isNaN(parsed.getTime())) return -1;
    return parsed.getUTCDay();
  }

  private isPeakDayMatch(
    rawPeakDay: number | string,
    bookingDayOfWeek: number,
  ): boolean {
    const peakDay = Number(rawPeakDay);
    if (!Number.isFinite(peakDay)) return false;
    if (peakDay === 7) return true;
    return peakDay === bookingDayOfWeek;
  }

  private normalizeTime(value?: string | null): string | null {
    if (!value) {
      return null;
    }

    return value.length === 5 ? `${value}:00` : value;
  }

  private timeToMinutes(time: string): number {
    const [hour = '0', minute = '0'] = time.slice(0, 5).split(':');
    return Number(hour) * 60 + Number(minute);
  }
}
