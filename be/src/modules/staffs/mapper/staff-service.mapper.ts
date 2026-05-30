import { StaffServiceEntity } from '../entities/staff-service.entity';
import { StaffServiceResponseDto } from '../dto/staff-service-response.dto';

export const toStaffServiceResponseDto = (
  entity: StaffServiceEntity,
): StaffServiceResponseDto => {
  return {
    id: entity.id,
    serviceId: entity.service.id,
    serviceName: entity.service.name,
    serviceCategory: entity.service.category || '',
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

export const toStaffServiceResponseDtoList = (
  entities: StaffServiceEntity[],
): StaffServiceResponseDto[] => {
  return entities.map((entity) => toStaffServiceResponseDto(entity));
};
