import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager, In, Repository } from 'typeorm';
import { VoucherEntity } from 'src/modules/voucher/entity/voucher.entity';
import { VoucherService } from 'src/modules/voucher/voucher.service';
import { toNumber } from 'src/common/helpers/number.helper';
import { SystemConfigService } from '../system-config/system-config.service';
import { PricingConfigEntity } from './entity/pricing-config.entity';
import { ServiceEntity } from './entity/service.entity';

export interface CalculateBookingPriceInput {
  serviceId?: string;
  durationHours?: number;
  scheduledStart: Date;
  scheduledStartTime: string;
  hasPet: boolean;
  voucherCode?: string;
}

export interface ServiceSummary {
  id: string;
  name: string;
  description?: string | null;
}

export interface BookingPriceResult {
  service: ServiceEntity;
  durationHours: number;
  basePrice: number;
  addonPrice: number;
  peakFee: number;
  petFee: number;
  waitingFee: number;
  subtotal: number;
  discountAmount: number;
  totalPrice: number;
  voucher?: VoucherEntity | null;
}

@Injectable()
export class PricingService {
  constructor(
    private readonly voucherService: VoucherService,
    private readonly systemConfigService: SystemConfigService,
  ) {}

  async calculateBookingPrice(
    manager: EntityManager,
    input: CalculateBookingPriceInput,
  ): Promise<BookingPriceResult> {
    const serviceRepository = manager.getRepository(ServiceEntity);
    const pricingRepository = manager.getRepository(PricingConfigEntity);

    const service = await this.findBookingService(
      serviceRepository,
      input.durationHours,
      input.serviceId,
    );
    if (!service) {
      throw new NotFoundException(
        'Không tìm thấy gói dịch vụ phù hợp hoặc gói đã ngừng hoạt động',
      );
    }
    const durationHours = toNumber(service.baseDurationHours);
    if (!Number.isFinite(durationHours) || durationHours <= 0) {
      throw new NotFoundException(
        `Dịch vụ ${service.name} chưa được cấu hình thời lượng`,
      );
    }

    const pricing = await pricingRepository
      .createQueryBuilder('pricing')
      .innerJoin('pricing.service', 'service')
      .where('service.id = :serviceId', { serviceId: service.id })
      .andWhere('pricing.is_active = true')
      .orderBy('pricing.created_at', 'DESC')
      .getOne();
    if (!pricing) {
      throw new NotFoundException(
        `Không tìm thấy cấu hình giá cho dịch vụ ${service.name}`,
      );
    }

    const basePrice = toNumber(pricing.basePrice);
    const peakRate = await this.systemConfigService.getPeakRateForSchedule(
      manager,
      input.scheduledStart,
      input.scheduledStartTime,
    );
    const peakFee = peakRate > 0 ? Math.round(basePrice * peakRate) : 0;
    const petFee = input.hasPet ? toNumber(pricing.petFee) : 0;
    const addonPrice = 0;
    const waitingFee = 0;
    const subtotal = basePrice + addonPrice + peakFee + petFee + waitingFee;

    const voucher = input.voucherCode
      ? await this.voucherService.findValidForBooking(
          manager,
          input.voucherCode,
          service.id,
          subtotal,
        )
      : null;
    const discountAmount = voucher
      ? this.voucherService.calculateDiscount(voucher, subtotal)
      : 0;
    const totalPrice = Math.max(subtotal - discountAmount, 0);

    return {
      service,
      durationHours,
      basePrice,
      addonPrice,
      peakFee,
      petFee,
      waitingFee,
      subtotal,
      discountAmount,
      totalPrice,
      voucher,
    };
  }

  getServiceById(
    manager: EntityManager,
    serviceId: string,
  ): Promise<ServiceEntity | null> {
    return manager.getRepository(ServiceEntity).findOne({
      where: { id: serviceId },
    });
  }

  getServicesByIds(
    manager: EntityManager,
    serviceIds: string[],
  ): Promise<ServiceEntity[]> {
    if (!serviceIds.length) {
      return Promise.resolve([]);
    }

    return manager.getRepository(ServiceEntity).find({
      where: { id: In(serviceIds) },
    });
  }

  async getServiceSummaryById(
    manager: EntityManager,
    serviceId: string,
  ): Promise<ServiceSummary> {
    const service = await this.getServiceById(manager, serviceId);
    if (service) {
      return {
        id: service.id,
        name: service.name,
        description: service.description,
      };
    }

    return {
      id: serviceId,
      name: 'Dịch vụ đã ngừng hoạt động',
      description: null,
    };
  }

  private findBookingService(
    serviceRepository: Repository<ServiceEntity>,
    durationHours?: number,
    serviceId?: string,
  ): Promise<ServiceEntity | null> {
    if (serviceId) {
      return serviceRepository.findOne({
        where: { id: serviceId, isActive: true },
      });
    }
    if (durationHours === undefined) {
      return Promise.resolve(null);
    }

    return serviceRepository
      .createQueryBuilder('service')
      .where('service.is_active = true')
      .andWhere('service.base_duration_hours = :durationHours::numeric', {
        durationHours,
      })
      .orderBy('service.created_at', 'ASC')
      .getOne();
  }
}
