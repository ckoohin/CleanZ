import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BookingEntity } from 'src/modules/booking/entity/booking.entity';
import { BookingSearchQueryDto } from '../dto/booking-search-query.dto';

@Injectable()
export class AdminBookingRepository {
  constructor(private readonly dataSource: DataSource) {}

  async searchBookings(queryDto: BookingSearchQueryDto) {
    const { keyword, page = 1, limit = 10 } = queryDto;
    const skip = (page - 1) * limit;

    const query = this.dataSource
      .getRepository(BookingEntity)
      .createQueryBuilder('b')
      .leftJoin('b.customer', 'c')
      .leftJoin('c.user', 'u')
      .orderBy('b.createdAt', 'DESC');

    if (keyword) {
      query.andWhere('(b.bookingCode ILIKE :kw OR u.fullName ILIKE :kw)', {
        kw: `%${keyword}%`,
      });
    }

    const total = await query.getCount();

    const rows = await query
      .select([
        'b.id AS id',
        'b.booking_code AS "bookingCode"',
        'u.full_name AS "customerName"',
        'b.status AS status',
        'b.scheduled_start AS "scheduledStart"',
        'b.total_price AS "totalPrice"',
      ])
      .offset(skip)
      .limit(limit)
      .getRawMany();

    return {
      data: rows,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
