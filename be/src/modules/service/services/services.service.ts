import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ServiceRepository } from '../service.repository';
import { ServiceEntity } from '../entity/service.entity';
import { PaginatedData } from '../../../common/helpers/response.interface';
import { CreateServiceDto } from '../dto/create-service.dto';
import { ServiceListQueryDto } from '../dto/list-query-service.dto';
import { UpdateServiceDto } from '../dto/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(private readonly serviceRepo: ServiceRepository) {}

  async create(dto: CreateServiceDto): Promise<ServiceEntity> {
    const entity = this.serviceRepo.create({
      name: dto.name,
      description: dto.description ?? null,
      baseDurationHours: dto.baseDurationHours ?? null,
      coverageArea: dto.coverageArea ?? null,
      isActive: dto.isActive ?? true,
    });
    return this.serviceRepo.save(entity);
  }

  async findAll(
    query: ServiceListQueryDto,
  ): Promise<PaginatedData<ServiceEntity>> {
    return this.serviceRepo.findWithPagination(query);
  }

  async findOne(id: string): Promise<ServiceEntity> {
    const service = await this.serviceRepo.findOne({ where: { id } });
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
      baseDurationHours:
        dto.baseDurationHours !== undefined
          ? dto.baseDurationHours
          : service.baseDurationHours,
      coverageArea:
        dto.coverageArea !== undefined
          ? dto.coverageArea
          : service.coverageArea,
      isActive: dto.isActive !== undefined ? dto.isActive : service.isActive,
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
}
