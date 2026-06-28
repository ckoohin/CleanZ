import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { PricingConfigEntity } from './entity/pricing-config.entity';
import { PeakDayConfigEntity } from './entity/peak-day-config.entity';
import { PricingTierEntity } from './entity/pricing-tier.entity';
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
    const { page = 1, limit = 20, name, isActive } = query;
    const skip = (page - 1) * limit;

    const qb = this.createQueryBuilder('pc').orderBy('pc.createdAt', 'DESC');

    if (name) {
      qb.andWhere('pc.name ILIKE :name', { name: `%${name}%` });
    }
    if (isActive !== undefined) {
      qb.andWhere('pc.isActive = :isActive', { isActive: isActive === 'true' });
    }

    const [items, total] = await qb.skip(skip).take(limit).getManyAndCount();
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
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

@Injectable()
export class PricingTierRepository extends Repository<PricingTierEntity> {
  constructor(private readonly dataSource: DataSource) {
    super(PricingTierEntity, dataSource.createEntityManager());
  }

  async findByPackageId(packageId: string): Promise<PricingTierEntity[]> {
    return this.find({
      where: { packageId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async findActiveByPackageId(packageId: string): Promise<PricingTierEntity[]> {
    return this.find({
      where: { packageId, isActive: true },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }
}
