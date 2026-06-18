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

@Injectable()
export class PricingService {
  constructor(
    private readonly pricingRepo: PricingConfigRepository,
    private readonly peakDayRepo: PeakDayConfigRepository,
    private readonly serviceRepo: ServiceRepository,
  ) {}

  async createPricingConfig(
    dto: CreatePricingConfigDto,
  ): Promise<PricingConfigEntity> {
    const service = await this.serviceRepo.findOne({
      where: { id: dto.serviceId },
    });
    if (!service) throw new NotFoundException('SERVICE_NOT_FOUND');

    const duplicate = await this.pricingRepo.findDuplicate(
      dto.serviceId,
      dto.provinceCode,
      dto.durationHours,
    );
    if (duplicate) {
      throw new ConflictException(
        'PRICING_CONFIG_EXISTS: A pricing config with this service/province/duration already exists.',
      );
    }

    const entity = this.pricingRepo.create({
      serviceId: dto.serviceId,
      provinceCode: dto.provinceCode,
      durationHours: dto.durationHours,
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
      relations: ['service'],
    });
    if (!config) throw new NotFoundException('PRICING_CONFIG_NOT_FOUND');
    return config;
  }

  async updatePricingConfig(
    id: string,
    dto: UpdatePricingConfigDto,
  ): Promise<PricingConfigEntity> {
    const config = await this.findOnePricingConfig(id);

    const newServiceId = dto.serviceId ?? config.serviceId;
    const newProvince = dto.provinceCode ?? config.provinceCode;
    const newDuration = dto.durationHours ?? config.durationHours;

    if (dto.serviceId || dto.provinceCode || dto.durationHours) {
      const duplicate = await this.pricingRepo.findDuplicate(
        newServiceId,
        newProvince,
        newDuration,
        id,
      );
      if (duplicate) {
        throw new ConflictException('PRICING_CONFIG_EXISTS');
      }
    }

    Object.assign(config, {
      serviceId: newServiceId,
      provinceCode: newProvince,
      durationHours: newDuration,
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
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);

    if (startAt >= endAt) {
      throw new BadRequestException(
        'INVALID_DATE_RANGE: startAt must be before endAt',
      );
    }

    const overlap = await this.peakDayRepo.findOverlapping(startAt, endAt);
    if (overlap) {
      throw new ConflictException(
        `PEAK_DAY_OVERLAP: Conflicts with existing peak period "${overlap.name}"`,
      );
    }

    const entity = this.peakDayRepo.create({
      name: dto.name,
      startAt,
      endAt,
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

    const startAt = dto.startAt ? new Date(dto.startAt) : config.startAt;
    const endAt = dto.endAt ? new Date(dto.endAt) : config.endAt;

    if (startAt >= endAt) {
      throw new BadRequestException('INVALID_DATE_RANGE');
    }

    if (dto.startAt || dto.endAt) {
      const overlap = await this.peakDayRepo.findOverlapping(
        startAt,
        endAt,
        id,
      );
      if (overlap) {
        throw new ConflictException(
          `PEAK_DAY_OVERLAP: Conflicts with existing peak period "${overlap.name}"`,
        );
      }
    }

    Object.assign(config, {
      name: dto.name ?? config.name,
      startAt,
      endAt,
      peakRate: dto.peakRate ?? config.peakRate,
      isActive: dto.isActive !== undefined ? dto.isActive : config.isActive,
    });

    return this.peakDayRepo.save(config);
  }

  async removePeakDayConfig(id: string): Promise<void> {
    const config = await this.findOnePeakDayConfig(id);
    await this.peakDayRepo.remove(config);
  }
}
