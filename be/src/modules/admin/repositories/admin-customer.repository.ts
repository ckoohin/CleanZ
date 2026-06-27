import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, In, QueryFailedError } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { MailQueueService } from 'src/modules/mail/mail-queue.service';
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
  constructor(
    private readonly dataSource: DataSource,
    private readonly mailQueue: MailQueueService,
    private readonly configService: ConfigService,
  ) {}

  private loginUrl(): string {
    return `${this.configService.get<string>('FRONTEND_URL')}/login`;
  }

  /**
   * Sinh mật khẩu tạm gồm chữ hoa, chữ thường và số (loại bỏ ký tự dễ nhầm như
   * O/0, l/1) để admin tạo tài khoản hộ khách hàng.
   */
  private generateTempPassword(length = 10): string {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnpqrstuvwxyz';
    const digits = '23456789';
    const all = upper + lower + digits;
    const pick = (set: string) => set[crypto.randomInt(set.length)];

    const chars = [pick(upper), pick(lower), pick(digits)];
    while (chars.length < length) chars.push(pick(all));

    // Trộn để vị trí các nhóm ký tự bắt buộc không cố định.
    for (let i = chars.length - 1; i > 0; i--) {
      const j = crypto.randomInt(i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join('');
  }

  async getCustomers(queryDto: CustomerQueryDto) {
    const { keyword, isActive, deleted, page = 1, limit = 10 } = queryDto;
    const skip = (page - 1) * limit;

    const query = this.dataSource
      .getRepository(CustomerEntity)
      .createQueryBuilder('c');

    // QUAN TRỌNG: phải gọi withDeleted() TRƯỚC innerJoinAndSelect, nếu không
    // TypeORM vẫn gắn "AND u.deleted_at IS NULL" vào điều kiện JOIN (gọi sau
    // không gỡ được) → mâu thuẫn với "deleted_at IS NOT NULL" → trả về 0 dòng.
    if (deleted) {
      query.withDeleted();
    }

    query
      .innerJoinAndSelect('c.user', 'u')
      .where('u.role = :role', { role: UserRole.CUSTOMER })
      .orderBy('c.createdAt', 'DESC');

    if (deleted) {
      query.andWhere('u.deletedAt IS NOT NULL');
    } else {
      query.andWhere('u.deletedAt IS NULL');
    }

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

    const bookingStats = await this.getBookingStatsByCustomers(
      data.map((c) => c.id),
    );

    const updaterNames = await this.getUpdaterNames(
      data.map((c) => c.updatedBy).filter((id): id is string => !!id),
    );

    return {
      data: data.map((c) => {
        const s = bookingStats.get(c.id);
        return {
          id: c.id,
          userId: c.user.id,
          fullName: c.user.fullName,
          email: c.user.email,
          phone: c.user.phone ?? null,
          avatarUrl: c.user.avatarUrl ?? null,
          isActive: c.user.isActive,
          isVerified: c.user.isVerified,
          defaultPaymentMethod: c.defaultPaymentMethod,
          // Số liệu live (khớp với màn chi tiết) thay vì cột denormalized.
          totalBookings: s?.totalBookings ?? 0,
          totalCancelled: s?.totalCancelled ?? 0,
          totalSpent: s?.totalSpent ?? 0,
          createdAt: c.createdAt,
          lastLogin: c.user.lastLogin,
          deletedAt: c.user.deletedAt ?? null,
          updatedAt: c.updatedAt,
          updatedBy: c.updatedBy ?? null,
          updatedByName: c.updatedBy
            ? (updaterNames.get(c.updatedBy) ?? null)
            : null,
        };
      }),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Tính số liệu booking live (tổng đơn / đã hủy / tổng chi tiêu) cho nhiều
   * customer trong 1 truy vấn gộp (tránh N+1). Dùng CÙNG ngữ nghĩa với màn chi
   * tiết (getCustomerStats) để list & detail không lệch số: totalBookings = tất cả,
   * totalCancelled = CANCELLED+EXPIRED, totalSpent = SUM(totalPrice) của COMPLETED.
   */
  private async getBookingStatsByCustomers(
    customerIds: string[],
  ): Promise<
    Map<
      string,
      { totalBookings: number; totalCancelled: number; totalSpent: number }
    >
  > {
    const map = new Map<
      string,
      { totalBookings: number; totalCancelled: number; totalSpent: number }
    >();
    if (customerIds.length === 0) return map;

    const rows = await this.dataSource
      .getRepository(BookingEntity)
      .createQueryBuilder('b')
      .leftJoin('b.customer', 'c')
      .select('c.id', 'customerId')
      .addSelect('COUNT(*)', 'totalBookings')
      .addSelect(
        'COUNT(CASE WHEN b.status IN (:...cancelled) THEN 1 END)',
        'totalCancelled',
      )
      .addSelect(
        'COALESCE(SUM(CASE WHEN b.status = :completed THEN b.totalPrice ELSE 0 END), 0)',
        'totalSpent',
      )
      .where('c.id IN (:...customerIds)', { customerIds })
      .setParameter('completed', BookingStatus.COMPLETED)
      .setParameter('cancelled', [
        BookingStatus.CANCELLED,
        BookingStatus.EXPIRED,
      ])
      .groupBy('c.id')
      .getRawMany<{
        customerId: string;
        totalBookings: string;
        totalCancelled: string;
        totalSpent: string;
      }>();

    for (const r of rows) {
      map.set(r.customerId, {
        totalBookings: Number(r.totalBookings),
        totalCancelled: Number(r.totalCancelled),
        totalSpent: Number(r.totalSpent),
      });
    }
    return map;
  }

  /**
   * Lấy map userId(admin) -> fullName cho cột "Cập nhật bởi", gộp 1 query để
   * tránh N+1. withDeleted để vẫn hiện tên admin kể cả khi admin đó đã bị xóa.
   */
  private async getUpdaterNames(
    adminIds: string[],
  ): Promise<Map<string, string>> {
    const nameMap = new Map<string, string>();
    const uniqueIds = [...new Set(adminIds)];
    if (uniqueIds.length === 0) return nameMap;

    const users = await this.dataSource
      .getRepository(UserEntity)
      .find({ where: { id: In(uniqueIds) }, withDeleted: true });

    for (const u of users) {
      nameMap.set(u.id, u.fullName);
    }
    return nameMap;
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

    // Truy vết: tên admin đã cập nhật hồ sơ gần nhất (nếu có).
    let updatedByName: string | null = null;
    if (customer.updatedBy) {
      const updater = await this.dataSource
        .getRepository(UserEntity)
        .findOne({ where: { id: customer.updatedBy }, withDeleted: true });
      updatedByName = updater?.fullName ?? null;
    }

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
      updatedAt: customer.updatedAt,
      updatedBy: customer.updatedBy ?? null,
      updatedByName,
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

  async createCustomer(dto: CreateCustomerDto, adminId?: string) {
    return asyncHandleOperation(async () => {
      // Mật khẩu tạm do hệ thống sinh; khách buộc đổi ở lần đăng nhập đầu tiên.
      const tempPassword = this.generateTempPassword();

      // Kiểm tra email trùng (kể cả đã xóa mềm) — trả lỗi có thể hành động được.
      const existing = await this.dataSource.getRepository(UserEntity).findOne({
        where: { email: dto.email },
        withDeleted: true,
      });
      if (existing) {
        if (existing.deletedAt) {
          const customer = await this.dataSource
            .getRepository(CustomerEntity)
            .findOne({
              where: { user: { id: existing.id } },
              withDeleted: true,
            });
          throw new ConflictException({
            message:
              'Email thuộc một tài khoản đã bị xóa. Hãy khôi phục thay vì tạo mới.',
            code: 'EMAIL_SOFT_DELETED',
            customerId: customer?.id ?? null,
          });
        }
        throw new ConflictException('Email đã tồn tại');
      }

      let createdId: string;
      try {
        const created = await this.dataSource.transaction(async (manager) => {
          const userRepo = manager.getRepository(UserEntity);
          const customerRepo = manager.getRepository(CustomerEntity);

          const user = await userRepo.save(
            userRepo.create({
              email: dto.email,
              fullName: dto.fullName.trim(),
              phone: dto.phone?.trim(),
              password: await bcrypt.hash(tempPassword, 10),
              provider: AuthProvider.LOCAL,
              role: UserRole.CUSTOMER,
              isVerified: true,
              isActive: true,
              mustChangePassword: true,
            }),
          );

          const customer = await customerRepo.save(
            customerRepo.create({
              user,
              updatedBy: adminId ?? null,
              ...(dto.defaultPaymentMethod
                ? { defaultPaymentMethod: dto.defaultPaymentMethod }
                : {}),
            }),
          );
          return customer;
        });
        createdId = created.id;
      } catch (err) {
        // Race: 2 request cùng email vượt qua check ở trên → unique violation 23505.
        if (
          err instanceof QueryFailedError &&
          (err.driverError as { code?: string })?.code === '23505'
        ) {
          throw new ConflictException('Email đã tồn tại');
        }
        throw err;
      }

      // Gửi mật khẩu tạm NGOÀI transaction (commit xong) — qua queue có retry,
      // không giữ kết nối/lock DB suốt round-trip SMTP. Lỗi gửi không phá tài khoản.
      await this.mailQueue.enqueueTempPassword({
        email: dto.email,
        fullName: dto.fullName.trim(),
        tempPassword,
        loginUrl: this.loginUrl(),
      });

      return this.getCustomerDetail(createdId);
    }, 'Lỗi khi tạo khách hàng');
  }

  /** Sinh lại mật khẩu tạm + gửi lại email (dùng khi email lần đầu gửi hỏng). */
  async resendTempPassword(customerId: string, adminId?: string) {
    return asyncHandleOperation(async () => {
      const customer = await this.dataSource
        .getRepository(CustomerEntity)
        .findOne({ where: { id: customerId }, relations: ['user'] });
      if (!customer || !customer.user) {
        throw new NotFoundException(
          `Không tìm thấy khách hàng với id ${customerId}`,
        );
      }
      if (customer.user.provider !== AuthProvider.LOCAL) {
        throw new ConflictException(
          'Tài khoản đăng nhập qua mạng xã hội, không dùng mật khẩu tạm.',
        );
      }

      const tempPassword = this.generateTempPassword();
      await this.dataSource.getRepository(UserEntity).update(customer.user.id, {
        password: await bcrypt.hash(tempPassword, 10),
        mustChangePassword: true,
      });
      await this.markUpdatedBy(customerId, adminId);

      await this.mailQueue.enqueueTempPassword({
        email: customer.user.email,
        fullName: customer.user.fullName,
        tempPassword,
        loginUrl: this.loginUrl(),
      });

      return { message: 'Đã gửi lại mật khẩu tạm tới email khách hàng.' };
    }, 'Lỗi khi gửi lại mật khẩu tạm');
  }

  async updateCustomer(
    customerId: string,
    dto: UpdateCustomerDto,
    adminId?: string,
  ) {
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
        }
        // Luôn ghi vết admin cập nhật (cũng bump updated_at).
        customer.updatedBy = adminId ?? customer.updatedBy ?? null;
        await customerRepo.save(customer);
      });

      return this.getCustomerDetail(customerId);
    }, 'Lỗi khi cập nhật khách hàng');
  }

  async deleteCustomer(customerId: string, adminId?: string) {
    return asyncHandleOperation(async () => {
      const customer = await this.dataSource
        .getRepository(CustomerEntity)
        .findOne({ where: { id: customerId }, relations: ['user'] });
      if (!customer || !customer.user) {
        throw new NotFoundException(
          `Không tìm thấy khách hàng với id ${customerId}`,
        );
      }

      await this.markUpdatedBy(customerId, adminId);
      await this.dataSource
        .getRepository(UserEntity)
        .softDelete(customer.user.id);

      return { message: 'Đã xóa khách hàng' };
    }, 'Lỗi khi xóa khách hàng');
  }

  async restoreCustomer(customerId: string, adminId?: string) {
    return asyncHandleOperation(async () => {
      const customer = await this.dataSource
        .getRepository(CustomerEntity)
        .findOne({
          where: { id: customerId },
          relations: ['user'],
          withDeleted: true,
        });
      if (!customer || !customer.user) {
        throw new NotFoundException(
          `Không tìm thấy khách hàng với id ${customerId}`,
        );
      }

      await this.dataSource.getRepository(UserEntity).restore(customer.user.id);
      await this.markUpdatedBy(customerId, adminId);

      return { message: 'Đã khôi phục khách hàng' };
    }, 'Lỗi khi khôi phục khách hàng');
  }

  /** Ghi vết admin đã tác động lên hồ sơ (dùng cho khóa/mở khóa, xóa, khôi phục). */
  async markUpdatedBy(customerId: string, adminId?: string) {
    if (!adminId) return;
    await this.dataSource
      .getRepository(CustomerEntity)
      .update(customerId, { updatedBy: adminId });
  }
}
