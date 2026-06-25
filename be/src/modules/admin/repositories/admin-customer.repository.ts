import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { CustomerEntity } from 'src/modules/customer/entity/customer.entity';
import { CustomerAddressEntity } from 'src/modules/customer/entity/customer-address.entity';
import { BookingEntity } from 'src/modules/booking/entity/booking.entity';
import { UserEntity } from 'src/modules/users/entities/user.entity';
import { BookingStatus } from 'src/common/enums/booking-status.enum';
import { UserRole } from 'src/common/enums/user-role.enum';
import { AuthProvider } from 'src/common/enums/auth-provider.enum';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { CustomerQueryDto } from '../dto/customer-query.dto';
import { CreateCustomerDto } from '../dto/create-customer.dto';
import { UpdateCustomerDto } from '../dto/update-customer.dto';

@Injectable()
export class AdminCustomerRepository {
  constructor(private readonly dataSource: DataSource) {}

  async getCustomers(queryDto: CustomerQueryDto) {
    const { keyword, isActive, page = 1, limit = 10 } = queryDto;
    const skip = (page - 1) * limit;

    const query = this.dataSource
      .getRepository(CustomerEntity)
      .createQueryBuilder('c')
      .innerJoinAndSelect('c.user', 'u')
      .where('u.role = :role', { role: UserRole.CUSTOMER })
      .andWhere('u.deletedAt IS NULL')
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

    const spentByCustomer = await this.getTotalSpentByCustomers(
      data.map((c) => c.id),
    );

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
        totalSpent: spentByCustomer.get(c.id) ?? 0,
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

  /**
   * Tính tổng chi tiêu (tổng tiền các booking đã hoàn thành) cho nhiều customer
   * trong 1 truy vấn gộp, tránh N+1 khi đổ danh sách.
   */
  private async getTotalSpentByCustomers(
    customerIds: string[],
  ): Promise<Map<string, number>> {
    const spentMap = new Map<string, number>();
    if (customerIds.length === 0) return spentMap;

    const rows = await this.dataSource
      .getRepository(BookingEntity)
      .createQueryBuilder('b')
      .leftJoin('b.customer', 'c')
      .select('c.id', 'customerId')
      .addSelect('COALESCE(SUM(b.totalPrice), 0)', 'totalSpent')
      .where('c.id IN (:...customerIds)', { customerIds })
      .andWhere('b.status = :completed', {
        completed: BookingStatus.COMPLETED,
      })
      .groupBy('c.id')
      .getRawMany<{ customerId: string; totalSpent: string }>();

    for (const r of rows) {
      spentMap.set(r.customerId, Number(r.totalSpent));
    }
    return spentMap;
  }

  async getCustomerDetail(customerId: string) {
    const customer = await this.dataSource
      .getRepository(CustomerEntity)
      .createQueryBuilder('c')
      .innerJoinAndSelect('c.user', 'u')
      .leftJoinAndSelect('c.addresses', 'a')
      .where('c.id = :customerId', { customerId })
      .andWhere('u.deletedAt IS NULL')
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
      .setParameter('cancelled', [
        BookingStatus.CANCELLED,
        BookingStatus.EXPIRED,
      ])
      .getRawOne();

    const totalBookings = Number(row?.total_bookings ?? 0);
    const completedBookings = Number(row?.completed_bookings ?? 0);
    const cancelledBookings = Number(row?.cancelled_bookings ?? 0);
    const totalSpent = Number(row?.total_spent ?? 0);
    const completionRate =
      totalBookings > 0
        ? Math.round((completedBookings / totalBookings) * 1000) / 10
        : 0;
    const aov =
      completedBookings > 0 ? Math.round(totalSpent / completedBookings) : 0;

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

  async createCustomer(dto: CreateCustomerDto) {
    return asyncHandleOperation(async () => {
      const created = await this.dataSource.transaction(async (manager) => {
        const userRepo = manager.getRepository(UserEntity);
        const customerRepo = manager.getRepository(CustomerEntity);

        const existing = await userRepo.findOne({
          where: { email: dto.email },
          withDeleted: true,
        });
        if (existing) {
          throw new ConflictException('Email đã tồn tại');
        }

        const user = await userRepo.save(
          userRepo.create({
            email: dto.email,
            fullName: dto.fullName.trim(),
            phone: dto.phone?.trim(),
            password: await bcrypt.hash(dto.password, 10),
            provider: AuthProvider.LOCAL,
            role: UserRole.CUSTOMER,
            isVerified: true,
            isActive: true,
          }),
        );

        const customer = await customerRepo.save(
          customerRepo.create({
            user,
            ...(dto.defaultPaymentMethod
              ? { defaultPaymentMethod: dto.defaultPaymentMethod }
              : {}),
          }),
        );

        return customer;
      });

      return this.getCustomerDetail(created.id);
    }, 'Lỗi khi tạo khách hàng');
  }

  async updateCustomer(customerId: string, dto: UpdateCustomerDto) {
    return asyncHandleOperation(async () => {
      await this.dataSource.transaction(async (manager) => {
        const customerRepo = manager.getRepository(CustomerEntity);
        const customer = await customerRepo.findOne({
          where: { id: customerId },
          relations: ['user'],
        });
        if (!customer || !customer.user) {
          throw new NotFoundException(
            `Không tìm thấy khách hàng với id ${customerId}`,
          );
        }

        const userRepo = manager.getRepository(UserEntity);
        if (dto.fullName !== undefined) {
          customer.user.fullName = dto.fullName.trim();
        }
        if (dto.phone !== undefined) {
          customer.user.phone = dto.phone.trim();
        }
        await userRepo.save(customer.user);

        if (dto.defaultPaymentMethod !== undefined) {
          customer.defaultPaymentMethod = dto.defaultPaymentMethod;
          await customerRepo.save(customer);
        }
      });

      return this.getCustomerDetail(customerId);
    }, 'Lỗi khi cập nhật khách hàng');
  }

  async deleteCustomer(customerId: string) {
    return asyncHandleOperation(async () => {
      const customer = await this.dataSource
        .getRepository(CustomerEntity)
        .findOne({ where: { id: customerId }, relations: ['user'] });
      if (!customer || !customer.user) {
        throw new NotFoundException(
          `Không tìm thấy khách hàng với id ${customerId}`,
        );
      }

      await this.dataSource
        .getRepository(UserEntity)
        .softDelete(customer.user.id);

      return { message: 'Đã xóa khách hàng' };
    }, 'Lỗi khi xóa khách hàng');
  }
}
