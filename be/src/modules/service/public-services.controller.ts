import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PublicServiceListQueryDto } from './dto/public-service-list-query.dto';
import {
  PublicPackageListResponseDto,
  PublicPackageResponseDto,
} from './dto/public-service-response.dto';
import { CalculateCustomPriceDto } from './dto/calculate-custom-price.dto';
import { CalculateCustomPriceResponseDto } from './dto/calculate-custom-price-response.dto';
import { ServicePackagesService } from './services/service-packages.service';
import { ServicePackageEntity } from './entity/service-package.entity';
import { SubServiceEntity } from './entity/sub-service.entity';
import { Public } from '../auth/decorators/public.decorator';
import { successResponse } from 'src/common/helpers/response.helper';

@ApiTags('Services')
@Controller('services')
export class PublicServicesController {
  constructor(
    private readonly servicePackagesService: ServicePackagesService,
  ) {}

  @Post('calculate-custom-price')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Tính giá dịch vụ tự chọn nhanh (Custom Price Calculation)',
    description:
      'Tính giá dịch vụ theo số giờ linh hoạt, phân hạng thợ Cơ bản/VIP, phụ phí và mã Voucher. Không cần đăng nhập.',
  })
  @ApiBody({ type: CalculateCustomPriceDto })
  @ApiOkResponse({ type: CalculateCustomPriceResponseDto })
  async calculateCustomPrice(
    @Body() dto: CalculateCustomPriceDto,
  ) {
    const result = await this.servicePackagesService.calculateCustomPrice(dto);
    return successResponse(result, 'Tính giá dịch vụ tự chọn thành công');
  }

  @Get()
  @ApiOperation({
    summary:
      'Danh sách các gói dịch vụ khả dụng kèm theo các dịch vụ con bên trong',
    description: 'Chỉ trả các gói dịch vụ đang hoạt động.',
  })
  @ApiOkResponse({ type: PublicPackageListResponseDto })
  async findAvailableServices(
    @Query() query: PublicServiceListQueryDto,
  ): Promise<PublicPackageListResponseDto> {
    const [packages, promoPackageIds] = await Promise.all([
      this.servicePackagesService.findAvailablePackages(query.search),
      this.servicePackagesService.getPackageIdsWithActivePromo(),
    ]);

    const mappedData = packages.map((pkg) =>
      this.mapPublicPackage(pkg, promoPackageIds),
    );

    return {
      data: mappedData,
      meta: {
        total: mappedData.length,
        page: query.page || 1,
        limit: query.limit || 100,
        totalPages: 1,
      },
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Chi tiết một gói dịch vụ theo ID',
    description: 'Trả về toàn bộ thông tin của gói dịch vụ.',
  })
  @ApiOkResponse({ type: PublicPackageResponseDto })
  async findOne(@Param('id') id: string): Promise<PublicPackageResponseDto> {
    const [pkg, promoPackageIds] = await Promise.all([
      this.servicePackagesService.findPublicOne(id),
      this.servicePackagesService.getPackageIdsWithActivePromo(),
    ]);
    return this.mapPublicPackage(pkg, promoPackageIds);
  }

  private mapPublicPackage(
    pkg: ServicePackageEntity,
    promoPackageIds: Set<string>,
  ): PublicPackageResponseDto {
    return {
      id: pkg.id,
      packageCode: pkg.packageCode,
      name: pkg.name,
      iconUrl: pkg.iconUrl || null,
      maxHours: Number(pkg.maxHours),
      termsAndConditions: pkg.termsAndConditions || null,
      policyDescription: pkg.policyDescription || null,
      nightSurcharge: Number(pkg.nightSurcharge),
      petSurcharge: Number(pkg.petSurcharge),
      waitingSurcharge: Number(pkg.waitingSurcharge),
      toolFee: Number(pkg.toolFee),
      peakRatePercent: Number(pkg.peakRatePercent),
      baseHourlyRate: Number(pkg.baseHourlyRate),
      premiumHourlyRate: Number(pkg.premiumHourlyRate),
      pricingMode: pkg.pricingMode || null,
      isPopular: (pkg.durations || []).some((duration) => duration.isPopular),
      hasPromo: promoPackageIds.has(pkg.id),
      createdAt: pkg.createdAt.toISOString(),
      coverageAreas: (pkg.coverageAreas || []).map((area) => ({
        id: area.id,
        name: area.name,
      })),
      subServices: (pkg.packageSubServices || [])
        .filter((pss) => this.isBookableOptionalSubService(pss.subService))
        .map((pss) => {
          const sub = pss.subService;
          const pricing = sub.pricingConfig;
          return {
            id: sub.id,
            subServiceCode: sub.subServiceCode,
            name: sub.name,
            description: sub.description || null,
            shortDescription: sub.shortDescription || null,
            durationHours: Number(sub.durationHours),
            thumbnailUrl: sub.thumbnailUrl || null,
            galleryUrls: sub.galleryUrls || [],
            includedTasks: sub.includedTasks || [],
            excludedTasks: sub.excludedTasks || [],
            pricingType: sub.pricingType,
            pricing: {
              basePrice: Number(pricing?.basePrice || 0),
              petFee: Number(pricing?.petFee || 0),
              waitingFee: Number(pricing?.waitingFee || 0),
            },
          };
        }),
      pricingTiers: (pkg.pricingTiers || []).map((tier) => ({
        id: tier.id,
        name: tier.name,
        description: tier.description || null,
        pricingMode: tier.pricingMode,
        minHours: Number(tier.minHours),
        maxHours: Number(tier.maxHours),
        defaultHours:
          tier.defaultHours !== null && tier.defaultHours !== undefined
            ? Number(tier.defaultHours)
            : null,
        pricePerHour:
          tier.pricePerHour !== null && tier.pricePerHour !== undefined
            ? Number(tier.pricePerHour)
            : null,
        pricePerM2:
          tier.pricePerM2 !== null && tier.pricePerM2 !== undefined
            ? Number(tier.pricePerM2)
            : null,
        fixedPrice:
          tier.fixedPrice !== null && tier.fixedPrice !== undefined
            ? Number(tier.fixedPrice)
            : null,
        areaMinM2:
          tier.areaMinM2 !== null && tier.areaMinM2 !== undefined
            ? Number(tier.areaMinM2)
            : null,
        areaMaxM2:
          tier.areaMaxM2 !== null && tier.areaMaxM2 !== undefined
            ? Number(tier.areaMaxM2)
            : null,
        sortOrder: tier.sortOrder,
      })),
      durations: (pkg.durations || []).map((duration) => ({
        id: duration.id,
        durationHours: Number(duration.durationHours),
        title: duration.title || null,
        description: duration.description || null,
        priceMultiplier: Number(duration.priceMultiplier),
        priceMode: duration.priceMode,
        fixedPrice:
          duration.fixedPrice !== null && duration.fixedPrice !== undefined
            ? Number(duration.fixedPrice)
            : null,
        isPopular: duration.isPopular,
        suggestedArea: duration.suggestedArea ?? null,
        taskerCount: duration.taskerCount,
      })),
      addons: (pkg.addons || []).map((addon) => ({
        id: addon.id,
        name: addon.name,
        description: addon.description || null,
        price: Number(addon.price),
        durationMinutes:
          addon.durationMinutes !== null && addon.durationMinutes !== undefined
            ? Number(addon.durationMinutes)
            : null,
      })),
      peakHours: (pkg.peakHours || []).map((peakHour) => ({
        id: peakHour.id,
        dayOfWeek: peakHour.dayOfWeek,
        startHour: peakHour.startHour,
        endHour: peakHour.endHour,
        multiplier: Number(peakHour.multiplier),
        startDate: peakHour.startDate ? peakHour.startDate.toISOString() : null,
        endDate: peakHour.endDate ? peakHour.endDate.toISOString() : null,
        title: peakHour.title || null,
        description: peakHour.description || null,
      })),
    };
  }

  private isBookableOptionalSubService(
    sub?: SubServiceEntity | null,
  ): sub is SubServiceEntity {
    if (!sub || !sub.isActive) return false;
    if (!sub.id || !sub.subServiceCode || !sub.name?.trim()) return false;
    if (!sub.durationHours || Number(sub.durationHours) <= 0) return false;

    const pricing = sub.pricingConfig;
    if (!pricing || !pricing.isActive) return false;

    const basePrice = Number(pricing.basePrice);
    return Number.isFinite(basePrice) && basePrice >= 0;
  }
}
