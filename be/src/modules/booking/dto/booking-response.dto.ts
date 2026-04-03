import { BookingType } from 'src/common/enums/booking-type.enum';
import { BookingStatus } from 'src/common/enums/booking-status.enum';
import { ServiceLocationType } from 'src/common/enums/service-location-type.enum';
import { PaymentStatus } from 'src/common/enums/payment-status.enum';

export class BookingResponseDto {
  id!: string;

  // Customer info
  customerId!: string;
  customerName?: string;

  // Worker info
  workerId!: string;
  workerName?: string;

  // Service info
  workerServiceId!: string;
  serviceName!: string;
  serviceCategory!: string;

  // Booking info
  bookingType!: BookingType;
  serviceLocationType!: ServiceLocationType;
  status!: BookingStatus;

  // Schedule
  scheduledDate?: string;
  scheduledTime?: string;
  startedAt?: Date;
  completedAt?: Date;

  // Location
  address?: string;
  latitude?: number;
  longitude?: number;

  // Payment
  totalPrice!: number;
  paymentStatus!: PaymentStatus;
  paymentMethod?: string;
  transactionId?: string;

  // Notes & review
  customerNote?: string;
  rating?: number;
  review?: string;
  cancellationReason?: string;
  cancelledBy?: string;

  // Timestamps
  createdAt!: Date;
  updatedAt!: Date;
}

export class PaginatedBookingResponseDto {
  data!: BookingResponseDto[];
  meta!: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
