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

  async getServiceBookings(serviceId: string, page: number, limit: number): Promise<PaginatedData<any>> {
    const skip = (page - 1) * limit;

    const query = `
      SELECT 
        b.id, b.booking_code AS "bookingCode", b.status, b.total_price AS "totalPrice", 
        b.scheduled_start AS "scheduledStart", b.created_at AS "createdAt",
        c.id AS "customerId", u1.full_name AS "customerName", u1.phone AS "customerPhone",
        t.id AS "taskerId", u2.full_name AS "taskerName", u2.phone AS "taskerPhone"
      FROM bookings b
      LEFT JOIN customers c ON b.customer_id = c.id
      LEFT JOIN users u1 ON c.user_id = u1.id
      LEFT JOIN taskers t ON b.tasker_id = t.id
      LEFT JOIN users u2 ON t.user_id = u2.id
      WHERE b.service_id = $1
      ORDER BY b.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const countQuery = `
      SELECT COUNT(*)::int AS count
      FROM bookings
      WHERE service_id = $1
    `;

    const [items, [{ count }]] = await Promise.all([
      this.dataSource.query(query, [serviceId, limit, skip]),
      this.dataSource.query<{ count: number }[]>(countQuery, [serviceId]),
    ]);

    const total = parseInt(count as any, 10);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getServiceTaskers(serviceId: string, page: number, limit: number): Promise<PaginatedData<any>> {
    const skip = (page - 1) * limit;

    // Fetch taskers who have completed bookings for this service
    const query = `
      SELECT 
        t.id, u.full_name AS "fullName", u.phone AS "phoneNumber", u.avatar_url AS "avatarUrl",
        t.rating_avg AS "ratingAvg", t.total_completed_jobs AS "totalCompletedJobs",
        t.status, t.presence_status AS "presenceStatus",
        COUNT(b.id)::int AS "jobsForThisService"
      FROM taskers t
      JOIN users u ON t.user_id = u.id
      JOIN bookings b ON b.tasker_id = t.id
      WHERE b.service_id = $1 AND b.status = 'COMPLETED'
      GROUP BY t.id, u.full_name, u.phone, u.avatar_url, t.rating_avg, t.total_completed_jobs, t.status, t.presence_status
      ORDER BY "jobsForThisService" DESC
      LIMIT $2 OFFSET $3
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT t.id)::int AS count
      FROM taskers t
      JOIN bookings b ON b.tasker_id = t.id
      WHERE b.service_id = $1 AND b.status = 'COMPLETED'
    `;

    const [items, [{ count }]] = await Promise.all([
      this.dataSource.query(query, [serviceId, limit, skip]),
      this.dataSource.query<{ count: number }[]>(countQuery, [serviceId]),
    ]);

    const total = parseInt(count as any, 10);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
