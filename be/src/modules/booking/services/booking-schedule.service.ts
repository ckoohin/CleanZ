import { BadRequestException, Injectable } from '@nestjs/common';
import { toNumber } from 'src/common/helpers/number.helper';
import {
  createVietnamDateTime,
  formatVietnamDate,
  formatVietnamTime,
} from 'src/common/helpers/vietnam-time.helper';
import { VoucherEntity } from 'src/modules/voucher/entity/voucher.entity';
import { UpdateBookingScheduleAddressDto } from '../dto/update-booking-schedule-address.dto';
import { BookingEntity } from '../entity/booking.entity';

export interface BookingScheduleDraft {
  packageId?: string;
  subServiceIds?: string[];
  addressId?: string;
  address?: string;
  provinceCode?: string;
  scheduledStart?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  durationHours?: number;
  voucherCode?: string;
  areaM2?: number;
  pricingTierId?: string;
}

export interface BookingScheduleStartContext {
  scheduledStart: Date;
  scheduledStartDate: string;
  scheduledStartTime: string;
}

export interface BookingScheduleContext {
  scheduledStart: Date;
  scheduledEnd: Date;
  scheduledStartDate: string;
  scheduledStartTime: string;
  scheduledEndDate: string;
  scheduledEndTime: string;
  durationHours: number;
}

@Injectable()
export class BookingScheduleService {
  buildScheduleStart(dto: BookingScheduleDraft): BookingScheduleStartContext {
    const scheduledStart = this.resolveScheduledStart(dto);
    if (Number.isNaN(scheduledStart.getTime())) {
      throw new BadRequestException('Thời gian bắt đầu không hợp lệ');
    }

    if (scheduledStart <= new Date()) {
      throw new BadRequestException('Thời gian đặt lịch phải ở tương lai');
    }

    return {
      scheduledStart,
      scheduledStartDate: formatVietnamDate(scheduledStart),
      scheduledStartTime: formatVietnamTime(scheduledStart),
    };
  }

  buildSchedule(
    dto: BookingScheduleDraft,
    durationHours: number,
  ): BookingScheduleContext {
    const scheduleStart = this.buildScheduleStart(dto);
    const scheduledEnd = new Date(
      scheduleStart.scheduledStart.getTime() + durationHours * 60 * 60 * 1000,
    );

    return {
      scheduledStart: scheduleStart.scheduledStart,
      scheduledEnd,
      scheduledStartDate: scheduleStart.scheduledStartDate,
      scheduledStartTime: scheduleStart.scheduledStartTime,
      scheduledEndDate: formatVietnamDate(scheduledEnd),
      scheduledEndTime: formatVietnamTime(scheduledEnd),
      durationHours,
    };
  }

  buildUpdateDraft(
    booking: BookingEntity,
    dto: UpdateBookingScheduleAddressDto,
    voucher: VoucherEntity | null,
  ): BookingScheduleDraft {
    const currentStartDate = booking.scheduledStartDate;
    const currentStartTime = this.normalizeTimeValue(
      booking.scheduledStartTime,
    );

    if (!currentStartDate || !currentStartTime) {
      throw new BadRequestException('Booking hiện tại thiếu ngày hoặc giờ làm');
    }

    if (dto.scheduledStart && (dto.scheduledDate || dto.scheduledTime)) {
      throw new BadRequestException(
        'Chỉ truyền scheduledStart hoặc scheduledDate + scheduledTime',
      );
    }

    if (
      !dto.scheduledStart &&
      ((dto.scheduledDate && !dto.scheduledTime) ||
        (!dto.scheduledDate && dto.scheduledTime))
    ) {
      throw new BadRequestException(
        'Vui lòng truyền cả scheduledDate và scheduledTime khi đổi lịch',
      );
    }

    const isManualAddressUpdate = dto.address !== undefined;
    const isSavedAddressUpdate = dto.addressId !== undefined;
    const addressId = isSavedAddressUpdate
      ? dto.addressId
      : booking.addressRef?.id;
    const address = isSavedAddressUpdate
      ? undefined
      : isManualAddressUpdate
        ? dto.address
        : booking.address;

    return {
      packageId: booking.packageId,
      subServiceIds:
        booking.bookingSubServices?.map((bss) => bss.subServiceId) || [],
      addressId,
      address,
      provinceCode: dto.provinceCode,
      scheduledStart: dto.scheduledStart,
      scheduledDate: dto.scheduledStart
        ? undefined
        : (dto.scheduledDate ?? currentStartDate),
      scheduledTime: dto.scheduledStart
        ? undefined
        : (dto.scheduledTime ?? currentStartTime),
      durationHours: toNumber(booking.durationHours),
      voucherCode: voucher?.code,
      areaM2: booking.areaM2 ? toNumber(booking.areaM2) : undefined,
      pricingTierId: booking.pricingTierId ?? undefined,
    };
  }

  private resolveScheduledStart(dto: BookingScheduleDraft): Date {
    if (dto.scheduledDate && dto.scheduledTime) {
      return createVietnamDateTime(dto.scheduledDate, dto.scheduledTime);
    }

    if (dto.scheduledStart) {
      return new Date(dto.scheduledStart);
    }

    throw new BadRequestException('Vui lòng chọn ngày và giờ bắt đầu');
  }

  private normalizeTimeValue(value?: string | null): string | undefined {
    if (!value) {
      return undefined;
    }

    return value.slice(0, 5);
  }
}
