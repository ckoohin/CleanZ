export class ServiceResponseDto {
  id!: string;
  name!: string;
  category!: string;
  description?: string;
  basePrice!: number;
  duration?: number;
  imageUrl!: string | null;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
  createdByAdminId?: string;
  lastUpdatedByAdminId?: string;
}

export class PaginatedServiceResponseDto {
  data!: ServiceResponseDto[];
  meta!: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}