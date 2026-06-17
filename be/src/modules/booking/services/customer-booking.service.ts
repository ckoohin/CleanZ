import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType } from 'src/common/enums/notification-type.enum';
import { NotificationRefType } from 'src/common/enums/notification-ref-type.enum';
import { NotificationService } from 'src/modules/notification/notification.service';
import { generateOrderCode } from 'src/common/helpers/generate-code';
import { BookingStatus } from 'src/common/enums/booking-status.enum';
import { PaymentMethod } from 'src/common/enums/payment-method.enum';
import { PaymentStatus } from 'src/common/enums/payment-status.enum';
import { CustomerAddressEntity } from 'src/modules/customer/entity/customer-address.entity';
import { CustomerEntity } from 'src/modules/customer/entity/customer.entity';
import { UserEntity } from 'src/modules/users/entities/user.entity';
import { DataSource, EntityManager, Repository } from 'typeorm';

import { PricingService } from 'src/modules/pricing/pricing.service';
import { VoucherService } from 'src/modules/voucher/voucher.service';
import { VoucherEntity } from 'src/modules/voucher/entity/voucher.entity';
import { toNumber } from 'src/common/helpers/number.helper';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { CancelBookingDto } from '../dto/cancel-booking.dto';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { QuoteBookingDto } from '../dto/quote-booking.dto';
import { UpdateBookingScheduleAddressDto } from '../dto/update-booking-schedule-address.dto';
import {
  BookingStatusLogEntity,
  CancelledBy,
} from '../entity/booking-status-log.entity';
import { BookingEntity } from '../entity/booking.entity';
import { ServiceEntity } from '../../pricing/entity/service.entity';
import { PaymentService } from 'src/modules/payment/payment.service';
import {
  BookingScheduleDraft,
  BookingScheduleService,
} from './booking-schedule.service';
import { BookingPolicyService } from './booking-policy.service';
import { BookingLocationPolicyService } from './booking-location-policy.service';

interface BookingPricingContext {
  customer: CustomerEntity;
  service: ServiceEntity;
  addressRef: CustomerAddressEntity | null;
  bookingAddress: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  scheduledStartDate: string;
  scheduledStartTime: string;
  scheduledEndDate: string;
  scheduledEndTime: string;
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

export type CustomerBookingQuoteResponse = Record<string, unknown>;
export type CustomerBookingDetailResponse = Record<string, unknown>;
export type CustomerBookingCreatedResponse = Record<string, unknown>;

const DEFAULT_PAYMENT_METHOD = PaymentMethod.CASH;

@Injectable()
export class CustomerBookingService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly bookingLocationPolicyService: BookingLocationPolicyService,
    private readonly bookingPolicyService: BookingPolicyService,
    private readonly bookingScheduleService: BookingScheduleService,
    private readonly paymentService: PaymentService,
    private readonly pricingService: PricingService,
    private readonly voucherService: VoucherService,
    private readonly notificationService: NotificationService,
  ) {}

  private readonly logger = new Logger(CustomerBookingService.name);

  async quote(
    userId: string,
    dto: QuoteBookingDto,
  ): Promise<CustomerBookingQuoteResponse> {
    return asyncHandleOperation(async () => {
      const context = await this.buildBookingPricingContext(
        this.dataSource.manager,
        userId,
        dto,
      );

      return {
        service: {
          id: context.service.id,
          name: context.service.name,
        },
        address: {
          id: context.addressRef?.id ?? null,
          fullAddress: context.bookingAddress,
          hasPet: context.addressRef?.hasPet ?? false,
        },
        schedule: {
          scheduledStartDate: context.scheduledStartDate,
          scheduledStartTime: context.scheduledStartTime,
          scheduledEndDate: context.scheduledEndDate,
          scheduledEndTime: context.scheduledEndTime,
          durationHours: context.durationHours,
        },
        price: {
          basePrice: context.basePrice,
          addonPrice: context.addonPrice,
          peakFee: context.peakFee,
          petFee: context.petFee,
          waitingFee: context.waitingFee,
          subtotal: context.subtotal,
          discountAmount: context.discountAmount,
          totalPrice: context.totalPrice,
        },
        voucher: context.voucher
          ? {
              id: context.voucher.id,
              code: context.voucher.code,
              name: context.voucher.name,
            }
          : null,
      };
    }, 'Không thể báo giá booking');
  }

  async create(
    userId: string,
    dto: CreateBookingDto,
  ): Promise<CustomerBookingCreatedResponse> {
    return asyncHandleOperation(async () => {
      return this.dataSource.transaction(async (manager) => {
        const bookingRepository = manager.getRepository(BookingEntity);
        const logRepository = manager.getRepository(BookingStatusLogEntity);
        const context = await this.buildBookingPricingContext(
          manager,
          userId,
          dto,
        );

        await this.bookingPolicyService.assertCustomerCanCreateBooking(
          manager,
          context.customer.id,
        );

        const bookingCode =
          await this.generateUniqueBookingCode(bookingRepository);
        const paymentMethod = dto.paymentMethod ?? DEFAULT_PAYMENT_METHOD;
        const booking = bookingRepository.create({
          bookingCode,
          customer: context.customer,
          tasker: null,
          serviceId: context.service.id,
          address: context.bookingAddress,
          addressRef: context.addressRef,
          note: dto.note,
          scheduledStartDate: context.scheduledStartDate,
          scheduledStartTime: context.scheduledStartTime,
          scheduledEndDate: context.scheduledEndDate,
          scheduledEndTime: context.scheduledEndTime,
          durationHours: context.durationHours,
          status: BookingStatus.POSTED,
          basePrice: context.basePrice,
          addonPrice: context.addonPrice,
          peakFee: context.peakFee,
          petFee: context.petFee,
          waitingFee: context.waitingFee,
          discountAmount: context.discountAmount,
          totalPrice: context.totalPrice,
          paymentMethod,
          paymentStatus: PaymentStatus.PENDING,
          voucherId: context.voucher?.id,
          isRecurring: false,
          recurringRule: null,
        });
        const savedBooking = await bookingRepository.save(booking);

        await this.paymentService.createPendingPayment(
          manager,
          savedBooking,
          context.customer,
          paymentMethod,
          context.totalPrice,
        );

        const statusLog = logRepository.create({
          booking: savedBooking,
          oldStatus: null,
          newStatus: BookingStatus.POSTED,
          changedByUser: { id: userId } as UserEntity,
          note: 'Người dùng tạo booking',
          cancellationFee: 0,
          refundAmount: 0,
        });
        await logRepository.save(statusLog);

        return this.mapCreatedBookingResponse(
          savedBooking,
          context,
          paymentMethod,
        );
      });
    }, 'Không thể tạo booking');
  }

  async findMyBookingDetail(
    userId: string,
    bookingId: string,
  ): Promise<CustomerBookingDetailResponse> {
    return asyncHandleOperation(async () => {
      const booking = await this.dataSource
        .getRepository(BookingEntity)
        .createQueryBuilder('booking')
        .leftJoinAndSelect('booking.customer', 'customer')
        .leftJoinAndSelect('customer.user', 'customerUser')
        .leftJoinAndSelect('booking.addressRef', 'addressRef')
        .leftJoinAndSelect('booking.tasker', 'tasker')
        .leftJoinAndSelect('tasker.user', 'taskerUser')
        .where('booking.id = :bookingId', { bookingId })
        .andWhere('customerUser.id = :userId', { userId })
        .getOne();

      if (!booking) {
        throw new NotFoundException(
          'Booking không tồn tại hoặc không thuộc customer hiện tại',
        );
      }

      const [service, payment, statusLogs, voucher] = await Promise.all([
        this.pricingService.getServiceSummaryById(
          this.dataSource.manager,
          booking.serviceId,
        ),
        this.paymentService.findLatestByBookingId(
          this.dataSource.manager,
          booking.id,
        ),
        this.dataSource.getRepository(BookingStatusLogEntity).find({
          where: { booking: { id: booking.id } },
          order: { createdAt: 'ASC' },
        }),
        booking.voucherId
          ? this.voucherService.getById(
              this.dataSource.manager,
              booking.voucherId,
            )
          : Promise.resolve(null),
      ]);

      return {
        id: booking.id,
        bookingCode: booking.bookingCode,
        status: booking.status,
        service,
        address: {
          id: booking.addressRef?.id ?? null,
          label: booking.addressRef?.label ?? null,
          fullAddress: booking.address,
          wardDetail: booking.addressRef?.wardDetail ?? null,
          latitude: booking.addressRef?.latitude ?? null,
          longitude: booking.addressRef?.longitude ?? null,
          hasPet: booking.addressRef?.hasPet ?? false,
        },
        schedule: {
          scheduledStartDate: booking.scheduledStartDate,
          scheduledStartTime: booking.scheduledStartTime,
          scheduledEndDate: booking.scheduledEndDate,
          scheduledEndTime: booking.scheduledEndTime,
          durationHours: toNumber(booking.durationHours),
        },
        price: {
          basePrice: toNumber(booking.basePrice),
          addonPrice: toNumber(booking.addonPrice),
          peakFee: toNumber(booking.peakFee),
          petFee: toNumber(booking.petFee),
          waitingFee: toNumber(booking.waitingFee),
          discountAmount: toNumber(booking.discountAmount),
          totalPrice: toNumber(booking.totalPrice),
        },
        payment: {
          method: booking.paymentMethod,
          status: booking.paymentStatus,
          latestPaymentId: payment?.id ?? null,
          amount: payment ? toNumber(payment.amount) : null,
          transactionCode: payment?.transactionCode ?? null,
          paidAt: payment?.paidAt ?? null,
        },
        voucher: voucher
          ? {
              id: voucher.id,
              code: voucher.code,
              name: voucher.name,
            }
          : null,
        tasker: booking.tasker
          ? {
              id: booking.tasker.id,
              fullName: booking.tasker.user?.fullName ?? null,
              phone: booking.tasker.user?.phone ?? null,
              avatarUrl: booking.tasker.user?.avatarUrl ?? null,
              ratingAvg: toNumber(booking.tasker.ratingAvg),
            }
          : null,
        statusLogs: statusLogs.map((log) => ({
          id: log.id,
          oldStatus: log.oldStatus,
          newStatus: log.newStatus,
          note: log.note,
          createdAt: log.createdAt,
        })),
        note: booking.note,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
      };
    }, 'Không thể lấy chi tiết booking');
  }

  async updateScheduleAndAddress(
    userId: string,
    bookingId: string,
    dto: UpdateBookingScheduleAddressDto,
  ): Promise<CustomerBookingDetailResponse> {
    return asyncHandleOperation(async () => {
      await this.dataSource.transaction(async (manager) => {
        const booking = await manager
          .getRepository(BookingEntity)
          .createQueryBuilder('booking')
          .leftJoinAndSelect('booking.customer', 'customer')
          .leftJoinAndSelect('customer.user', 'customerUser')
          .leftJoinAndSelect('booking.addressRef', 'addressRef')
          .leftJoinAndSelect('booking.tasker', 'tasker')
          .setLock('pessimistic_write', undefined, ['booking'])
          .where('booking.id = :bookingId', { bookingId })
          .andWhere('customerUser.id = :userId', { userId })
          .getOne();

        if (!booking) {
          throw new NotFoundException(
            'Booking không tồn tại hoặc không thuộc customer hiện tại',
          );
        }

        this.bookingPolicyService.assertCanUpdateScheduleAndAddress(booking);

        const voucher = booking.voucherId
          ? await this.voucherService.getById(manager, booking.voucherId)
          : null;
        const draft = this.bookingScheduleService.buildUpdateDraft(
          booking,
          dto,
          voucher,
        );
        const context = await this.buildBookingPricingContext(
          manager,
          userId,
          draft,
        );

        booking.address = context.bookingAddress;
        booking.addressRef = context.addressRef;
        booking.scheduledStartDate = context.scheduledStartDate;
        booking.scheduledStartTime = context.scheduledStartTime;
        booking.scheduledEndDate = context.scheduledEndDate;
        booking.scheduledEndTime = context.scheduledEndTime;
        booking.basePrice = context.basePrice;
        booking.addonPrice = context.addonPrice;
        booking.peakFee = context.peakFee;
        booking.petFee = context.petFee;
        booking.waitingFee = context.waitingFee;
        booking.discountAmount = context.discountAmount;
        booking.totalPrice = context.totalPrice;
        booking.voucherId = context.voucher?.id ?? null;

        const savedBooking = await manager
          .getRepository(BookingEntity)
          .save(booking);

        await this.paymentService.updateLatestPendingPaymentAmount(
          manager,
          savedBooking.id,
          context.totalPrice,
        );

        const statusLog = manager.getRepository(BookingStatusLogEntity).create({
          booking: savedBooking,
          oldStatus: savedBooking.status,
          newStatus: savedBooking.status,
          changedByUser: { id: userId } as UserEntity,
          note: 'Customer updated booking address or schedule',
          cancellationFee: 0,
          refundAmount: 0,
        });
        await manager.getRepository(BookingStatusLogEntity).save(statusLog);
      });

      return this.findMyBookingDetail(userId, bookingId);
    }, 'Không thể cập nhật địa chỉ hoặc lịch booking');
  }

  async cancelByCustomer(
    userId: string,
    bookingId: string,
    dto: CancelBookingDto,
  ): Promise<CustomerBookingDetailResponse> {
    return asyncHandleOperation(async () => {
      let taskerUserId: string | undefined;
      let bookingCode = '';
      await this.dataSource.transaction(async (manager) => {
        const booking = await manager
          .getRepository(BookingEntity)
          .createQueryBuilder('booking')
          .leftJoinAndSelect('booking.customer', 'customer')
          .leftJoinAndSelect('customer.user', 'customerUser')
          .leftJoinAndSelect('booking.tasker', 'tasker')
          .leftJoinAndSelect('tasker.user', 'taskerUser')
          .setLock('pessimistic_write', undefined, ['booking'])
          .where('booking.id = :bookingId', { bookingId })
          .andWhere('customerUser.id = :userId', { userId })
          .getOne();

        if (!booking) {
          throw new NotFoundException(
            'Booking không tồn tại hoặc không thuộc customer hiện tại',
          );
        }

        this.bookingPolicyService.assertCustomerCanCancel(booking);

        const oldStatus = booking.status;
        booking.status = BookingStatus.CANCELLED;
        booking.cancelledAt = new Date();
        taskerUserId = booking.tasker?.user?.id;
        bookingCode = booking.bookingCode;
        const savedBooking = await manager
          .getRepository(BookingEntity)
          .save(booking);
        await manager.increment(
          CustomerEntity,
          { id: booking.customer.id },
          'totalCancelled',
          1,
        );

        const latestPayment = await this.paymentService.findLatestByBookingId(
          manager,
          savedBooking.id,
        );
        const refundAmount =
          latestPayment?.status === PaymentStatus.PAID
            ? toNumber(latestPayment.amount)
            : 0;

        const statusLog = manager.getRepository(BookingStatusLogEntity).create({
          booking: savedBooking,
          oldStatus,
          newStatus: BookingStatus.CANCELLED,
          changedByUser: { id: userId } as UserEntity,
          note: 'Người dùng hủy booking',
          cancelledBy: CancelledBy.CUSTOMER,
          cancelledByUser: { id: userId } as UserEntity,
          cancelReason: dto.reason?.trim() || null,
          cancellationFee: 0,
          refundAmount,
          payment: latestPayment ?? null,
        });
        await manager.getRepository(BookingStatusLogEntity).save(statusLog);
      });

      // Sau commit: nếu đơn đã có tasker → báo tasker rằng customer đã hủy.
      if (taskerUserId) {
        void this.notificationService
          .notify({
            userId: taskerUserId,
            type: NotificationType.BOOKING_CANCELLED,
            title: 'Đơn đã bị khách hủy',
            content: `Đơn ${bookingCode} đã bị khách hàng hủy.`,
            referenceType: NotificationRefType.BOOKING,
            referenceId: bookingId,
            dedupeKey: `booking:${bookingId}:${NotificationType.BOOKING_CANCELLED}`,
          })
          .catch((err) =>
            this.logger.error(`Không thể enqueue noti hủy booking: ${err}`),
          );
      }

      return { message: 'Booking đã được hủy thành công' };
    }, 'Không thể hủy booking');
  }

  private async buildBookingPricingContext(
    manager: EntityManager,
    userId: string,
    dto: BookingScheduleDraft,
  ): Promise<BookingPricingContext> {
    const scheduleStart = this.bookingScheduleService.buildScheduleStart(dto);

    const customerRepository = manager.getRepository(CustomerEntity);
    const addressRepository = manager.getRepository(CustomerAddressEntity);

    const customer = await customerRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });
    if (!customer) {
      throw new NotFoundException('Không tìm thấy hồ sơ customer');
    }
    if (!customer.user.phone?.trim()) {
      throw new BadRequestException(
        'Vui lòng cập nhật số điện thoại trước khi đặt booking',
      );
    }

    const addressRef = dto.addressId
      ? await addressRepository.findOne({
          where: { id: dto.addressId, customer: { id: customer.id } },
        })
      : await addressRepository.findOne({
          where: { customer: { id: customer.id }, isDefault: true },
          order: { createdAt: 'DESC' },
        });

    if (dto.addressId && !addressRef) {
      throw new NotFoundException(
        'Địa chỉ không tồn tại hoặc không thuộc customer',
      );
    }

    if (!addressRef) {
      throw new BadRequestException(
        'Vui lòng tạo địa chỉ mặc định trước khi sử dụng dịch vụ',
      );
    }

    const bookingAddress = addressRef.fullAddress;
    if (!bookingAddress) {
      throw new BadRequestException('Địa chỉ mặc định không hợp lệ');
    }
    await this.bookingLocationPolicyService.assertSupportedBookingArea(
      manager,
      dto,
      bookingAddress,
      addressRef,
    );

    const price = await this.pricingService.calculateBookingPrice(manager, {
      serviceId: dto.serviceId,
      durationHours: dto.durationHours,
      scheduledStart: scheduleStart.scheduledStart,
      scheduledStartTime: scheduleStart.scheduledStartTime,
      hasPet: addressRef?.hasPet ?? false,
      voucherCode: dto.voucherCode,
    });
    const schedule = this.bookingScheduleService.buildSchedule(
      dto,
      price.durationHours,
    );

    return {
      customer,
      service: price.service,
      addressRef,
      bookingAddress,
      scheduledStart: schedule.scheduledStart,
      scheduledEnd: schedule.scheduledEnd,
      scheduledStartDate: schedule.scheduledStartDate,
      scheduledStartTime: schedule.scheduledStartTime,
      scheduledEndDate: schedule.scheduledEndDate,
      scheduledEndTime: schedule.scheduledEndTime,
      durationHours: schedule.durationHours,
      basePrice: price.basePrice,
      addonPrice: price.addonPrice,
      peakFee: price.peakFee,
      petFee: price.petFee,
      waitingFee: price.waitingFee,
      subtotal: price.subtotal,
      discountAmount: price.discountAmount,
      totalPrice: price.totalPrice,
      voucher: price.voucher,
    };
  }

  private async generateUniqueBookingCode(
    bookingRepository: Repository<BookingEntity>,
  ): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const bookingCode = generateOrderCode();
      const existingBooking = await bookingRepository.findOne({
        where: { bookingCode },
      });

      if (!existingBooking) {
        return bookingCode;
      }
    }
    throw new BadRequestException('Không thể tạo mã booking, vui lòng thử lại');
  }

  private mapCreatedBookingResponse(
    booking: BookingEntity,
    context: BookingPricingContext,
    paymentMethod: PaymentMethod,
  ): CustomerBookingCreatedResponse {
    return {
      id: booking.id,
      bookingCode: booking.bookingCode,
      status: booking.status,
      service: {
        id: context.service.id,
        name: context.service.name,
        description: context.service.description ?? null,
      },
      address: {
        id: context.addressRef?.id ?? null,
        label: context.addressRef?.label ?? null,
        fullAddress: context.bookingAddress,
        wardDetail: context.addressRef?.wardDetail ?? null,
        latitude: context.addressRef?.latitude ?? null,
        longitude: context.addressRef?.longitude ?? null,
        hasPet: context.addressRef?.hasPet ?? false,
      },
      schedule: {
        scheduledStartDate: context.scheduledStartDate,
        scheduledStartTime: context.scheduledStartTime,
        scheduledEndDate: context.scheduledEndDate,
        scheduledEndTime: context.scheduledEndTime,
        durationHours: context.durationHours,
      },
      price: {
        basePrice: context.basePrice,
        addonPrice: context.addonPrice,
        peakFee: context.peakFee,
        petFee: context.petFee,
        waitingFee: context.waitingFee,
        discountAmount: context.discountAmount,
        totalPrice: context.totalPrice,
      },
      payment: {
        method: paymentMethod,
        status: PaymentStatus.PENDING,
      },
      voucher: context.voucher
        ? {
            id: context.voucher.id,
            code: context.voucher.code,
            name: context.voucher.name,
          }
        : null,
      note: booking.note ?? null,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
    };
  }
}
