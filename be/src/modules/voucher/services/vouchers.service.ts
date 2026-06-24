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
import { CustomerVoucherEntity } from '../entity/customer-voucher.entity';
import { PaginatedData } from '../../../common/helpers/response.interface';
import { VoucherType } from '../../../common/enums/voucher-type.enum';
import { CreateVoucherDto } from '../dto/create-voucher.dto';
import { VoucherListQueryDto } from '../dto/list-query-voucher.dto';
import { UpdateVoucherDto } from '../dto/update-voucher.dto';
import { IssueVoucherToCustomersDto } from '../dto/issue-voucher-to-customer.dto';
import { toNumber } from '../../../common/helpers/number.helper';

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
      usedCount: 0,
      serviceId: dto.serviceId ?? null,
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
      relations: ['service'],
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
    subServiceIds: string[],
    subtotal: number,
  ): Promise<VoucherEntity> {
    const now = new Date();
    const voucher = await manager
      .getRepository(VoucherEntity)
      .createQueryBuilder('voucher')
      .leftJoinAndSelect('voucher.service', 'service')
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
      voucher.usedCount >= voucher.usageLimit
    ) {
      throw new BadRequestException('Voucher đã hết lượt sử dụng');
    }

    if (voucher.service && !subServiceIds.includes(voucher.service.id)) {
      throw new BadRequestException(
        'Voucher không áp dụng cho các dịch vụ con đã chọn',
      );
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
      serviceId:
        dto.serviceId !== undefined ? dto.serviceId : voucher.serviceId,
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
          cv.usedAt = null;
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
    usedCount: number;
  }> {
    const voucher = await this.findOne(voucherId);
    const stats =
      await this.customerVoucherRepo.getVoucherUsageStats(voucherId);
    return {
      voucher,
      issuedCount: stats.total,
      usedCount: stats.used,
    };
  }
}
