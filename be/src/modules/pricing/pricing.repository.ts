import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { PricingConfigEntity } from './entity/pricing-config.entity';
import { PeakDayConfigEntity } from './entity/peak-day-config.entity';
import { PricingListQueryDto } from './dto/list-query-pricing.dto';
import { PaginatedData } from '../../common/helpers/response.interface';

@Injectable()
export class PricingConfigRepository extends Repository<PricingConfigEntity> {
  constructor(private readonly dataSource: DataSource) {
    super(PricingConfigEntity, dataSource.createEntityManager());
  }

  async findWithPagination(
    query: PricingListQueryDto,
  ): Promise<PaginatedData<PricingConfigEntity>> {
    const { page = 1, limit = 20, serviceId, isActive } = query;
    const skip = (page - 1) * limit;

    const qb = this.createQueryBuilder('pc')
      .leftJoinAndSelect('pc.service', 'svc')
      .orderBy('pc.createdAt', 'DESC');

    if (serviceId) {
      qb.andWhere('pc.serviceId = :serviceId', { serviceId });
    }
    if (isActive !== undefined) {
      qb.andWhere('pc.isActive = :isActive', { isActive: isActive === 'true' });
    }

    const [items, total] = await qb.skip(skip).take(limit).getManyAndCount();
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findDuplicate(
    serviceId: string,
    excludeId?: string,
  ): Promise<PricingConfigEntity | null> {
    const qb = this.createQueryBuilder('pc').where(
      'pc.serviceId = :serviceId',
      { serviceId },
    );

    if (excludeId) {
      qb.andWhere('pc.id != :excludeId', { excludeId });
    }

    return qb.getOne();
  }
}

@Injectable()
export class PeakDayConfigRepository extends Repository<PeakDayConfigEntity> {
  constructor(private readonly dataSource: DataSource) {
    super(PeakDayConfigEntity, dataSource.createEntityManager());
  }

  async findAll(onlyActive = false): Promise<PeakDayConfigEntity[]> {
    const qb = this.createQueryBuilder('pdc').orderBy('pdc.startAt', 'ASC');
    if (onlyActive) {
      qb.where('pdc.isActive = true');
    }
    return qb.getMany();
  }
}
