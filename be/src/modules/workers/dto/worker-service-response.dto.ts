import { ServiceLocationType } from 'src/common/enums/service-location-type.enum';

export class WorkerServiceResponseDto {
  id!: string;
  serviceId!: string;
  serviceName!: string;
  serviceCategory!: string;
  serviceSupportedLocationTypes!: ServiceLocationType[];
  locationTypes!: ServiceLocationType[];
  customPrice?: number;
  effectivePrice!: number;
  description?: string;
  shopAddress?: string;
  isAvailable!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}
