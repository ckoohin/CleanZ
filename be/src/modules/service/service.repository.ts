import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ServiceEntity } from './entity/service.entity';
import { ServiceListQueryDto } from './dto/list-query-service.dto';
import { PaginatedData } from './../../common/helpers/response.interface';

@Injectable()
export class ServiceRepository extends Repository<ServiceEntity> {
  constructor(private readonly dataSource: DataSource) {
    super(ServiceEntity, dataSource.createEntityManager());
  }

  async findWithPagination(
    query: ServiceListQueryDto,
  ): Promise<PaginatedData<ServiceEntity>> {
    const { page = 1, limit = 20, search, isActive } = query;
    const skip = (page - 1) * limit;

    const qb = this.createQueryBuilder('svc').orderBy('svc.createdAt', 'DESC');

    if (search) {
      qb.andWhere('(svc.name ILIKE :search OR svc.description ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    if (isActive !== undefined) {
      qb.andWhere('svc.isActive = :isActive', {
        isActive: isActive === 'true',
      });
    }

    const [items, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async hasActiveBookings(serviceId: string): Promise<boolean> {
    const result = await this.dataSource.query<[{ count: string }]>(
      `SELECT COUNT(*)::int AS count
       FROM bookings
       WHERE service_id = $1
         AND status NOT IN ('COMPLETED','CANCELLED','EXPIRED')`,
      [serviceId],
    );
    return parseInt(result[0].count, 10) > 0;
  }
}
