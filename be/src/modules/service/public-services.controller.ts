import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PublicServiceListQueryDto } from './dto/public-service-list-query.dto';
import {
  PublicPackageListResponseDto,
  PublicPackageResponseDto,
} from './dto/public-service-response.dto';
import { ServicePackagesService } from './services/service-packages.service';
import { ServicePackageEntity } from './entity/service-package.entity';

@ApiTags('Services')
@Controller('services')
export class PublicServicesController {
  constructor(
    private readonly servicePackagesService: ServicePackagesService,
  ) {}

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
    const packages = await this.servicePackagesService.findAvailablePackages(
      query.search,
    );

    const mappedData = packages.map((pkg) => this.mapPublicPackage(pkg));

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

  private mapPublicPackage(
    pkg: ServicePackageEntity,
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
      coverageAreas: (pkg.coverageAreas || []).map((area) => ({
        id: area.id,
        name: area.name,
      })),
      subServices: (pkg.packageSubServices || [])
        .filter((pss) => pss.subService)
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
    };
  }
}
