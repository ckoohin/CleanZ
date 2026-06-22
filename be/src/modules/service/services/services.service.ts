import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ServiceRepository } from '../service.repository';
import { ServiceEntity } from '../entity/service.entity';
import { CategoryEntity } from '../entity/category.entity';
import { PaginatedData } from '../../../common/helpers/response.interface';
import { CreateServiceDto } from '../dto/create-service.dto';
import { ServiceListQueryDto } from '../dto/list-query-service.dto';
import { UpdateServiceDto } from '../dto/update-service.dto';
import { PublicServiceListQueryDto } from '../dto/public-service-list-query.dto';
import {
  PublicServiceListResponseDto,
  PublicServiceResponseDto,
} from '../dto/public-service-response.dto';
import { toNumber } from 'src/common/helpers/number.helper';

@Injectable()
export class ServicesService {
  constructor(private readonly serviceRepo: ServiceRepository) {}

  async create(dto: CreateServiceDto): Promise<ServiceEntity> {
    const entity = this.serviceRepo.create({
      name: dto.name,
      description: dto.description ?? undefined,
      thumbnailUrl: dto.thumbnailUrl ?? undefined,
      galleryUrls: dto.galleryUrls ?? undefined,
      shortDescription: dto.shortDescription ?? undefined,
      includedTasks: dto.includedTasks ?? undefined,
      excludedTasks: dto.excludedTasks ?? undefined,
      baseDurationHours: dto.baseDurationHours ?? undefined,
      coverageArea: dto.coverageArea ?? undefined,
      isActive: dto.isActive ?? true,
      category: dto.categoryId
        ? ({ id: dto.categoryId } as CategoryEntity)
        : undefined,
    });
    return this.serviceRepo.save(entity);
  }

  async findAll(
    query: ServiceListQueryDto,
  ): Promise<PaginatedData<ServiceEntity>> {
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

  async findOne(id: string): Promise<ServiceEntity> {
    const service = await this.serviceRepo.findOne({
      where: { id },
      relations: ['pricingConfig', 'category'],
    });
    if (!service) throw new NotFoundException('SERVICE_NOT_FOUND');
    return service;
  }

  async update(id: string, dto: UpdateServiceDto): Promise<ServiceEntity> {
    const service = await this.findOne(id);

    if (dto.isActive === false && service.isActive) {
      const hasActive = await this.serviceRepo.hasActiveBookings(id);
      if (hasActive) {
        throw new ConflictException(
          'SERVICE_HAS_ACTIVE_BOOKINGS: Cannot deactivate service with pending or in-progress bookings.',
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
      baseDurationHours:
        dto.baseDurationHours !== undefined
          ? dto.baseDurationHours
          : service.baseDurationHours,
      coverageArea:
        dto.coverageArea !== undefined
          ? dto.coverageArea
          : service.coverageArea,
      isActive: dto.isActive !== undefined ? dto.isActive : service.isActive,
      category:
        dto.categoryId !== undefined
          ? dto.categoryId
            ? ({ id: dto.categoryId } as CategoryEntity)
            : null
          : service.category,
    });

    return this.serviceRepo.save(service);
  }

  async remove(id: string): Promise<void> {
    const service = await this.findOne(id);
    const hasActive = await this.serviceRepo.hasActiveBookings(id);
    if (hasActive) {
      throw new ConflictException(
        'SERVICE_HAS_ACTIVE_BOOKINGS: Cannot delete service with pending or in-progress bookings.',
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

  private mapPublicService(service: ServiceEntity): PublicServiceResponseDto {
    const pricing = service.pricingConfig;

    return {
      id: service.id,
      serviceCode: service.serviceCode,
      name: service.name,
      description: service.description ?? null,
      shortDescription: service.shortDescription ?? null,
      baseDurationHours: toNumber(service.baseDurationHours),
      thumbnailUrl: service.thumbnailUrl ?? null,
      galleryUrls: service.galleryUrls ?? [],
      includedTasks: service.includedTasks ?? [],
      excludedTasks: service.excludedTasks ?? [],
      pricing: {
        basePrice: toNumber(pricing?.basePrice),
        petFee: toNumber(pricing?.petFee),
        waitingFee: toNumber(pricing?.waitingFee),
      },
    };
  }
}
