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
import { PaginatedData } from '../../../common/helpers/response.interface';
import { CreatePricingConfigDto } from '../dto/create-pricing.dto';
import { PricingListQueryDto } from '../dto/list-query-pricing.dto';
import { UpdatePricingConfigDto } from '../dto/update-pricing.dto';
import { CreatePeakDayConfigDto } from '../dto/create-peak-day.dto';
import { UpdatePeakDayConfigDto } from '../dto/update-peak-day.dto';
import { EntityManager, In, Repository } from 'typeorm';
import { ServiceEntity } from 'src/modules/service/entity/service.entity';
import { toNumber } from 'src/common/helpers/number.helper';
import { VouchersService } from 'src/modules/voucher/services/vouchers.service';
import { SystemConfigService } from 'src/modules/system-config/system-config.service';
import { VoucherEntity } from 'src/modules/voucher/entity/voucher.entity';

export interface CalculateBookingPriceInput {
  serviceId?: string;
  durationHours?: number;
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
  service: ServiceEntity;
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
    const serviceRepository = manager.getRepository(ServiceEntity);

    const service = await this.findBookingService(
      serviceRepository,
      input.durationHours,
      input.serviceId,
    );
    if (!service) {
      throw new NotFoundException(
        'Không tìm thấy gói dịch vụ phù hợp hoặc gói đã ngừng hoạt động',
      );
    }
    const durationHours = toNumber(service.baseDurationHours);
    if (!Number.isFinite(durationHours) || durationHours <= 0) {
      throw new NotFoundException(
        `Dịch vụ ${service.name} chưa được cấu hình thời lượng`,
      );
    }

    const pricing = service.pricingConfig;
    if (!pricing || !pricing.isActive) {
      throw new NotFoundException(
        `Không tìm thấy cấu hình giá cho dịch vụ ${service.name} hoặc cấu hình đã bị vô hiệu hóa`,
      );
    }

    const basePrice = toNumber(pricing.basePrice);
    const peakRate = await this.systemConfigService.getPeakRateForSchedule(
      manager,
      input.scheduledStart,
      input.scheduledStartTime,
    );
    const peakFee = peakRate > 0 ? Math.round(basePrice * peakRate) : 0;
    const petFee = input.hasPet ? toNumber(pricing.petFee) : 0;
    const addonPrice = 0;
    const waitingFee = 0;
    const subtotal = basePrice + addonPrice + peakFee + petFee + waitingFee;

    const voucher: VoucherEntity | null = input.voucherCode
      ? await this.voucherService.findValidForBooking(
          manager,
          input.voucherCode,
          service.id,
          subtotal,
        )
      : null;
    const discountAmount: number = voucher
      ? this.voucherService.calculateDiscount(voucher, subtotal)
      : 0;
    const totalPrice: number = Math.max(subtotal - discountAmount, 0);

    return {
      service,
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
    };
  }

  getServiceById(
    manager: EntityManager,
    serviceId: string,
  ): Promise<ServiceEntity | null> {
    return manager.getRepository(ServiceEntity).findOne({
      where: { id: serviceId },
    });
  }

  getServicesByIds(
    manager: EntityManager,
    serviceIds: string[],
  ): Promise<ServiceEntity[]> {
    if (!serviceIds.length) {
      return Promise.resolve([]);
    }

    return manager.getRepository(ServiceEntity).find({
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
      .getRepository(ServiceEntity)
      .findOne({ where: { id: serviceId }, relations: ['pricingConfig'] });

    if (!service || !service.pricingConfig || !service.pricingConfig.isActive) {
      throw new NotFoundException('Không tìm thấy cấu hình hoa hồng dịch vụ');
    }

    return toNumber(service.pricingConfig.platformCommissionRate);
  }

  private findBookingService(
    serviceRepository: Repository<ServiceEntity>,
    durationHours?: number,
    serviceId?: string,
  ): Promise<ServiceEntity | null> {
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
      .where('service.is_active = true')
      .andWhere('service.base_duration_hours = :durationHours::numeric', {
        durationHours,
      })
      .orderBy('service.created_at', 'ASC')
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
}
