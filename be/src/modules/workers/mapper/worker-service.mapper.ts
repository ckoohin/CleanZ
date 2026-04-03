import { WorkerServiceEntity } from '../entities/worker-service.entity';
import { WorkerServiceResponseDto } from '../dto/worker-service-response.dto';

export const toWorkerServiceResponseDto = (
  entity: WorkerServiceEntity,
): WorkerServiceResponseDto => {
  return {
    id: entity.id,
    serviceId: entity.service.id,
    serviceName: entity.service.name,
    serviceCategory: entity.service.category,
    serviceSupportedLocationTypes: entity.service.supportedLocationTypes,
    locationTypes: entity.locationTypes,
    customPrice: entity.customPrice ? Number(entity.customPrice) : undefined,
    effectivePrice: entity.customPrice
      ? Number(entity.customPrice)
      : Number(entity.service.basePrice),
    description: entity.description,
    shopAddress: entity.shopAddress,
    isAvailable: entity.isAvailable,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
};

export const toWorkerServiceResponseDtoList = (
  entities: WorkerServiceEntity[],
): WorkerServiceResponseDto[] => {
  return entities.map((entity) => toWorkerServiceResponseDto(entity));
};
