import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import {
  VoucherRepository,
  CustomerVoucherRepository,
} from '../voucher.repository';
import { VoucherEntity } from '../entity/voucher.entity';
import {
  CustomerVoucherEntity,
  CustomerVoucherStatus,
} from '../entity/customer-voucher.entity';
import { BookingEntity } from 'src/modules/booking/entity/booking.entity';
import { PaginatedData } from '../../../common/helpers/response.interface';
import { VoucherType } from '../../../common/enums/voucher-type.enum';
import { CreateVoucherDto } from '../dto/create-voucher.dto';
import { VoucherListQueryDto } from '../dto/list-query-voucher.dto';
import { UpdateVoucherDto } from '../dto/update-voucher.dto';
import { IssueVoucherToCustomersDto } from '../dto/issue-voucher-to-customer.dto';
import { toNumber } from '../../../common/helpers/number.helper';
import { CustomerEntity } from 'src/modules/customer/entity/customer.entity';

export type VoucherDisabledReason =
  | 'NOT_STARTED'
  | 'EXHAUSTED'
  | 'PER_LIMIT_REACHED'
  | null;

export interface AvailableVoucherItem {
  id: string;
  code: string;
  name: string;
  description: string | null | undefined;
  type: VoucherType;
  value: number;
  maxDiscount: number | null;
  minOrderAmount: number;
  endDate: Date | null;
  remainingUses: number | null;
  canUse: boolean;
  disabledReason: VoucherDisabledReason;
  source: 'ISSUED' | 'PUBLIC';
}

@Injectable()
export class VouchersService {
  constructor(
    private readonly voucherRepo: VoucherRepository,
    private readonly customerVoucherRepo: CustomerVoucherRepository,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateVoucherDto): Promise<VoucherEntity> {
    if (dto.type === VoucherType.PERCENT && dto.value > 100) {
      throw new BadRequestException(
        'PERCENT_VOUCHER_MAX_100: Percent value cannot exceed 100',
      );
    }

    const exists = await this.voucherRepo.existsByCode(dto.code);
    if (exists) {
      throw new ConflictException(
        'VOUCHER_CODE_EXISTS: This code is already in use',
      );
    }

    if (
      dto.startDate &&
      dto.endDate &&
      new Date(dto.startDate) >= new Date(dto.endDate)
    ) {
      throw new BadRequestException(
        'INVALID_DATE_RANGE: startDate must be before endDate',
      );
    }

    const entity = this.voucherRepo.create({
      code: dto.code.toUpperCase(),
      name: dto.name,
      description: dto.description ?? null,
      type: dto.type,
      value: dto.value,
      maxDiscount: dto.maxDiscount ?? null,
      minOrderAmount: dto.minOrderAmount ?? 0,
      usageLimit: dto.usageLimit ?? null,
      perCustomerLimit: dto.perCustomerLimit ?? null,
      usedCount: 0,
      reservedCount: 0,
      packageIds: dto.packageIds?.length ? dto.packageIds : null,
      customerIds: dto.customerIds?.length ? dto.customerIds : null,
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      isActive: dto.isActive ?? true,
    });

    return this.voucherRepo.save(entity);
  }

  async findAll(
    query: VoucherListQueryDto,
  ): Promise<PaginatedData<VoucherEntity>> {
    return this.voucherRepo.findWithPagination(query);
  }

  async findOne(id: string): Promise<VoucherEntity> {
    const voucher = await this.voucherRepo.findOne({
      where: { id },
    });
    if (!voucher) throw new NotFoundException('VOUCHER_NOT_FOUND');
    return voucher;
  }

  getById(
    manager: EntityManager,
    voucherId: string,
  ): Promise<VoucherEntity | null> {
    return manager.getRepository(VoucherEntity).findOne({
      where: { id: voucherId },
    });
  }

  async findValidForBooking(
    manager: EntityManager,
    voucherCode: string,
    customerId: string,
    packageId: string,
    subtotal: number,
    excludeBookingId?: string,
  ): Promise<VoucherEntity> {
    const now = new Date();
    const voucher = await manager
      .getRepository(VoucherEntity)
      .createQueryBuilder('voucher')
      .where('UPPER(voucher.code) = :code', {
        code: voucherCode.trim().toUpperCase(),
      })
      .andWhere('voucher.is_active = true')
      .getOne();

    if (!voucher) {
      throw new BadRequestException(
        'Voucher không tồn tại hoặc đã ngừng hoạt động',
      );
    }

    if (voucher.startDate && voucher.startDate > now) {
      throw new BadRequestException('Voucher chưa đến thời gian sử dụng');
    }

    if (voucher.endDate && voucher.endDate < now) {
      throw new BadRequestException('Voucher đã hết hạn');
    }

    if (
      voucher.usageLimit !== null &&
      voucher.usageLimit !== undefined &&
      voucher.usedCount + voucher.reservedCount >= voucher.usageLimit
    ) {
      throw new BadRequestException('Voucher đã hết lượt sử dụng');
    }

    if (voucher.packageIds?.length && !voucher.packageIds.includes(packageId)) {
      throw new BadRequestException(
        'Voucher không áp dụng cho gói dịch vụ này',
      );
    }

    if (
      voucher.customerIds?.length &&
      !voucher.customerIds.includes(customerId)
    ) {
      throw new BadRequestException('Voucher không áp dụng cho khách hàng này');
    }

    if (voucher.perCustomerLimit) {
      const activeUses = await manager
        .getRepository(CustomerVoucherEntity)
        .createQueryBuilder('cv')
        .where('cv.customerId = :customerId', { customerId })
        .andWhere('cv.voucherId = :voucherId', { voucherId: voucher.id })
        .andWhere('cv.status IN (:...statuses)', {
          statuses: [
            CustomerVoucherStatus.RESERVED,
            CustomerVoucherStatus.USED,
          ],
        })
        .andWhere(
          excludeBookingId
            ? '(cv.bookingId IS NULL OR cv.bookingId != :excludeBookingId)'
            : '1=1',
          { excludeBookingId },
        )
        .getCount();

      if (activeUses >= voucher.perCustomerLimit) {
        throw new BadRequestException(
          'Bạn đã đạt giới hạn sử dụng voucher này',
        );
      }
    }

    if (subtotal < toNumber(voucher.minOrderAmount)) {
      throw new BadRequestException(
        'Đơn hàng chưa đạt giá trị tối thiểu của voucher',
      );
    }

    return voucher;
  }

  calculateDiscount(voucher: VoucherEntity, subtotal: number): number {
    if (voucher.type === VoucherType.FIXED) {
      return Math.min(toNumber(voucher.value), subtotal);
    }

    const discount = (subtotal * toNumber(voucher.value)) / 100;
    const maxDiscount = toNumber(voucher.maxDiscount);

    return Math.min(
      maxDiscount > 0 ? Math.min(discount, maxDiscount) : discount,
      subtotal,
    );
  }

  async update(id: string, dto: UpdateVoucherDto): Promise<VoucherEntity> {
    const voucher = await this.findOne(id);

    if (dto.code && dto.code !== voucher.code) {
      const exists = await this.voucherRepo.existsByCode(dto.code, id);
      if (exists) throw new ConflictException('VOUCHER_CODE_EXISTS');
    }

    if (
      dto.type === VoucherType.PERCENT &&
      (dto.value ?? voucher.value) > 100
    ) {
      throw new BadRequestException('PERCENT_VOUCHER_MAX_100');
    }

    Object.assign(voucher, {
      code: dto.code ? dto.code.toUpperCase() : voucher.code,
      name: dto.name ?? voucher.name,
      description:
        dto.description !== undefined ? dto.description : voucher.description,
      type: dto.type ?? voucher.type,
      value: dto.value ?? voucher.value,
      maxDiscount:
        dto.maxDiscount !== undefined ? dto.maxDiscount : voucher.maxDiscount,
      minOrderAmount: dto.minOrderAmount ?? voucher.minOrderAmount,
      usageLimit:
        dto.usageLimit !== undefined ? dto.usageLimit : voucher.usageLimit,
      perCustomerLimit:
        dto.perCustomerLimit !== undefined
          ? dto.perCustomerLimit
          : voucher.perCustomerLimit,
      packageIds:
        dto.packageIds !== undefined
          ? dto.packageIds.length
            ? dto.packageIds
            : null
          : voucher.packageIds,
      customerIds:
        dto.customerIds !== undefined
          ? dto.customerIds.length
            ? dto.customerIds
            : null
          : voucher.customerIds,
      startDate: dto.startDate ? new Date(dto.startDate) : voucher.startDate,
      endDate: dto.endDate ? new Date(dto.endDate) : voucher.endDate,
      isActive: dto.isActive !== undefined ? dto.isActive : voucher.isActive,
    });

    return this.voucherRepo.save(voucher);
  }

  async remove(id: string): Promise<void> {
    const voucher = await this.findOne(id);
    await this.voucherRepo.remove(voucher);
  }

  async issueToCustomers(
    voucherId: string,
    dto: IssueVoucherToCustomersDto,
  ): Promise<{ issued: number; skipped: number }> {
    const voucher = await this.findOne(voucherId);

    if (!voucher.isActive) {
      throw new BadRequestException(
        'VOUCHER_INACTIVE: Cannot issue an inactive voucher',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const alreadyIssued =
        await this.customerVoucherRepo.findIssuedCustomerIds(
          voucherId,
          dto.customerIds,
        );
      const alreadyIssuedSet = new Set(alreadyIssued);
      const newCustomerIds = dto.customerIds.filter(
        (id) => !alreadyIssuedSet.has(id),
      );

      if (newCustomerIds.length > 0) {
        const records = newCustomerIds.map((customerId) => {
          const cv = new CustomerVoucherEntity();
          cv.customerId = customerId;
          cv.voucherId = voucherId;
          cv.isUsed = false;
          cv.status = CustomerVoucherStatus.ISSUED;

          return cv;
        });
        await queryRunner.manager.save(CustomerVoucherEntity, records);
      }

      await queryRunner.commitTransaction();

      return {
        issued: newCustomerIds.length,
        skipped: alreadyIssued.length,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async getVoucherStats(voucherId: string): Promise<{
    voucher: VoucherEntity;
    issuedCount: number;
    reservedCount: number;
    usedCount: number;
    releasedCount: number;
    totalDiscountAmount: number;
    totalOrderAmount: number;
    conversionRate: number;
    usages: Awaited<
      ReturnType<CustomerVoucherRepository['getVoucherUsageStatsDetail']>
    >['rows'];
  }> {
    const voucher = await this.findOne(voucherId);
    const stats =
      await this.customerVoucherRepo.getVoucherUsageStatsDetail(voucherId);
    return {
      voucher,
      issuedCount: stats.total,
      reservedCount: stats.reserved,
      usedCount: stats.used,
      releasedCount: stats.released,
      totalDiscountAmount: stats.totalDiscountAmount,
      totalOrderAmount: stats.totalOrderAmount,
      conversionRate: stats.conversionRate,
      usages: stats.rows,
    };
  }

  async reserveForBooking(
    manager: EntityManager,
    input: {
      bookingId: string;
      customerId: string;
      voucherId?: string | null;
    },
  ): Promise<void> {
    await this.releaseReservationForBooking(manager, input.bookingId);
    if (!input.voucherId) return;

    const voucherRepo = manager.getRepository(VoucherEntity);
    const voucher = await voucherRepo
      .createQueryBuilder('voucher')
      .setLock('pessimistic_write')
      .where('voucher.id = :voucherId', { voucherId: input.voucherId })
      .getOne();

    if (!voucher) throw new NotFoundException('VOUCHER_NOT_FOUND');
    if (
      voucher.usageLimit !== null &&
      voucher.usageLimit !== undefined &&
      voucher.usedCount + voucher.reservedCount >= voucher.usageLimit
    ) {
      throw new BadRequestException('Voucher đã hết lượt sử dụng');
    }

    if (voucher.perCustomerLimit) {
      const activeUses = await manager
        .getRepository(CustomerVoucherEntity)
        .createQueryBuilder('cv')
        .where('cv.customerId = :customerId', { customerId: input.customerId })
        .andWhere('cv.voucherId = :voucherId', { voucherId: input.voucherId })
        .andWhere('cv.status IN (:...statuses)', {
          statuses: [
            CustomerVoucherStatus.RESERVED,
            CustomerVoucherStatus.USED,
          ],
        })
        .getCount();

      if (activeUses >= voucher.perCustomerLimit) {
        throw new BadRequestException(
          'Bạn đã đạt giới hạn sử dụng voucher này',
        );
      }
    }

    const reservationRepo = manager.getRepository(CustomerVoucherEntity);
    await reservationRepo.save(
      reservationRepo.create({
        customerId: input.customerId,
        voucherId: input.voucherId,
        bookingId: input.bookingId,
        isUsed: false,
        status: CustomerVoucherStatus.RESERVED,
        reservedAt: new Date(),
      }),
    );

    await voucherRepo.increment({ id: input.voucherId }, 'reservedCount', 1);
  }

  async releaseReservationForBooking(
    manager: EntityManager,
    bookingId: string,
  ): Promise<void> {
    // UPDATE có điều kiện status (atomic): hai transaction đồng thời cùng release
    // một booking thì chỉ một bên match RESERVED, tránh decrement reservedCount 2 lần.
    const result = await manager
      .getRepository(CustomerVoucherEntity)
      .createQueryBuilder()
      .update()
      .set({ status: CustomerVoucherStatus.RELEASED })
      .where('booking_id = :bookingId', { bookingId })
      .andWhere('status = :status', { status: CustomerVoucherStatus.RESERVED })
      .returning('voucher_id')
      .execute();

    const releasedRows = result.raw as { voucher_id: string }[];
    for (const row of releasedRows) {
      await manager
        .getRepository(VoucherEntity)
        .decrement({ id: row.voucher_id }, 'reservedCount', 1);
    }
  }

  async markBookingVoucherUsed(
    manager: EntityManager,
    bookingId: string,
  ): Promise<void> {
    const reservationRepo = manager.getRepository(CustomerVoucherEntity);
    const voucherRepo = manager.getRepository(VoucherEntity);
    const result = await reservationRepo
      .createQueryBuilder()
      .update()
      .set({
        status: CustomerVoucherStatus.USED,
        isUsed: true,
        usedAt: new Date(),
      })
      .where('booking_id = :bookingId', { bookingId })
      .andWhere('status = :status', { status: CustomerVoucherStatus.RESERVED })
      .returning('voucher_id')
      .execute();

    const usedRows = result.raw as { voucher_id: string }[];
    if (usedRows.length > 0) {
      for (const row of usedRows) {
        await voucherRepo.decrement({ id: row.voucher_id }, 'reservedCount', 1);
        await voucherRepo.increment({ id: row.voucher_id }, 'usedCount', 1);
      }
      return;
    }

    const alreadyUsed = await reservationRepo.existsBy({
      bookingId,
      status: CustomerVoucherStatus.USED,
    });
    if (alreadyUsed) return;

    const booking = await manager.getRepository(BookingEntity).findOne({
      where: { id: bookingId },
      relations: ['customer'],
    });

    if (!booking?.voucherId || !booking.customer?.id) return;

    await reservationRepo.save(
      reservationRepo.create({
        customerId: booking.customer.id,
        voucherId: booking.voucherId,
        bookingId,
        isUsed: true,
        status: CustomerVoucherStatus.USED,
        usedAt: new Date(),
      }),
    );
    await voucherRepo.increment({ id: booking.voucherId }, 'usedCount', 1);
  }

  async findAvailableForCustomer(
    userId: string,
    packageId?: string,
  ): Promise<AvailableVoucherItem[]> {
    const customer = await this.dataSource
      .getRepository(CustomerEntity)
      .findOne({ where: { user: { id: userId } } });

    if (!customer) return [];

    return this.findAvailableForCustomerId(customer.id, packageId);
  }

  async findAvailableForCustomerId(
    customerId: string,
    packageId?: string,
  ): Promise<AvailableVoucherItem[]> {
    const now = new Date();

    // 1. Vouchers được admin phát riêng cho customer này (ISSUED)
    const issuedRows = await this.customerVoucherRepo
      .createQueryBuilder('cv')
      .innerJoinAndSelect('cv.voucher', 'v')
      .where('cv.customerId = :customerId', { customerId })
      .andWhere('cv.status = :status', { status: CustomerVoucherStatus.ISSUED })
      .andWhere('v.is_active = true')
      .getMany();

    const issuedVouchers = issuedRows.map((row) => ({
      voucher: row.voucher,
      source: 'ISSUED' as const,
    }));
    const issuedIds = new Set(issuedVouchers.map((iv) => iv.voucher.id));

    // 2. Vouchers public (không giới hạn customer, khớp packageId nếu có)
    const qb = this.voucherRepo
      .createQueryBuilder('v')
      .where('v.is_active = true')
      .andWhere('(v.end_date IS NULL OR v.end_date > :now)', { now });

    if (packageId) {
      qb.andWhere(
        "(v.package_ids IS NULL OR v.package_ids = 'null'::jsonb OR v.package_ids @> :pid::jsonb)",
        { pid: JSON.stringify([packageId]) },
      );
    }

    const publicVouchers = (await qb.getMany())
      .filter((v) => !issuedIds.has(v.id))
      .map((v) => ({ voucher: v, source: 'PUBLIC' as const }));

    const allEntries = [...issuedVouchers, ...publicVouchers];
    if (!allEntries.length) return [];

    // 3. Đếm số lần customer đang dùng (RESERVED + USED) cho từng voucher
    const voucherIds = allEntries.map((e) => e.voucher.id);
    const usageRows = await this.customerVoucherRepo
      .createQueryBuilder('cv')
      .select('cv.voucherId', 'voucherId')
      .addSelect('COUNT(*)', 'cnt')
      .where('cv.customerId = :customerId', { customerId })
      .andWhere('cv.voucherId IN (:...voucherIds)', { voucherIds })
      .andWhere('cv.status IN (:...statuses)', {
        statuses: [CustomerVoucherStatus.RESERVED, CustomerVoucherStatus.USED],
      })
      .groupBy('cv.voucherId')
      .getRawMany<{ voucherId: string; cnt: string }>();

    const usageMap = new Map(
      usageRows.map((r) => [r.voucherId, parseInt(r.cnt, 10)]),
    );

    return allEntries.map(({ voucher, source }) => {
      const remaining =
        voucher.usageLimit !== null
          ? Math.max(
              0,
              voucher.usageLimit - voucher.usedCount - voucher.reservedCount,
            )
          : null;

      let canUse = true;
      let disabledReason: VoucherDisabledReason = null;

      if (voucher.startDate && voucher.startDate > now) {
        canUse = false;
        disabledReason = 'NOT_STARTED';
      } else if (remaining !== null && remaining <= 0) {
        canUse = false;
        disabledReason = 'EXHAUSTED';
      } else if (voucher.perCustomerLimit) {
        const used = usageMap.get(voucher.id) ?? 0;
        if (used >= voucher.perCustomerLimit) {
          canUse = false;
          disabledReason = 'PER_LIMIT_REACHED';
        }
      }

      return {
        id: voucher.id,
        code: voucher.code,
        name: voucher.name,
        description: voucher.description,
        type: voucher.type,
        value: toNumber(voucher.value),
        maxDiscount: voucher.maxDiscount ? toNumber(voucher.maxDiscount) : null,
        minOrderAmount: toNumber(voucher.minOrderAmount),
        endDate: voucher.endDate,
        remainingUses: remaining,
        canUse,
        disabledReason,
        source,
      };
    });
  }
}
