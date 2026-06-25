import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PricingTierRepository } from '../pricing.repository';
import { PricingTierEntity, PricingMode } from '../entity/pricing-tier.entity';
import { ServicePackageEntity } from '../../service/entity/service-package.entity';
import { SubServiceEntity } from '../../service/entity/sub-service.entity';
import { CreatePricingTierDto } from '../dto/create-pricing-tier.dto';
import { UpdatePricingTierDto } from '../dto/update-pricing-tier.dto';
import { CalculatePriceDto } from '../dto/calculate-price.dto';
import { toNumber } from 'src/common/helpers/number.helper';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface PriceBreakdown {
  pricingMode: PricingMode;
  areaM2?: number;
  durationHours: number;
  tierName: string;
  /** Giá gốc tính được từ tier */
  basePrice: number;
  surcharges: {
    peakFee: number;
    petFee: number;
    nightSurcharge: number;
    toolFee: number;
  };
  discountAmount: number;
  total: number;
}

export interface CalculatePriceResult {
  basePrice: number;
  peakFee: number;
  petFee: number;
  nightSurcharge: number;
  toolFee: number;
  discountAmount: number;
  totalPrice: number;
  breakdown: PriceBreakdown;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class PricingTierService {
  constructor(
    private readonly tierRepo: PricingTierRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  // ─── CRUD ──────────────────────────────────────────────────────────────────

  async create(dto: CreatePricingTierDto): Promise<PricingTierEntity> {
    // Validate package tồn tại
    const pkg = await this.dataSource
      .getRepository(ServicePackageEntity)
      .findOne({ where: { id: dto.packageId } });
    if (!pkg) throw new NotFoundException('SERVICE_PACKAGE_NOT_FOUND');

    // Validate AREA_HOURLY: areaMin < areaMax
    if (dto.pricingMode === PricingMode.AREA_HOURLY) {
      if (!dto.pricePerM2) {
        throw new BadRequestException(
          'pricePerM2 là bắt buộc khi pricingMode = AREA_HOURLY',
        );
      }
      if (
        dto.areaMinM2 !== undefined &&
        dto.areaMaxM2 !== undefined &&
        dto.areaMinM2 >= dto.areaMaxM2
      ) {
        throw new BadRequestException('areaMinM2 phải nhỏ hơn areaMaxM2');
      }
    }

    if (dto.pricingMode === PricingMode.HOURLY && !dto.pricePerHour) {
      throw new BadRequestException(
        'pricePerHour là bắt buộc khi pricingMode = HOURLY',
      );
    }
    if (dto.pricingMode === PricingMode.FIXED && !dto.fixedPrice) {
      throw new BadRequestException(
        'fixedPrice là bắt buộc khi pricingMode = FIXED',
      );
    }

    // Validate minHours < maxHours
    const minH = dto.minHours ?? 1;
    const maxH = dto.maxHours ?? 8;
    if (minH >= maxH) {
      throw new BadRequestException('minHours phải nhỏ hơn maxHours');
    }

    const entity = this.tierRepo.create({
      packageId: dto.packageId,
      name: dto.name,
      description: dto.description,
      pricingMode: dto.pricingMode,
      areaMinM2: dto.areaMinM2 ?? null,
      areaMaxM2: dto.areaMaxM2 ?? null,
      pricePerM2: dto.pricePerM2 ?? null,
      pricePerHour: dto.pricePerHour ?? null,
      fixedPrice: dto.fixedPrice ?? null,
      minHours: minH,
      maxHours: maxH,
      defaultHours: dto.defaultHours ?? null,
      sortOrder: dto.sortOrder ?? 0,
      isActive: dto.isActive ?? true,
    });

    return this.tierRepo.save(entity);
  }

  async findByPackageId(packageId: string): Promise<PricingTierEntity[]> {
    return this.tierRepo.findByPackageId(packageId);
  }

  async findActiveByPackageId(packageId: string): Promise<PricingTierEntity[]> {
    return this.tierRepo.findActiveByPackageId(packageId);
  }

  async findOne(id: string): Promise<PricingTierEntity> {
    const tier = await this.tierRepo.findOne({ where: { id } });
    if (!tier) throw new NotFoundException('PRICING_TIER_NOT_FOUND');
    return tier;
  }

  async update(
    id: string,
    dto: UpdatePricingTierDto,
  ): Promise<PricingTierEntity> {
    const tier = await this.findOne(id);
    Object.assign(tier, dto);
    return this.tierRepo.save(tier);
  }

  async remove(id: string): Promise<void> {
    const tier = await this.findOne(id);
    await this.tierRepo.remove(tier);
  }

  // ─── Tính tiền ─────────────────────────────────────────────────────────────

  async calculatePrice(dto: CalculatePriceDto): Promise<CalculatePriceResult> {
    // 1. Load tier
    const tier = await this.findOne(dto.pricingTierId);
    if (!tier.isActive) throw new BadRequestException('PRICING_TIER_INACTIVE');

    // 2. Load package để lấy phụ phí gói
    const pkg = await this.dataSource
      .getRepository(ServicePackageEntity)
      .findOne({ where: { id: dto.packageId, isActive: true } });
    if (!pkg) throw new NotFoundException('SERVICE_PACKAGE_NOT_FOUND');

    // 3. Tính BASE PRICE theo mode
    let basePrice = 0;
    const hours = dto.durationHours;

    switch (tier.pricingMode) {
      case PricingMode.AREA_HOURLY: {
        if (!dto.areaM2) {
          throw new BadRequestException(
            'areaM2 là bắt buộc với gói tính theo m²',
          );
        }
        if (tier.areaMinM2 && dto.areaM2 < toNumber(tier.areaMinM2)) {
          throw new BadRequestException(
            `Diện tích tối thiểu cho mức này là ${tier.areaMinM2}m²`,
          );
        }
        if (tier.areaMaxM2 && dto.areaM2 > toNumber(tier.areaMaxM2)) {
          throw new BadRequestException(
            `Diện tích tối đa cho mức này là ${tier.areaMaxM2}m²`,
          );
        }
        basePrice = toNumber(tier.pricePerM2) * dto.areaM2 * hours;
        break;
      }
      case PricingMode.HOURLY: {
        basePrice = toNumber(tier.pricePerHour) * hours;
        break;
      }
      case PricingMode.FIXED: {
        basePrice = toNumber(tier.fixedPrice);
        break;
      }
    }

    basePrice = Math.round(basePrice);

    // 4. Phụ phí gói
    const peakFee = dto.isPeakHour
      ? Math.round((basePrice * toNumber(pkg.peakRatePercent)) / 100)
      : 0;

    const petFee = dto.hasPet ? toNumber(pkg.petSurcharge) : 0;
    const nightSurcharge = dto.isNightShift ? toNumber(pkg.nightSurcharge) : 0;
    const toolFee = dto.needTools ? toNumber(pkg.toolFee) : 0;

    // 5. Phụ phí từ dịch vụ con được chọn (nếu có)
    let subServiceExtraFee = 0;
    if (dto.selectedSubServiceIds?.length) {
      const subSvcs = await this.dataSource
        .getRepository(SubServiceEntity)
        .find({
          where: dto.selectedSubServiceIds.map((id) => ({
            id,
            isActive: true,
          })),
          relations: ['pricingConfig'],
        });

      for (const sub of subSvcs) {
        if (dto.hasPet && sub.pricingConfig?.petFee) {
          subServiceExtraFee += toNumber(sub.pricingConfig.petFee);
        }
        if (sub.pricingConfig?.waitingFee) {
          subServiceExtraFee += toNumber(sub.pricingConfig.waitingFee);
        }
      }
    }

    const totalSurcharge =
      peakFee + petFee + nightSurcharge + toolFee + subServiceExtraFee;
    const subtotal = basePrice + totalSurcharge;
    const discountAmount = 0; // TODO: apply voucher
    const totalPrice = Math.max(subtotal - discountAmount, 0);

    return {
      basePrice,
      peakFee,
      petFee,
      nightSurcharge,
      toolFee,
      discountAmount,
      totalPrice,
      breakdown: {
        pricingMode: tier.pricingMode,
        areaM2: dto.areaM2,
        durationHours: hours,
        tierName: tier.name,
        basePrice,
        surcharges: { peakFee, petFee, nightSurcharge, toolFee },
        discountAmount,
        total: totalPrice,
      },
    };
  }
}
