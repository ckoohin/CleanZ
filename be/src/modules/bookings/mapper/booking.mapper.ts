import { BookingEntity } from '../entities/booking.entity';
import {
  BookingResponseDto,
  BookingAddonResponseDto,
} from '../dto/booking-response.dto';

export class BookingMapper {
  static toResponseDto(booking: BookingEntity): BookingResponseDto {
    const response = new BookingResponseDto();

    response.id = booking.id;
    response.orderCode = booking.orderCode;
    response.customerId = booking.customer.id;
    response.customerName = booking.customer.user.fullName;
    response.customerPhone = booking.customer.user.phone;
    response.customerEmail = booking.customer.user.email;
    response.serviceId = booking.service.id;
    response.serviceName = booking.service.name;
    if (booking.staffService) {
      response.staffServiceId = booking.staffService.id;
      response.staffName = booking.staffService.staff.user.fullName;
    }
    response.bookingType = booking.bookingType;
    response.locationType = booking.locationType;
    response.address = booking.address;
    const bookingDate = new Date(booking.bookingDate);
    response.bookingDate = bookingDate.toISOString().split('T')[0];
    response.bookingTime = booking.bookingTime;
    response.estimatedHours = booking.estimatedHours
      ? Number(booking.estimatedHours)
      : undefined;
    response.actualHours = booking.actualHours
      ? Number(booking.actualHours)
      : undefined;
    response.hourlyRate = booking.hourlyRate
      ? Number(booking.hourlyRate)
      : undefined;
    response.quotedPrice = Number(booking.quotedPrice);
    response.totalPrice = Number(booking.totalPrice);
    if (booking.addons && booking.addons.length > 0) {
      response.addons = booking.addons.map((addon) => {
        const addonDto = new BookingAddonResponseDto();
        addonDto.addonName = addon.addonName;
        addonDto.addonPrice = Number(addon.addonPrice);
        return addonDto;
      });
    }
    response.specialRequests = booking.specialRequests;
    response.notes = booking.notes;
    response.status = booking.status;
    response.paymentStatus = booking.paymentStatus;
    response.confirmedAt = booking.confirmedAt;
    response.cancelledBy = booking.cancelledBy;
    response.cancellationReason = booking.cancellationReason;
    response.cancelledAt = booking.cancelledAt;
    response.createdAt = booking.createdAt;
    response.updatedAt = booking.updatedAt;

    return response;
  }
}
