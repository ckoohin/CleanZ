import { ServiceEntity } from '../entities/service.entity';
import { ServiceResponseDto } from '../dto/service-response.dto';

export const toServiceResponseDto = (entity: ServiceEntity): ServiceResponseDto => {
  return {
    id: entity.id,
    name: entity.name,
    category: entity.category,
    description: entity.description,
    basePrice: Number(entity.basePrice),
    duration: entity.duration,
    imageUrl: entity.imageUrl || null,
    isActive: entity.isActive,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
    createdByAdminId: entity.createdByAdminId,
    lastUpdatedByAdminId: entity.lastUpdatedByAdminId,
  };
};

export const toServiceResponseDtoList = (entities: ServiceEntity[]): ServiceResponseDto[] => {
  return entities.map(entity => toServiceResponseDto(entity));
};