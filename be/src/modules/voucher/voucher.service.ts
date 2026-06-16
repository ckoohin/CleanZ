import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { toNumber } from 'src/common/helpers/number.helper';
import { VoucherEntity, VoucherType } from './entity/voucher.entity';

@Injectable()
export class VoucherService {
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
    serviceId: string,
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
      throw new NotFoundException(
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

    if (voucher.service && voucher.service.id !== serviceId) {
      throw new BadRequestException('Voucher không áp dụng cho dịch vụ này');
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
}
