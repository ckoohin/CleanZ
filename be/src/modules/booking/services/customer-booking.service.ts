import { isSurchargePending } from 'src/common/enums/booking-surcharge-status.enum';
import { BookingOvertimeRequestStatus } from 'src/common/enums/booking-overtime-request-status.enum';
import { OVERTIME_REQUEST_WINDOW_MS } from './booking-checkin.service';
import {
  BadRequestException,
  ConflictException,
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { NotificationType } from 'src/common/enums/notification-type.enum';
import { NotificationRefType } from 'src/common/enums/notification-ref-type.enum';
import { NotificationService } from 'src/modules/notification/notification.service';
import { generateOrderCode } from 'src/common/helpers/generate-code';
import { BookingStatus } from 'src/common/enums/booking-status.enum';
import { PaymentMethod } from 'src/common/enums/payment-method.enum';
import { PaymentStatus } from 'src/common/enums/payment-status.enum';
import { CustomerAddressEntity } from 'src/modules/customer/entity/customer-address.entity';
import { CustomerEntity } from 'src/modules/customer/entity/customer.entity';
import { CustomerFavoriteTaskerEntity } from 'src/modules/customer/entity/customer-favorite-tasker.entity';
import { BookingServiceTier } from 'src/common/enums/booking-service-tier.enum';
import { UserEntity } from 'src/modules/users/entities/user.entity';
import { DataSource, EntityManager, In, Repository } from 'typeorm';

import { VouchersService } from 'src/modules/voucher/services/vouchers.service';
import { VoucherEntity } from 'src/modules/voucher/entity/voucher.entity';
import { toNumber } from 'src/common/helpers/number.helper';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { CancelBookingDto } from '../dto/cancel-booking.dto';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { QuoteBookingDto } from '../dto/quote-booking.dto';
import { UpdateBookingScheduleAddressDto } from '../dto/update-booking-schedule-address.dto';
import { BookingStatusLogEntity } from '../entity/booking-status-log.entity';
import { CancelledBy } from 'src/common/enums/cancelled-by.enum';
import { BookingEntity } from '../entity/booking.entity';
import { PaymentService } from 'src/modules/payment/payment.service';
import { PaymentEntity } from 'src/modules/payment/entity/payment.entity';
import {
  BookingScheduleDraft,
  BookingScheduleService,
} from './booking-schedule.service';
import {
  ACTIVE_BOOKING_STATUSES,
  BookingPolicyService,
} from './booking-policy.service';
import { BookingLocationPolicyService } from './booking-location-policy.service';
import { SubServiceEntity } from 'src/modules/service/entity/sub-service.entity';
import { ServicePackageEntity } from 'src/modules/service/entity/service-package.entity';
import { ServiceAddonEntity } from 'src/modules/service/entity/service-addon.entity';
import { saveBookingAddons } from '../helpers/save-booking-addons.helper';
import { assertValidCustomerDuration } from '../helpers/customer-duration.helper';
import { BookingSubServiceEntity } from '../entity/booking-sub-service.entity';
import { BookingQuoteEntity } from '../entity/booking-quote.entity';
import {
  PeakBreakdownItem,
  PricingService,
} from 'src/modules/pricing/services/pricing.service';
import { NotificationGateway } from 'src/modules/notification/notification.gateway';
import { BookingDispatchService } from './booking-dispatch.service';
import { BookingWalletPaymentService } from './booking-wallet-payment.service';
import { TaskerScheduleAvailabilityService } from './tasker-schedule-availability.service';
import { BookingLifecycleSchedulerService } from './booking-lifecycle-scheduler.service';
import { SystemConfigService } from 'src/modules/system-config/system-config.service';
import { BookingOnlinePaymentService } from './booking-online-payment.service';

interface BookingPricingContext {
  customer: CustomerEntity;
  package: ServicePackageEntity;
  subServices: SubServiceEntity[];
  addons: ServiceAddonEntity[];
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
  peakBreakdown: PeakBreakdownItem[];
  petFee: number;
  waitingFee: number;
  subtotal: number;
  discountAmount: number;
  totalPrice: number;
  hasPet: boolean;
  voucher?: VoucherEntity | null;
  areaM2?: number;
  pricingTierId?: string;
  serviceTier: BookingServiceTier;
  /** Chênh lệch do hạng PREMIUM — đã nằm trong basePrice. */
  premiumFee: number;
}

export type CustomerBookingQuoteResponse = Record<string, unknown>;
export type CustomerBookingDetailResponse = Record<string, unknown>;
export type CustomerBookingCreatedResponse = Record<string, unknown>;
export interface CustomerActiveBookingResponse {
  booking: CustomerBookingDetailResponse | null;
}

const DEFAULT_PAYMENT_METHOD = PaymentMethod.CASH;
// Thời hạn khóa giá theo quote — cùng độ dài với confirmationDeadline của luồng
// tasker tạo đơn hộ khách (15 phút) để nhất quán trải nghiệm chờ xác nhận.
const QUOTE_TTL_MS = 15 * 60 * 1000;

@Injectable()
export class CustomerBookingService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly bookingLocationPolicyService: BookingLocationPolicyService,
    private readonly bookingPolicyService: BookingPolicyService,
    private readonly bookingScheduleService: BookingScheduleService,
    private readonly paymentService: PaymentService,
    private readonly pricingService: PricingService,
    private readonly voucherService: VouchersService,
    private readonly notificationService: NotificationService,
    private readonly bookingDispatchService: BookingDispatchService,
    private readonly notificationGateway: NotificationGateway,
    private readonly bookingWalletPaymentService: BookingWalletPaymentService,
    private readonly taskerScheduleAvailabilityService: TaskerScheduleAvailabilityService,
    private readonly bookingLifecycleScheduler: BookingLifecycleSchedulerService,
    private readonly systemConfigService: SystemConfigService,
    private readonly bookingOnlinePaymentService: BookingOnlinePaymentService,
  ) {}

  private readonly logger = new Logger(CustomerBookingService.name);

  async getCustomerSchedulingPolicy(): Promise<{
    minAdvanceMinutes: number;
    maxAdvanceDays: number;
  }> {
    const policy = await this.systemConfigService.getCustomerSchedulingPolicy(
      this.dataSource.manager,
    );
    return {
      minAdvanceMinutes: policy.minAdvanceMinutes,
      maxAdvanceDays: policy.maxAdvanceDays,
    };
  }

  async quote(
    userId: string,
    dto: QuoteBookingDto,
  ): Promise<CustomerBookingQuoteResponse> {
    assertValidCustomerDuration(dto.durationHours);

    return asyncHandleOperation(async () => {
      const context = await this.buildBookingPricingContext(
        this.dataSource.manager,
        userId,
        dto,
      );

      const expiresAt = new Date(Date.now() + QUOTE_TTL_MS);
      const savedQuote = await this.dataSource
        .getRepository(BookingQuoteEntity)
        .save({
          customerId: context.customer.id,
          requestHash: this.buildQuoteRequestHash(context.customer.id, dto),
          packageId: context.package.id,
          pricingTierId: context.pricingTierId ?? null,
          durationHours: context.durationHours,
          areaM2: context.areaM2 ?? null,
          basePrice: context.basePrice,
          addonPrice: context.addonPrice,
          peakFee: context.peakFee,
          peakBreakdown: context.peakBreakdown,
          petFee: context.petFee,
          waitingFee: context.waitingFee,
          subtotal: context.subtotal,
          discountAmount: context.discountAmount,
          totalPrice: context.totalPrice,
          voucherId: context.voucher?.id ?? null,
          serviceTier: context.serviceTier,
          premiumFee: context.premiumFee,
          expiresAt,
        });

      return {
        quoteId: savedQuote.id,
        quoteExpiresAt: expiresAt.toISOString(),
        package: {
          id: context.package.id,
          name: context.package.name,
        },
        service: {
          id: context.package.id,
          name: context.package.name,
        },
        subServices: context.subServices.map((sub) => ({
          id: sub.id,
          name: sub.name,
        })),
        addons: context.addons.map((addon) => ({
          id: addon.id,
          name: addon.name,
          price: toNumber(addon.price),
        })),
        address: {
          id: context.addressRef?.id ?? null,
          fullAddress: context.bookingAddress,
          hasPet: context.hasPet,
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
          peakBreakdown: context.peakBreakdown,
          petFee: context.petFee,
          waitingFee: context.waitingFee,
          subtotal: context.subtotal,
          premiumFee: context.premiumFee,
          discountAmount: context.discountAmount,
          totalPrice: context.totalPrice,
        },
        serviceTier: context.serviceTier,
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
    assertValidCustomerDuration(dto.durationHours);

    return asyncHandleOperation(async () => {
      let createdBookingId: string | undefined;
      let createdPaymentMethod: PaymentMethod =
        DEFAULT_PAYMENT_METHOD as PaymentMethod;
      let addressLat: number | null = null;
      let addressLng: number | null = null;
      let scheduledStart: Date | undefined;
      let dispatchOptions: {
        customerId: string;
        serviceTier: BookingServiceTier;
        preferredTaskerId: string | null;
      } | null = null;
      let createdBookingSnapshot: BookingEntity | undefined;
      let createdContext: BookingPricingContext | undefined;

      const response = await this.dataSource.transaction(async (manager) => {
        const bookingRepository = manager.getRepository(BookingEntity);
        const logRepository = manager.getRepository(BookingStatusLogEntity);
        const context = await this.buildBookingPricingContext(
          manager,
          userId,
          dto,
        );

        if (dto.quoteId) {
          await this.applyLockedQuotePrice(manager, context, dto);
        }

        await this.bookingPolicyService.assertCustomerCanCreateBooking(
          manager,
          context.customer.id,
        );

        const bookingCode =
          await this.generateUniqueBookingCode(bookingRepository);
        const paymentMethod = dto.paymentMethod ?? DEFAULT_PAYMENT_METHOD;

        // Khách từng nhiều lần không trả phần phát sinh → buộc trả trước bằng ví.
        if (paymentMethod === PaymentMethod.CASH) {
          await this.bookingPolicyService.assertCanUseCashPayment(
            manager,
            context.customer.id,
          );
        }
        // Thợ yêu thích chỉ định phải thực sự nằm trong danh sách của khách và
        // đơn phải là PREMIUM — nếu không, bỏ qua chỉ định thay vì tạo đơn với
        // ưu tiên mà khách không có quyền.
        const preferredTaskerId = await this.resolvePreferredTaskerId(
          manager,
          context,
          dto.preferredTaskerId,
        );

        const booking = bookingRepository.create({
          bookingCode,
          customer: context.customer,
          tasker: null,
          serviceTier: context.serviceTier,
          preferredTaskerId,
          premiumFee: context.premiumFee,
          packageId: context.package.id,
          address: context.bookingAddress,
          addressRef: context.addressRef,
          note: dto.note,
          scheduledStartDate: context.scheduledStartDate,
          scheduledStartTime: context.scheduledStartTime,
          scheduledEndDate: context.scheduledEndDate,
          scheduledEndTime: context.scheduledEndTime,
          durationHours: context.durationHours,
          areaM2: context.areaM2,
          pricingTierId: context.pricingTierId,
          addonIds: context.addons.map((addon) => addon.id),
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
        if (context.addressRef) {
          let addressModified = false;
          if (
            typeof dto.hasPet === 'boolean' &&
            context.addressRef.hasPet !== dto.hasPet
          ) {
            context.addressRef.hasPet = dto.hasPet;
            addressModified = true;
          }
          if (dto.contactPhone?.trim()) {
            context.addressRef.contactPhone = dto.contactPhone.trim();
            addressModified = true;
          }
          if (addressModified) {
            await manager
              .getRepository(CustomerAddressEntity)
              .save(context.addressRef);
          }
        }
        const savedBooking = await bookingRepository.save(booking);
        await this.voucherService.reserveForBooking(manager, {
          bookingId: savedBooking.id,
          customerId: context.customer.id,
          voucherId: savedBooking.voucherId,
        });

        const bookingSubServiceRepository = manager.getRepository(
          BookingSubServiceEntity,
        );
        const bookingSubServices = context.subServices.map((sub) => {
          return bookingSubServiceRepository.create({
            booking: savedBooking,
            subServiceId: sub.id,
            price: sub.pricingConfig?.basePrice || 0,
            durationHours: sub.durationHours || 0,
            quantity: 1,
          });
        });
        await bookingSubServiceRepository.save(bookingSubServices);
        await saveBookingAddons(manager, savedBooking, context.addons);

        await this.paymentService.createPendingPayment(
          manager,
          savedBooking,
          context.customer,
          paymentMethod,
          context.totalPrice,
        );

        // Trả bằng ví → trừ tiền ngay, giữ ở ví SYSTEM tới khi đơn xong hoặc bị hủy.
        // Ví không đủ sẽ ném lỗi ở đây và cả transaction rollback → không tạo đơn treo.
        await this.bookingWalletPaymentService.chargeEscrow(
          manager,
          savedBooking,
          context.customer,
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

        // Lấy tọa độ để dispatch sau khi transaction commit
        createdBookingId = savedBooking.id;
        createdPaymentMethod = paymentMethod;
        createdBookingSnapshot = savedBooking;
        createdContext = context;
        const rawLat = context.addressRef?.latitude;
        const rawLng = context.addressRef?.longitude;
        addressLat = rawLat != null ? Number(rawLat) : null;
        addressLng = rawLng != null ? Number(rawLng) : null;
        scheduledStart = context.scheduledStart;
        dispatchOptions = {
          customerId: context.customer.id,
          serviceTier: context.serviceTier,
          preferredTaskerId,
        };

        // payosCheckoutUrl được gán sau commit — placeholder null ở đây.
        return this.mapCreatedBookingResponse(
          savedBooking,
          context,
          paymentMethod,
          null,
        );
      });

      // Sau khi transaction commit thành công
      if (createdBookingId && createdBookingSnapshot && createdContext) {
        if (createdPaymentMethod === PaymentMethod.ONLINE) {
          // ONLINE: tạo PayOS link, dispatch CHỈ khi webhook xác nhận PAID.
          try {
            const link =
              await this.bookingOnlinePaymentService.createPaymentLink(
                createdBookingSnapshot,
                userId,
              );
            return this.mapCreatedBookingResponse(
              createdBookingSnapshot,
              createdContext,
              createdPaymentMethod,
              link.checkoutUrl,
              link.qrCode,
              {
                bin: link.bin,
                accountNumber: link.accountNumber,
                accountName: link.accountName,
              },
            );
          } catch (err) {
            this.logger.error(
              `Không thể tạo PayOS link cho booking=${createdBookingId}: ${err}`,
            );
            // Trả về response không có link — FE sẽ hiển thị lỗi.
            return response;
          }
        } else {
          // CASH / WALLET: dispatch ngay sau khi tạo đơn.
          this.notificationGateway.emitToUser(userId, 'booking:searching', {
            bookingId: createdBookingId,
          });

          if (
            addressLat != null &&
            addressLng != null &&
            Number.isFinite(addressLat) &&
            Number.isFinite(addressLng) &&
            scheduledStart
          ) {
            void this.bookingDispatchService
              .enqueueDispatch(
                createdBookingId,
                userId,
                addressLat,
                addressLng,
                scheduledStart,
                dispatchOptions ?? {},
              )
              .catch((err: unknown) =>
                this.logger.error(
                  `Không thể enqueue dispatch cho booking=${createdBookingId}: ${err instanceof Error ? err.message : String(err)}`,
                ),
              );
          } else {
            this.logger.warn(
              `Booking=${createdBookingId} thiếu tọa độ địa chỉ — bỏ qua dispatch tự động`,
            );
          }
        }
      }

      return response;
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
        .leftJoinAndSelect('booking.package', 'package')
        .leftJoinAndSelect('booking.bookingSubServices', 'bookingSubServices')
        .leftJoinAndSelect('bookingSubServices.subService', 'subService')
        .where('booking.id = :bookingId', { bookingId })
        .andWhere('customerUser.id = :userId', { userId })
        .getOne();

      if (!booking) {
        throw new NotFoundException(
          'Booking không tồn tại hoặc không thuộc customer hiện tại',
        );
      }

      const [payment, statusLogs, voucher] = await Promise.all([
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

      const servicePackage = booking.package as
        | ServicePackageEntity
        | undefined;
      const packageSummary = {
        id: servicePackage?.id,
        name: servicePackage?.name,
      };

      const subServicesSummary = (booking.bookingSubServices || []).map(
        (bss) => ({
          id: bss.subServiceId,
          name: bss.subService?.name || 'Dịch vụ con',
          price: toNumber(bss.price),
          durationHours: toNumber(bss.durationHours),
        }),
      );

      return {
        id: booking.id,
        bookingCode: booking.bookingCode,
        status: booking.status,
        service: packageSummary, // alias để tương thích ngược
        package: packageSummary,
        subServices: subServicesSummary,
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
          premiumFee: toNumber(booking.premiumFee),
          discountAmount: toNumber(booking.discountAmount),
          totalPrice: toNumber(booking.totalPrice),
        },
        serviceTier: booking.serviceTier,
        payment: {
          method: booking.paymentMethod,
          // Ưu tiên status từ PaymentEntity (phản ánh FAILED từ gateway) so với booking.paymentStatus
          status: payment?.status ?? booking.paymentStatus,
          latestPaymentId: payment?.id ?? null,
          amount: payment ? toNumber(payment.amount) : null,
          transactionCode: payment?.transactionCode ?? null,
          paidAt: payment?.paidAt ?? null,
          payosQrCode: payment?.qrCode ?? null,
          payosCheckoutUrl: payment?.checkoutUrl ?? null,
          payosBin: payment?.bin ?? null,
          payosAccountNumber: payment?.accountNumber ?? null,
          payosAccountName: payment?.accountName ?? null,
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
              phone:
                booking.status === BookingStatus.COMPLETED
                  ? null
                  : (booking.tasker.user?.phone ?? null),
              avatarUrl: booking.tasker.user?.avatarUrl ?? null,
              ratingAvg: toNumber(booking.tasker.ratingAvg),
              totalCompletedJobs: toNumber(booking.tasker.totalCompletedJobs),
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
        source: booking.source,
        confirmationDeadline: booking.confirmationDeadline ?? null,
        checkedInAt: booking.checkedInAt ?? null,
        checkedOutAt: booking.checkedOutAt ?? null,
        completedAt: booking.completedAt ?? null,
        workTiming: {
          overtimeMinutes: toNumber(booking.overtimeMinutes),
          earlyMinutes: toNumber(booking.earlyMinutes),
          surchargeFee: toNumber(booking.waitingFee),
          surchargePending: isSurchargePending(booking.surchargeStatus),
          surchargeStatus: booking.surchargeStatus,
          approvedOvertimeMinutes: toNumber(booking.approvedOvertimeMinutes),
        },
        noShow: {
          reviewStatus: booking.noShowReviewStatus,
          detectedAt: booking.noShowDetectedAt ?? null,
          reviewedAt: booking.noShowReviewedAt ?? null,
          refundAmount: toNumber(booking.noShowRefundAmount),
          warningPoints: toNumber(booking.noShowWarningPoints),
        },
        overtimeRequest: {
          status: booking.overtimeRequestStatus,
          minutes: toNumber(booking.overtimeRequestMinutes),
          fee: toNumber(booking.overtimeRequestFee),
          respondBy:
            booking.overtimeRequestStatus ===
              BookingOvertimeRequestStatus.PENDING &&
            booking.overtimeRequestedAt
              ? new Date(
                  booking.overtimeRequestedAt.getTime() +
                    OVERTIME_REQUEST_WINDOW_MS,
                ).toISOString()
              : null,
        },
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
      };
    }, 'Không thể lấy chi tiết booking');
  }

  async findMyActiveBooking(
    userId: string,
  ): Promise<CustomerActiveBookingResponse> {
    return asyncHandleOperation(async () => {
      const activeBooking = await this.dataSource
        .getRepository(BookingEntity)
        .createQueryBuilder('booking')
        .innerJoin('booking.customer', 'customer')
        .innerJoin('customer.user', 'customerUser')
        .select('booking.id', 'id')
        .where('customerUser.id = :userId', { userId })
        .andWhere('booking.status IN (:...statuses)', {
          statuses: ACTIVE_BOOKING_STATUSES,
        })
        .orderBy('booking.createdAt', 'DESC')
        .getRawOne<{ id: string }>();

      if (!activeBooking) {
        return { booking: null };
      }

      return {
        booking: await this.findMyBookingDetail(userId, activeBooking.id),
      };
    }, 'Không thể lấy booking đang hoạt động');
  }

  /** Danh sách booking của customer (cho select khi tạo ticket hỗ trợ). */
  async findMyBookings(userId: string): Promise<{
    items: CustomerBookingDetailResponse[];
    total: number;
  }> {
    return asyncHandleOperation(async () => {
      const bookings = await this.dataSource
        .getRepository(BookingEntity)
        .createQueryBuilder('booking')
        .innerJoin('booking.customer', 'customer')
        .innerJoin('customer.user', 'customerUser')
        .leftJoinAndSelect('booking.addressRef', 'addressRef')
        .leftJoinAndSelect('booking.tasker', 'tasker')
        .leftJoinAndSelect('tasker.user', 'taskerUser')
        .leftJoinAndSelect('booking.package', 'package')
        .leftJoinAndSelect('booking.bookingSubServices', 'bookingSubServices')
        .leftJoinAndSelect('bookingSubServices.subService', 'subService')
        .where('customerUser.id = :userId', { userId })
        .orderBy('booking.createdAt', 'DESC')
        .limit(50)
        .getMany();

      // Batch-load payments and vouchers to avoid N+1 queries
      const bookingIds = bookings.map((b) => b.id);
      const voucherIds = [
        ...new Set(
          bookings.filter((b) => b.voucherId).map((b) => b.voucherId!),
        ),
      ];

      const [allPayments, allVouchers] = await Promise.all([
        this.paymentService.findLatestByBookingIds(
          this.dataSource.manager,
          bookingIds,
        ),
        voucherIds.length > 0
          ? Promise.all(
              voucherIds.map((id) =>
                this.voucherService
                  .getById(this.dataSource.manager, id)
                  .catch(() => null),
              ),
            )
          : Promise.resolve([]),
      ]);

      // Build lookup maps
      const paymentMap = new Map<string, PaymentEntity>();
      for (const p of allPayments) {
        const bid = p.booking?.id;
        if (bid && !paymentMap.has(bid)) {
          paymentMap.set(bid, p); // first = latest due to DESC sort
        }
      }
      const voucherMap = new Map(
        allVouchers.filter(Boolean).map((v) => [v!.id, v!]),
      );

      const items: CustomerBookingDetailResponse[] = [];
      for (const booking of bookings) {
        const payment = paymentMap.get(booking.id) ?? null;
        const voucher = booking.voucherId
          ? (voucherMap.get(booking.voucherId) ?? null)
          : null;

        const packageSummary = {
          id: booking.package?.id,
          name: booking.package?.name,
        };

        const subServicesSummary = (booking.bookingSubServices || []).map(
          (bss) => ({
            id: bss.subServiceId,
            name: bss.subService?.name || 'Dịch vụ con',
            price: toNumber(bss.price),
            durationHours: toNumber(bss.durationHours),
          }),
        );

        items.push({
          id: booking.id,
          bookingCode: booking.bookingCode,
          status: booking.status,
          service: packageSummary,
          package: packageSummary,
          subServices: subServicesSummary,
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
            premiumFee: toNumber(booking.premiumFee),
            discountAmount: toNumber(booking.discountAmount),
            totalPrice: toNumber(booking.totalPrice),
          },
          serviceTier: booking.serviceTier,
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
                phone:
                  booking.status === BookingStatus.COMPLETED
                    ? null
                    : (booking.tasker.user?.phone ?? null),
                avatarUrl: booking.tasker.user?.avatarUrl ?? null,
                ratingAvg: toNumber(booking.tasker.ratingAvg),
                totalCompletedJobs: toNumber(booking.tasker.totalCompletedJobs),
              }
            : null,
          workTiming: {
            overtimeMinutes: toNumber(booking.overtimeMinutes),
            earlyMinutes: toNumber(booking.earlyMinutes),
            surchargeFee: toNumber(booking.waitingFee),
            surchargePending: isSurchargePending(booking.surchargeStatus),
            surchargeStatus: booking.surchargeStatus,
          },
          noShow: {
            reviewStatus: booking.noShowReviewStatus,
            detectedAt: booking.noShowDetectedAt ?? null,
            reviewedAt: booking.noShowReviewedAt ?? null,
            refundAmount: toNumber(booking.noShowRefundAmount),
            warningPoints: toNumber(booking.noShowWarningPoints),
          },
          createdAt: booking.createdAt.toISOString(),
          updatedAt: booking.updatedAt.toISOString(),
        });
      }

      return {
        items,
        total: items.length,
      };
    }, 'Không thể lấy danh sách booking');
  }

  async updateScheduleAndAddress(
    userId: string,
    bookingId: string,
    dto: UpdateBookingScheduleAddressDto,
  ): Promise<CustomerBookingDetailResponse> {
    return asyncHandleOperation(async () => {
      let savedBookingSnapshot: BookingEntity | undefined;

      await this.dataSource.transaction(async (manager) => {
        const booking = await manager
          .getRepository(BookingEntity)
          .createQueryBuilder('booking')
          .leftJoinAndSelect('booking.customer', 'customer')
          .leftJoinAndSelect('customer.user', 'customerUser')
          .leftJoinAndSelect('booking.addressRef', 'addressRef')
          .leftJoinAndSelect('booking.tasker', 'tasker')
          .leftJoinAndSelect('booking.bookingSubServices', 'bookingSubServices')
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
        let addonExtraHours = 0;
        if (booking.addonIds?.length) {
          const addons = await manager.getRepository(ServiceAddonEntity).find({
            where: { id: In(booking.addonIds) },
          });
          addonExtraHours = addons.reduce(
            (sum, addon) => sum + toNumber(addon.durationMinutes ?? 0) / 60,
            0,
          );
        }

        const draft = this.bookingScheduleService.buildUpdateDraft(
          booking,
          dto,
          voucher,
          addonExtraHours,
        );
        const context = await this.buildBookingPricingContext(
          manager,
          userId,
          draft,
          booking.id,
        );

        booking.address = context.bookingAddress;
        booking.addressRef = context.addressRef;
        // Giá trước khi đổi lịch — cần để bù chênh lệch cho đơn đã trả bằng ví.
        const previousTotalPrice = toNumber(booking.totalPrice);

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
        booking.areaM2 = context.areaM2;
        booking.pricingTierId = context.pricingTierId;

        const savedBooking = await manager
          .getRepository(BookingEntity)
          .save(booking);
        await this.voucherService.reserveForBooking(manager, {
          bookingId: savedBooking.id,
          // Luồng customer tự đặt → luôn có customer (không phải đơn guest).
          customerId: savedBooking.customer!.id,
          voucherId: savedBooking.voucherId,
        });

        await this.paymentService.updateLatestPendingPaymentAmount(
          manager,
          savedBooking.id,
          context.totalPrice,
        );

        // Đơn đã trả bằng ví: thu thêm / trả lại đúng phần giá chênh lệch.
        await this.bookingWalletPaymentService.adjustEscrow(
          manager,
          savedBooking,
          previousTotalPrice,
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

        savedBookingSnapshot = savedBooking;
      });

      // Sau commit: nếu đơn ONLINE+PENDING thì recreate PayOS link với giá mới.
      if (
        savedBookingSnapshot?.paymentMethod === PaymentMethod.ONLINE &&
        savedBookingSnapshot.paymentStatus === PaymentStatus.PENDING
      ) {
        void this.bookingOnlinePaymentService
          .recreatePayosLink(savedBookingSnapshot, userId)
          .catch((err: unknown) =>
            this.logger.error(
              `Không thể recreate PayOS link cho booking=${bookingId}: ${err}`,
            ),
          );
      }

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
        await this.voucherService.releaseReservationForBooking(
          manager,
          booking.id,
        );
        taskerUserId = booking.tasker?.user?.id;
        bookingCode = booking.bookingCode;
        const savedBooking = await manager
          .getRepository(BookingEntity)
          .save(booking);
        await manager.increment(
          CustomerEntity,
          // Luồng customer tự hủy → luôn có customer.
          { id: booking.customer!.id },
          'totalCancelled',
          1,
        );

        // Hoàn tiền tuỳ theo phương thức thanh toán.
        let refundAmount = 0;
        const latestPayment = await this.paymentService.findLatestByBookingId(
          manager,
          savedBooking.id,
        );
        if (savedBooking.paymentMethod === PaymentMethod.WALLET) {
          // Đơn ví: trả lại tiền đang giữ ở ví SYSTEM cho khách.
          refundAmount = await this.bookingWalletPaymentService.refundEscrow(
            manager,
            savedBooking,
            'khách hủy đơn',
          );
        } else if (
          savedBooking.paymentMethod === PaymentMethod.ONLINE &&
          savedBooking.paymentStatus === PaymentStatus.PAID
        ) {
          // Đơn online đã thanh toán: hoàn vào ví CleanZ của khách.
          refundAmount = await this.bookingOnlinePaymentService.refundToWallet(
            manager,
            savedBooking,
            booking.customer!,
          );
        } else {
          // CASH hoặc ONLINE chưa thanh toán: không có tiền cần hoàn.
          refundAmount =
            latestPayment?.status === PaymentStatus.PAID
              ? toNumber(latestPayment.amount)
              : 0;
        }

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

      await this.bookingLifecycleScheduler.deactivateBooking(bookingId);

      // Sau commit: hủy PayOS link nếu đơn ONLINE chưa thanh toán (tránh customer chuyển khoản nhầm).
      void this.bookingOnlinePaymentService
        .cancelPendingPayosLink(bookingId)
        .catch((err: unknown) =>
          this.logger.error(
            `Không thể hủy PayOS link cho booking=${bookingId}: ${err}`,
          ),
        );

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

  /**
   * Xác thực tasker yêu thích khách chỉ định.
   * Chỉ đơn PREMIUM mới có ring mời riêng, và tasker phải nằm trong danh sách
   * yêu thích của chính khách — nếu không thì đây là đường vòng để khách tự
   * gán thợ cho mình, bỏ qua toàn bộ cơ chế ghép đơn.
   */
  private async resolvePreferredTaskerId(
    manager: EntityManager,
    context: BookingPricingContext,
    preferredTaskerId?: string,
  ): Promise<string | null> {
    if (!preferredTaskerId) return null;

    if (context.serviceTier !== BookingServiceTier.PREMIUM) {
      throw new BadRequestException(
        'Chỉ đơn Cao cấp mới được ưu tiên chọn thợ yêu thích',
      );
    }

    const favorite = await manager
      .getRepository(CustomerFavoriteTaskerEntity)
      .findOne({
        where: { customerId: context.customer.id, taskerId: preferredTaskerId },
      });

    if (!favorite) {
      throw new BadRequestException(
        'Thợ này không nằm trong danh sách yêu thích của bạn',
      );
    }

    const availability =
      await this.taskerScheduleAvailabilityService.getForTasker(
        manager,
        preferredTaskerId,
        {
          scheduledStartDate: context.scheduledStartDate,
          scheduledStartTime: context.scheduledStartTime,
          scheduledEndDate: context.scheduledEndDate,
          scheduledEndTime: context.scheduledEndTime,
        },
      );

    if (!availability.isAvailable) {
      throw new ConflictException(
        availability.reason === 'MAX_CONCURRENT'
          ? 'Tasker bạn chọn vừa đạt giới hạn số đơn chưa hoàn thành. Vui lòng chọn Tasker khác.'
          : 'Tasker bạn chọn vừa có lịch trùng với khung giờ này. Vui lòng chọn Tasker khác.',
      );
    }

    return preferredTaskerId;
  }

  // Hash các field ảnh hưởng giá — dùng để phát hiện customer đã đổi lựa chọn
  // (gói/addon/lịch/voucher...) so với lúc quote, trước khi cho áp giá đã lock.
  private buildQuoteRequestHash(
    customerId: string,
    dto: QuoteBookingDto | CreateBookingDto,
  ): string {
    const normalized = {
      customerId,
      packageId: dto.packageId ?? null,
      subServiceIds: [...(dto.subServiceIds ?? [])].sort(),
      addonIds: [...(dto.addonIds ?? [])].sort(),
      addressId: dto.addressId ?? null,
      scheduledDate: dto.scheduledDate ?? null,
      scheduledTime: dto.scheduledTime ?? null,
      durationHours: dto.durationHours ?? null,
      areaM2: dto.areaM2 ?? null,
      pricingTierId: dto.pricingTierId ?? null,
      hasPet: dto.hasPet ?? null,
      voucherCode: dto.voucherCode?.trim().toUpperCase() ?? null,
      // Hạng dịch vụ đổi thì giá đổi — thiếu dòng này thì khách quote PREMIUM
      // rồi tạo đơn STANDARD vẫn qua được hash và nhận giá sai.
      serviceTier: dto.serviceTier ?? null,
    };
    return createHash('sha256')
      .update(JSON.stringify(normalized))
      .digest('hex');
  }

  // Áp giá đã "khóa" từ quote trước đó (nếu hợp lệ) vào context, ghi đè giá vừa
  // tính lại từ dữ liệu hiện tại — đảm bảo giá khách thấy lúc xác nhận booking
  // khớp với giá đã xem ở bước review, kể cả khi admin đổi giá gói ở giữa.
  private async applyLockedQuotePrice(
    manager: EntityManager,
    context: BookingPricingContext,
    dto: CreateBookingDto,
  ): Promise<void> {
    const quoteRepository = manager.getRepository(BookingQuoteEntity);
    const lockedQuote = await quoteRepository.findOne({
      where: { id: dto.quoteId },
    });

    if (!lockedQuote || lockedQuote.customerId !== context.customer.id) {
      throw new NotFoundException(
        'Báo giá không tồn tại, vui lòng lấy báo giá mới',
      );
    }
    if (lockedQuote.usedAt) {
      throw new BadRequestException(
        'Báo giá này đã được dùng để tạo booking khác, vui lòng lấy báo giá mới',
      );
    }
    if (lockedQuote.expiresAt.getTime() < Date.now()) {
      throw new GoneException('Báo giá đã hết hạn, vui lòng lấy báo giá mới');
    }
    if (
      lockedQuote.requestHash !==
      this.buildQuoteRequestHash(context.customer.id, dto)
    ) {
      throw new BadRequestException(
        'Thông tin đặt lịch đã thay đổi so với báo giá, vui lòng lấy báo giá mới',
      );
    }

    context.basePrice = lockedQuote.basePrice;
    context.addonPrice = lockedQuote.addonPrice;
    context.peakFee = lockedQuote.peakFee;
    context.peakBreakdown = lockedQuote.peakBreakdown ?? [];
    context.petFee = lockedQuote.petFee;
    context.waitingFee = lockedQuote.waitingFee;
    context.subtotal = lockedQuote.subtotal;
    context.discountAmount = lockedQuote.discountAmount;
    context.totalPrice = lockedQuote.totalPrice;
    context.serviceTier = lockedQuote.serviceTier;
    context.premiumFee = toNumber(lockedQuote.premiumFee);

    lockedQuote.usedAt = new Date();
    await quoteRepository.save(lockedQuote);
  }

  private async buildBookingPricingContext(
    manager: EntityManager,
    userId: string,
    dto: BookingScheduleDraft,
    currentBookingId?: string,
  ): Promise<BookingPricingContext> {
    const scheduleStart = this.bookingScheduleService.buildScheduleStart(dto);
    await this.assertCustomerScheduleAllowed(
      manager,
      scheduleStart.scheduledStart,
    );

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
      packageId: dto.packageId,
      subServiceIds: dto.subServiceIds,
      addonIds: dto.addonIds,
      durationHours: dto.durationHours,
      areaM2: dto.areaM2,
      pricingTierId: dto.pricingTierId,
      serviceTier: dto.serviceTier,
      scheduledStart: scheduleStart.scheduledStart,
      scheduledStartTime: scheduleStart.scheduledStartTime,
      hasPet: dto.hasPet ?? addressRef?.hasPet ?? false,
      voucherCode: dto.voucherCode,
      customerId: customer.id,
      currentBookingId,
    });
    const schedule = this.bookingScheduleService.buildSchedule(
      dto,
      price.durationHours,
    );

    return {
      customer,
      package: price.package,
      subServices: price.subServices,
      addons: price.addons,
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
      peakBreakdown: price.peakBreakdown,
      petFee: price.petFee,
      waitingFee: price.waitingFee,
      subtotal: price.subtotal,
      discountAmount: price.discountAmount,
      totalPrice: price.totalPrice,
      hasPet: dto.hasPet ?? addressRef?.hasPet ?? false,
      voucher: price.voucher,
      areaM2: dto.areaM2,
      pricingTierId: price.pricingTierId,
      serviceTier: price.serviceTier,
      premiumFee: price.premiumFee,
    };
  }

  private async assertCustomerScheduleAllowed(
    manager: EntityManager,
    scheduledStart: Date,
    now = new Date(),
  ): Promise<void> {
    const policy =
      await this.systemConfigService.getCustomerSchedulingPolicy(manager);
    const startMs = scheduledStart.getTime();
    const minStartMs = now.getTime() + policy.minAdvanceMinutes * 60 * 1000;
    const maxStartMs =
      now.getTime() + policy.maxAdvanceDays * 24 * 60 * 60 * 1000;

    if (startMs < minStartMs) {
      throw new BadRequestException(
        `Thời gian đặt lịch phải cách hiện tại tối thiểu ${policy.minAdvanceMinutes} phút`,
      );
    }
    if (startMs > maxStartMs) {
      throw new BadRequestException(
        `Chỉ có thể đặt lịch trước tối đa ${policy.maxAdvanceDays} ngày`,
      );
    }
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
    payosCheckoutUrl: string | null = null,
    payosQrCode: string | null = null,
    payosBankInfo: {
      bin: string;
      accountNumber: string;
      accountName: string;
    } | null = null,
  ): CustomerBookingCreatedResponse {
    return {
      id: booking.id,
      bookingCode: booking.bookingCode,
      status: booking.status,
      service: {
        id: context.package.id,
        name: context.package.name,
        description: context.package.policyDescription ?? null,
      },
      package: {
        id: context.package.id,
        name: context.package.name,
        description: context.package.policyDescription ?? null,
      },
      subServices: context.subServices.map((sub) => ({
        id: sub.id,
        name: sub.name,
      })),
      addons: context.addons.map((addon) => ({
        id: addon.id,
        name: addon.name,
        price: toNumber(addon.price),
      })),
      address: {
        id: context.addressRef?.id ?? null,
        label: context.addressRef?.label ?? null,
        fullAddress: context.bookingAddress,
        wardDetail: context.addressRef?.wardDetail ?? null,
        latitude: context.addressRef?.latitude ?? null,
        longitude: context.addressRef?.longitude ?? null,
        hasPet: context.hasPet,
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
        premiumFee: context.premiumFee,
        discountAmount: context.discountAmount,
        totalPrice: context.totalPrice,
      },
      serviceTier: context.serviceTier,
      payment: {
        method: paymentMethod,
        status: PaymentStatus.PENDING,
        payosCheckoutUrl,
        payosQrCode,
        payosBin: payosBankInfo?.bin ?? null,
        payosAccountNumber: payosBankInfo?.accountNumber ?? null,
        payosAccountName: payosBankInfo?.accountName ?? null,
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
