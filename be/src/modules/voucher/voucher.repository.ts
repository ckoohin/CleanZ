import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { VoucherEntity } from './entity/voucher.entity';
import {
  CustomerVoucherEntity,
  CustomerVoucherStatus,
} from './entity/customer-voucher.entity';
import { VoucherListQueryDto } from './dto/list-query-voucher.dto';
import { PaginatedData } from '../../common/helpers/response.interface';

@Injectable()
export class VoucherRepository extends Repository<VoucherEntity> {
  constructor(private readonly dataSource: DataSource) {
    super(VoucherEntity, dataSource.createEntityManager());
  }

  async findWithPagination(
    query: VoucherListQueryDto,
  ): Promise<PaginatedData<VoucherEntity>> {
    const { page = 1, limit = 20, search, type, isActive } = query;
    const skip = (page - 1) * limit;

    const qb = this.createQueryBuilder('v').orderBy('v.createdAt', 'DESC');

    if (search) {
      qb.andWhere('(v.code ILIKE :search OR v.name ILIKE :search)', {
        search: `%${search}%`,
      });
    }
    if (type) {
      qb.andWhere('v.type = :type', { type });
    }
    if (isActive !== undefined) {
      qb.andWhere('v.isActive = :isActive', { isActive: isActive === 'true' });
    }

    const [items, total] = await qb.skip(skip).take(limit).getManyAndCount();
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async existsByCode(code: string, excludeId?: string): Promise<boolean> {
    const qb = this.createQueryBuilder('v').where('v.code = :code', { code });
    if (excludeId) qb.andWhere('v.id != :excludeId', { excludeId });
    return (await qb.getCount()) > 0;
  }
}

@Injectable()
export class CustomerVoucherRepository extends Repository<CustomerVoucherEntity> {
  constructor(private readonly dataSource: DataSource) {
    super(CustomerVoucherEntity, dataSource.createEntityManager());
  }

  async findIssuedCustomerIds(
    voucherId: string,
    customerIds: string[],
  ): Promise<string[]> {
    const rows = await this.createQueryBuilder('cv')
      .select('cv.customerId', 'customerId')
      .where('cv.voucherId = :voucherId', { voucherId })
      .andWhere('cv.customerId IN (:...customerIds)', { customerIds })
      .getRawMany<{ customerId: string }>();
    return rows.map((r) => r.customerId);
  }

  async getVoucherUsageStats(
    voucherId: string,
  ): Promise<{ total: number; reserved: number; used: number }> {
    const result = await this.createQueryBuilder('cv')
      .select('COUNT(*)', 'total')
      .addSelect(
        'SUM(CASE WHEN cv.status = :reserved THEN 1 ELSE 0 END)',
        'reserved',
      )
      .addSelect('SUM(CASE WHEN cv.status = :used THEN 1 ELSE 0 END)', 'used')
      .where('cv.voucherId = :voucherId', { voucherId })
      .setParameters({
        reserved: CustomerVoucherStatus.RESERVED,
        used: CustomerVoucherStatus.USED,
      })
      .getRawOne<{ total: string; reserved: string; used: string }>();
    return {
      total: parseInt(result?.total ?? '0', 10),
      reserved: parseInt(result?.reserved ?? '0', 10),
      used: parseInt(result?.used ?? '0', 10),
    };
  }

  countCustomerActiveUses(
    customerId: string,
    voucherId: string,
    excludeBookingId?: string,
  ): Promise<number> {
    const qb = this.createQueryBuilder('cv')
      .where('cv.customerId = :customerId', { customerId })
      .andWhere('cv.voucherId = :voucherId', { voucherId })
      .andWhere('cv.status IN (:...statuses)', {
        statuses: [CustomerVoucherStatus.RESERVED, CustomerVoucherStatus.USED],
      });

    if (excludeBookingId) {
      qb.andWhere(
        '(cv.bookingId IS NULL OR cv.bookingId != :excludeBookingId)',
        {
          excludeBookingId,
        },
      );
    }

    return qb.getCount();
  }

  findReservationForBooking(
    bookingId: string,
  ): Promise<CustomerVoucherEntity | null> {
    return this.findOne({
      where: {
        bookingId,
        status: CustomerVoucherStatus.RESERVED,
      },
    });
  }
}
