import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CustomerEntity } from 'src/modules/customer/entity/customer.entity';
import { CustomerAddressEntity } from 'src/modules/customer/entity/customer-address.entity';
import { BookingEntity } from 'src/modules/booking/entity/booking.entity';
import { BookingStatus } from 'src/common/enums/booking-status.enum';
import { UserRole } from 'src/common/enums/user-role.enum';
import { CustomerQueryDto } from '../dto/customer-query.dto';

@Injectable()
export class AdminCustomerRepository {
  constructor(private readonly dataSource: DataSource) {}

  async getCustomers(queryDto: CustomerQueryDto) {
    const { keyword, isActive, page = 1, limit = 10 } = queryDto;
    const skip = (page - 1) * limit;

    const query = this.dataSource
      .getRepository(CustomerEntity)
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.user', 'u')
      .where('u.role = :role', { role: UserRole.CUSTOMER })
      .orderBy('c.createdAt', 'DESC');

    if (keyword) {
      query.andWhere(
        '(u.fullName ILIKE :keyword OR u.email ILIKE :keyword OR u.phone ILIKE :keyword)',
        { keyword: `%${keyword}%` },
      );
    }

    if (isActive !== undefined) {
      query.andWhere('u.isActive = :isActive', { isActive });
    }

    const [data, total] = await query.skip(skip).take(limit).getManyAndCount();

    return {
      data: data.map((c) => ({
        id: c.id,
        userId: c.user.id,
        fullName: c.user.fullName,
        email: c.user.email,
        phone: c.user.phone ?? null,
        avatarUrl: c.user.avatarUrl ?? null,
        isActive: c.user.isActive,
        isVerified: c.user.isVerified,
        defaultPaymentMethod: c.defaultPaymentMethod,
        totalBookings: c.totalBookings,
        totalCancelled: c.totalCancelled,
        createdAt: c.createdAt,
        lastLogin: c.user.lastLogin,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCustomerDetail(customerId: string) {
    const customer = await this.dataSource
      .getRepository(CustomerEntity)
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.user', 'u')
      .leftJoinAndSelect('c.addresses', 'a')
      .where('c.id = :customerId', { customerId })
      .getOne();

    if (!customer) return null;

    const stats = await this.getCustomerStats(customerId);

    return {
      id: customer.id,
      userId: customer.user.id,
      fullName: customer.user.fullName,
      email: customer.user.email,
      phone: customer.user.phone ?? null,
      avatarUrl: customer.user.avatarUrl ?? null,
      isActive: customer.user.isActive,
      isVerified: customer.user.isVerified,
      provider: customer.user.provider,
      defaultPaymentMethod: customer.defaultPaymentMethod,
      totalBookings: customer.totalBookings,
      totalCancelled: customer.totalCancelled,
      createdAt: customer.createdAt,
      lastLogin: customer.user.lastLogin,
      addresses: (customer.addresses ?? []).map((a) => ({
        id: a.id,
        label: a.label,
        fullAddress: a.fullAddress,
        wardDetail: a.wardDetail,
        latitude: a.latitude ? Number(a.latitude) : null,
        longitude: a.longitude ? Number(a.longitude) : null,
        isDefault: a.isDefault,
        hasPet: a.hasPet,
      })),
      stats,
    };
  }

  private async getCustomerStats(customerId: string) {
    const row = await this.dataSource
      .getRepository(BookingEntity)
      .createQueryBuilder('b')
      .leftJoin('b.customer', 'c')
      .select([
        'COUNT(*) AS total_bookings',
        `COUNT(CASE WHEN b.status = :completed THEN 1 END) AS completed_bookings`,
        `COUNT(CASE WHEN b.status IN (:...cancelled) THEN 1 END) AS cancelled_bookings`,
        `COALESCE(SUM(CASE WHEN b.status = :completed THEN b.totalPrice ELSE 0 END), 0) AS total_spent`,
      ])
      .where('c.id = :customerId', { customerId })
      .setParameter('completed', BookingStatus.COMPLETED)
      .setParameter('cancelled', [BookingStatus.CANCELLED, BookingStatus.EXPIRED])
      .getRawOne();

    const totalBookings = Number(row?.total_bookings ?? 0);
    const completedBookings = Number(row?.completed_bookings ?? 0);
    const cancelledBookings = Number(row?.cancelled_bookings ?? 0);
    const totalSpent = Number(row?.total_spent ?? 0);
    const completionRate = totalBookings > 0
      ? Math.round((completedBookings / totalBookings) * 1000) / 10
      : 0;
    const aov = completedBookings > 0 ? Math.round(totalSpent / completedBookings) : 0;

    return {
      totalBookings,
      completedBookings,
      cancelledBookings,
      totalSpent,
      completionRate,
      aov,
    };
  }

  async getCustomerBookings(
    customerId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    const [data, total] = await this.dataSource
      .getRepository(BookingEntity)
      .createQueryBuilder('b')
      .leftJoin('b.customer', 'c')
      .select([
        'b.id AS id',
        'b.bookingCode AS "bookingCode"',
        'b.totalPrice AS "totalPrice"',
        'b.status AS status',
        'b.scheduledStart AS "scheduledStart"',
        'b.scheduledEnd AS "scheduledEnd"',
        'b.paymentMethod AS "paymentMethod"',
        'b.paymentStatus AS "paymentStatus"',
        'b.createdAt AS "createdAt"',
      ])
      .where('c.id = :customerId', { customerId })
      .orderBy('b.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getRawMany()
      .then(async (rows) => {
        const countResult = await this.dataSource
          .getRepository(BookingEntity)
          .createQueryBuilder('b')
          .leftJoin('b.customer', 'c')
          .where('c.id = :customerId', { customerId })
          .getCount();
        return [rows, countResult] as const;
      });

    return {
      data: data.map((r) => ({
        id: r.id,
        bookingCode: r.bookingCode,
        totalPrice: Number(r.totalPrice),
        status: r.status,
        scheduledStart: r.scheduledStart,
        scheduledEnd: r.scheduledEnd,
        paymentMethod: r.paymentMethod,
        paymentStatus: r.paymentStatus,
        createdAt: r.createdAt,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
