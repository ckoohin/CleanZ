import { BookingEntity } from '../entities/booking.entity';
import { BookingResponseDto } from '../dto/booking-response.dto';

export const toBookingResponseDto = (
  entity: BookingEntity,
): BookingResponseDto => {
  return {
    id: entity.id,

    // Customer info
    customerId: entity.customer?.id,
    customerName: entity.customer?.user?.fullName,

    // Worker info
    workerId: entity.workerService?.worker?.id,
    workerName: entity.workerService?.worker?.user?.fullName,

    // Service info
    workerServiceId: entity.workerService?.id,
    serviceName: entity.workerService?.service?.name,
    serviceCategory: entity.workerService?.service?.category,

    // Booking info
    bookingType: entity.bookingType,
    serviceLocationType: entity.serviceLocationType,
    status: entity.status,

    // Schedule
    scheduledDate: entity.scheduledDate,
    scheduledTime: entity.scheduledTime,
    startedAt: entity.startedAt,
    completedAt: entity.completedAt,

    // Location
    address: entity.address,
    latitude: entity.latitude ? Number(entity.latitude) : undefined,
    longitude: entity.longitude ? Number(entity.longitude) : undefined,

    // Payment
    totalPrice: Number(entity.totalPrice),
    paymentStatus: entity.paymentStatus,
    paymentMethod: entity.paymentMethod,
    transactionId: entity.transactionId,

    // Notes & review
    customerNote: entity.customerNote,
    rating: entity.rating,
    review: entity.review,
    cancellationReason: entity.cancellationReason,
    cancelledBy: entity.cancelledBy,

    // Timestamps
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
};

export const toBookingResponseDtoList = (
  entities: BookingEntity[],
): BookingResponseDto[] => {
  return entities.map((entity) => toBookingResponseDto(entity));
};
