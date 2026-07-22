import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceRepository } from '../service.repository';
import { SubServiceEntity } from '../entity/sub-service.entity';
import { PricingConfigEntity } from '../../pricing/entity/pricing-config.entity';
import { PaginatedData } from '../../../common/helpers/response.interface';
import { CreateSubServiceDto } from '../dto/create-sub-service.dto';
import { SubServiceListQueryDto } from '../dto/list-query-sub-service.dto';
import { UpdateSubServiceDto } from '../dto/update-sub-service.dto';
import { PublicServiceListQueryDto } from '../dto/public-service-list-query.dto';
import {
  PublicServiceListResponseDto,
  PublicServiceResponseDto,
} from '../dto/public-service-response.dto';
import { toNumber } from 'src/common/helpers/number.helper';

@Injectable()
export class SubServicesService {
  constructor(
    private readonly serviceRepo: ServiceRepository,
    @InjectRepository(PricingConfigEntity)
    private readonly pricingConfigRepo: Repository<PricingConfigEntity>,
  ) {}

  async create(dto: CreateSubServiceDto): Promise<SubServiceEntity> {
    let pricingConfig: PricingConfigEntity | undefined;

    if (dto.basePrice !== undefined && dto.basePrice >= 0) {
      pricingConfig = await this.pricingConfigRepo.save(
        this.pricingConfigRepo.create({
          name: dto.name,
          basePrice: dto.basePrice,
          isActive: true,
        }),
      );
    } else if (dto.pricingConfigId) {
      pricingConfig = { id: dto.pricingConfigId } as PricingConfigEntity;
    }

    const entity = this.serviceRepo.create({
      name: dto.name,
      description: dto.description ?? undefined,
      thumbnailUrl: dto.thumbnailUrl ?? undefined,
      galleryUrls: dto.galleryUrls ?? undefined,
      shortDescription: dto.shortDescription ?? undefined,
      includedTasks: dto.includedTasks ?? undefined,
      excludedTasks: dto.excludedTasks ?? undefined,
      durationHours: dto.durationHours ?? undefined,
      coverageArea: dto.coverageArea ?? undefined,
      isActive: dto.isActive ?? true,
      pricingType: dto.pricingType ?? 'FIXED',
      termsAndConditions: dto.termsAndConditions ?? undefined,
      pricingConfig: pricingConfig ?? undefined,
    });
    return this.serviceRepo.save(entity);
  }

  async findAll(
    query: SubServiceListQueryDto,
  ): Promise<PaginatedData<SubServiceEntity>> {
    return this.serviceRepo.findWithPagination(query);
  }

  async findAvailableServices(
    query: PublicServiceListQueryDto,
  ): Promise<PublicServiceListResponseDto> {
    const result = await this.serviceRepo.findAvailableForBooking(query);

    return {
      data: result.items.map((service) => this.mapPublicService(service)),
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    };
  }

  async findOne(id: string): Promise<SubServiceEntity> {
    const service = await this.serviceRepo.findOne({
      where: { id },
      relations: ['pricingConfig'],
    });
    if (!service) throw new NotFoundException('SERVICE_NOT_FOUND');
    return service;
  }

  async update(
    id: string,
    dto: UpdateSubServiceDto,
  ): Promise<SubServiceEntity> {
    const service = await this.findOne(id);

    if (dto.isActive === false && service.isActive) {
      const hasActive = await this.serviceRepo.hasActiveBookings(id);
      if (hasActive) {
        throw new ConflictException(
          'Không thể ngừng dịch vụ đang có đơn hàng chưa hoàn thành.',
        );
      }
    }

    Object.assign(service, {
      name: dto.name ?? service.name,
      description:
        dto.description !== undefined ? dto.description : service.description,
      thumbnailUrl:
        dto.thumbnailUrl !== undefined
          ? dto.thumbnailUrl
          : service.thumbnailUrl,
      galleryUrls:
        dto.galleryUrls !== undefined ? dto.galleryUrls : service.galleryUrls,
      shortDescription:
        dto.shortDescription !== undefined
          ? dto.shortDescription
          : service.shortDescription,
      includedTasks:
        dto.includedTasks !== undefined
          ? dto.includedTasks
          : service.includedTasks,
      excludedTasks:
        dto.excludedTasks !== undefined
          ? dto.excludedTasks
          : service.excludedTasks,
      durationHours:
        dto.durationHours !== undefined
          ? dto.durationHours
          : service.durationHours,
      coverageArea:
        dto.coverageArea !== undefined
          ? dto.coverageArea
          : service.coverageArea,
      isActive: dto.isActive !== undefined ? dto.isActive : service.isActive,
      pricingType: dto.pricingType ?? service.pricingType,
      termsAndConditions:
        dto.termsAndConditions !== undefined
          ? dto.termsAndConditions
          : service.termsAndConditions,
      pricingConfig: await (async () => {
        if (dto.basePrice !== undefined && dto.basePrice >= 0) {
          if (service.pricingConfig?.id) {
            await this.pricingConfigRepo.update(service.pricingConfig.id, {
              basePrice: dto.basePrice,
              name: dto.name ?? service.name,
            });
            return service.pricingConfig;
          }
          return await this.pricingConfigRepo.save(
            this.pricingConfigRepo.create({
              name: dto.name ?? service.name,
              basePrice: dto.basePrice,
              isActive: true,
            }),
          );
        }
        if (dto.pricingConfigId !== undefined) {
          return dto.pricingConfigId
            ? ({ id: dto.pricingConfigId } as any)
            : null;
        }
        return service.pricingConfig;
      })(),
    });

    return this.serviceRepo.save(service);
  }

  async remove(id: string): Promise<void> {
    const service = await this.findOne(id);
    const hasActive = await this.serviceRepo.hasActiveBookings(id);
    if (hasActive) {
      throw new ConflictException(
        'Không thể xóa dịch vụ đang có đơn hàng chưa hoàn thành.',
      );
    }
    await this.serviceRepo.remove(service);
  }

  async getServiceBookings(
    id: string,
    page: number,
    limit: number,
  ): Promise<PaginatedData<any>> {
    await this.findOne(id); // Check if service exists
    return this.serviceRepo.getServiceBookings(id, page, limit);
  }

  async getServiceTaskers(
    id: string,
    page: number,
    limit: number,
  ): Promise<PaginatedData<any>> {
    await this.findOne(id); // Check if service exists
    return this.serviceRepo.getServiceTaskers(id, page, limit);
  }

  private mapPublicService(
    service: SubServiceEntity,
  ): PublicServiceResponseDto {
    const pricing = service.pricingConfig;

    return {
      id: service.id,
      subServiceCode: service.subServiceCode,
      name: service.name,
      description: service.description ?? null,
      shortDescription: service.shortDescription ?? null,
      durationHours: toNumber(service.durationHours),
      thumbnailUrl: service.thumbnailUrl ?? null,
      galleryUrls: service.galleryUrls ?? [],
      includedTasks: service.includedTasks ?? [],
      excludedTasks: service.excludedTasks ?? [],
      pricingType: service.pricingType,
      pricing: {
        basePrice: toNumber(pricing?.basePrice),
        petFee: toNumber(pricing?.petFee),
        waitingFee: toNumber(pricing?.waitingFee),
      },
    };
  }
}
