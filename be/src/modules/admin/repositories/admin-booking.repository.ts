import {
  isSurchargePending,
  BookingSurchargeStatus,
} from 'src/common/enums/booking-surcharge-status.enum';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { BookingStatus } from 'src/common/enums/booking-status.enum';
import { BookingCheckinReviewStatus } from 'src/common/enums/booking-checkin-review-status.enum';
import { BookingCheckinVerificationSource } from 'src/common/enums/booking-checkin-verification-source.enum';
import { BookingNoShowReviewStatus } from 'src/common/enums/booking-no-show-review-status.enum';
import { CancelledBy } from 'src/common/enums/cancelled-by.enum';
import { DocumentStatus } from 'src/common/enums/document-status.enum';
import { NotificationRefType } from 'src/common/enums/notification-ref-type.enum';
import { NotificationType } from 'src/common/enums/notification-type.enum';
import { PaymentMethod } from 'src/common/enums/payment-method.enum';
import { PaymentStatus } from 'src/common/enums/payment-status.enum';
import { TaskerStatus } from 'src/common/enums/tasker-status.enum';
import { WalletOwnerType } from 'src/common/enums/wallet-owner-type.enum';
import { WalletTransactionType } from 'src/common/enums/wallet-transaction-type.enum';
import { generateOrderCode } from 'src/common/helpers/generate-code';
import { toNumber } from 'src/common/helpers/number.helper';
import { BookingEntity } from 'src/modules/booking/entity/booking.entity';
import { BookingStatusLogEntity } from 'src/modules/booking/entity/booking-status-log.entity';
import { BookingLocationPolicyService } from 'src/modules/booking/services/booking-location-policy.service';
import { BookingPolicyService } from 'src/modules/booking/services/booking-policy.service';
import { BookingScheduleService } from 'src/modules/booking/services/booking-schedule.service';
import { CustomerAddressEntity } from 'src/modules/customer/entity/customer-address.entity';
import { CustomerEntity } from 'src/modules/customer/entity/customer.entity';
import { NotificationService } from 'src/modules/notification/notification.service';
import { PaymentEntity } from 'src/modules/payment/entity/payment.entity';
import { PaymentService } from 'src/modules/payment/payment.service';
import { PricingService } from 'src/modules/pricing/services/pricing.service';
import { ServicePackageEntity } from 'src/modules/service/entity/service-package.entity';
import { BookingSubServiceEntity } from 'src/modules/booking/entity/booking-sub-service.entity';
import { TaskerEntity } from 'src/modules/tasker/entity/tasker.entity';
import { UserEntity } from 'src/modules/users/entities/user.entity';
import { VoucherEntity } from 'src/modules/voucher/entity/voucher.entity';
import { VouchersService } from 'src/modules/voucher/services/vouchers.service';
import { TaskerBalanceService } from 'src/modules/wallet/tasker-balance.service';
import {
  BOOKING_WALLET_SETTLE_REF,
  BookingWalletPaymentService,
} from 'src/modules/booking/services/booking-wallet-payment.service';
import { EARLY_CHECKOUT_ABNORMAL_MINUTES } from 'src/modules/booking/helpers/work-timing.helper';
import { WalletService } from 'src/modules/wallet/wallet.service';
import { WalletTransactionEntity } from 'src/modules/wallet/entity/wallet-transaction.entity';
import { WalletEntity } from 'src/modules/wallet/entity/wallet.entity';
import { IncidentEntity } from 'src/modules/incident/entity/incident.entity';
import { IncidentAdminService } from 'src/modules/incident/services/incident-admin.service';
import { IncidentStatus } from 'src/common/enums/incident-status.enum';
import { IncidentType } from 'src/common/enums/incident-type.enum';
import { AssignTaskerDto } from '../dto/assign-tasker.dto';
import { AvailableTaskersQueryDto } from '../dto/available-taskers-query.dto';
import { BookingSearchQueryDto } from '../dto/booking-search-query.dto';
import { ChangeBookingStatusDto } from '../dto/change-booking-status.dto';
import { CreateAdminBookingDto } from '../dto/create-admin-booking.dto';
import {
  AdminCheckinReviewDecision,
  ReviewBookingCheckinDto,
} from '../dto/review-booking-checkin.dto';
import {
  AdminNoShowReviewDecision,
  ReviewBookingNoShowDto,
} from '../dto/review-booking-no-show.dto';
import {
  createVietnamDateTime,
  VN_NOW_SQL,
} from 'src/common/helpers/vietnam-time.helper';
import { NO_SHOW_WARNING_POINTS } from 'src/modules/booking/services/booking-checkin.service';
import {
  BookingSettlementLedgerSnapshot,
  resolveBookingPaymentBreakdown,
} from '../helpers/booking-payment-breakdown.helper';
import { BookingLifecycleSchedulerService } from 'src/modules/booking/services/booking-lifecycle-scheduler.service';
import { BookingSettlementService } from 'src/modules/booking/services/booking-settlement.service';
import { overdueCompletionSql } from 'src/modules/booking/helpers/booking-lifecycle.helper';

interface BookingStatusCountRow {
  status: BookingStatus;
  count: string;
}

interface AdminBookingListRow {
  id: string;
  bookingCode: string;
  // null cho đơn offline/vãng lai (không gắn tài khoản khách).
  customerId: string | null;
  customerUserId: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  // Thông tin khách vãng lai lưu trực tiếp trên đơn.
  guestName: string | null;
  guestPhone: string | null;
  taskerId: string | null;
  taskerUserId: string | null;
  taskerName: string | null;
  taskerEmail: string | null;
  taskerPhone: string | null;
  serviceId: string;
  serviceCode: string | null;
  serviceName: string | null;
  address: string;
  scheduledStart: Date | null;
  scheduledEnd: Date | null;
  scheduledStartDate: string | null;
  scheduledStartTime: string | null;
  scheduledEndDate: string | null;
  scheduledEndTime: string | null;
  durationHours: string;
  totalPrice: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  checkedInAt: Date | null;
  checkedOutAt: Date | null;
  overtimeMinutes: string | number | null;
  earlyMinutes: string | number | null;
  waitingFee: string | number | null;
  checkinFar: boolean | null;
  checkinDistanceMeters: string | number | null;
  checkinAccuracyMeters: string | number | null;
  checkinLatitude: string | number | null;
  checkinLongitude: string | number | null;
  checkinTargetLatitude: string | number | null;
  checkinTargetLongitude: string | number | null;
  checkinProofPhotoUrl: string | null;
  checkinReviewStatus: BookingCheckinReviewStatus;
  checkinVerificationSource: BookingCheckinVerificationSource | null;
  noShowReviewStatus: BookingNoShowReviewStatus;
  noShowDetectedAt: Date | null;
  createdAt: Date;
}

interface AvailableTaskerRow {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  presenceStatus: string;
  ratingAvg: string;
  totalCompletedJobs: number;
  workingAddress: string | null;
  walletBalance: string;
  depositBalance: string;
}

const ADMIN_ASSIGNABLE_BOOKING_STATUSES = [
  BookingStatus.POSTED,
  BookingStatus.CONFIRMED,
];

const BUSY_TASKER_BOOKING_STATUSES = [
  BookingStatus.CONFIRMED,
  BookingStatus.TASKER_ON_THE_WAY,
  BookingStatus.CHECKED_IN,
  BookingStatus.IN_PROGRESS,
];

const ADMIN_FORWARD_STATUS: Partial<Record<BookingStatus, BookingStatus>> = {
  [BookingStatus.CONFIRMED]: BookingStatus.TASKER_ON_THE_WAY,
  [BookingStatus.CHECKED_IN]: BookingStatus.IN_PROGRESS,
  [BookingStatus.IN_PROGRESS]: BookingStatus.COMPLETED,
};

const CANCELLABLE_BY_ADMIN_STATUSES = [
  BookingStatus.POSTED,
  BookingStatus.CONFIRMED,
  BookingStatus.TASKER_ON_THE_WAY,
  BookingStatus.CHECKED_IN,
  BookingStatus.IN_PROGRESS,
];

@Injectable()
export class AdminBookingRepository {
  private readonly logger = new Logger(AdminBookingRepository.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly pricingService: PricingService,
    private readonly taskerBalanceService: TaskerBalanceService,
    private readonly bookingWalletPaymentService: BookingWalletPaymentService,
    private readonly notificationService: NotificationService,
    private readonly paymentService: PaymentService,
    private readonly walletService: WalletService,
    private readonly bookingPolicyService: BookingPolicyService,
    private readonly bookingScheduleService: BookingScheduleService,
    private readonly bookingLocationPolicyService: BookingLocationPolicyService,
    private readonly vouchersService: VouchersService,
    private readonly incidentAdminService: IncidentAdminService,
    private readonly bookingLifecycleScheduler: BookingLifecycleSchedulerService,
    private readonly bookingSettlementService: BookingSettlementService,
  ) {}

  async createBooking(adminUserId: string, dto: CreateAdminBookingDto) {
    const result = await this.dataSource.transaction(async (manager) => {
      const customer = await manager.getRepository(CustomerEntity).findOne({
        where: { id: dto.customerId },
        relations: ['user'],
      });
      if (!customer) {
        throw new NotFoundException('Không tìm thấy hồ sơ customer');
      }
      if (!customer.user.isActive || customer.user.deletedAt) {
        throw new BadRequestException(
          'Tài khoản customer đã bị khóa hoặc ngừng hoạt động',
        );
      }
      if (!customer.user.phone?.trim()) {
        throw new BadRequestException(
          'Customer chưa có số điện thoại để tạo booking',
        );
      }
      if (dto.address && !dto.addressId) {
        throw new BadRequestException(
          'Admin phải chọn addressId đã lưu của customer; không nhập địa chỉ tự do',
        );
      }

      // Admin is allowed to bypass the "1 active booking per customer" policy
      // await this.bookingPolicyService.assertCustomerCanCreateBooking(
      //   manager,
      //   customer.id,
      // );

      const addressRepository = manager.getRepository(CustomerAddressEntity);
      const addressRef = dto.addressId
        ? await addressRepository.findOne({
            where: { id: dto.addressId, customer: { id: customer.id } },
          })
        : await addressRepository.findOne({
            where: { customer: { id: customer.id }, isDefault: true },
            order: { createdAt: 'DESC' },
          });
      if (!addressRef) {
        throw new BadRequestException(
          dto.addressId
            ? 'Địa chỉ không tồn tại hoặc không thuộc customer'
            : 'Customer chưa có địa chỉ mặc định',
        );
      }

      await this.bookingLocationPolicyService.assertSupportedBookingArea(
        manager,
        dto,
        addressRef.fullAddress,
        addressRef,
      );
      const scheduleStart = this.bookingScheduleService.buildScheduleStart(dto);
      const price = await this.pricingService.calculateBookingPrice(manager, {
        packageId: dto.packageId,
        subServiceIds: dto.subServiceIds,
        durationHours: dto.durationHours,
        scheduledStart: scheduleStart.scheduledStart,
        scheduledStartTime: scheduleStart.scheduledStartTime,
        hasPet: addressRef.hasPet,
        voucherCode: dto.voucherCode,
        customerId: customer.id,
      });
      const schedule = this.bookingScheduleService.buildSchedule(
        dto,
        price.durationHours,
      );

      const bookingRepository = manager.getRepository(BookingEntity);
      const bookingCode = await this.generateUniqueBookingCode(manager);
      const paymentMethod = dto.paymentMethod ?? PaymentMethod.CASH;
      const booking = await bookingRepository.save(
        bookingRepository.create({
          bookingCode,
          customer,
          tasker: null,
          packageId: price.package.id,
          address: addressRef.fullAddress,
          addressRef,
          note: dto.note?.trim() || null,
          scheduledStart: schedule.scheduledStart,
          scheduledEnd: schedule.scheduledEnd,
          scheduledStartDate: schedule.scheduledStartDate,
          scheduledStartTime: schedule.scheduledStartTime,
          scheduledEndDate: schedule.scheduledEndDate,
          scheduledEndTime: schedule.scheduledEndTime,
          durationHours: schedule.durationHours,
          status: BookingStatus.POSTED,
          basePrice: price.basePrice,
          addonPrice: price.addonPrice,
          peakFee: price.peakFee,
          petFee: price.petFee,
          waitingFee: price.waitingFee,
          discountAmount: price.discountAmount,
          totalPrice: price.totalPrice,
          paymentMethod,
          paymentStatus: PaymentStatus.PENDING,
          voucherId: price.voucher?.id ?? null,
          isRecurring: false,
          recurringRule: null,
        }),
      );
      await this.vouchersService.reserveForBooking(manager, {
        bookingId: booking.id,
        customerId: customer.id,
        voucherId: booking.voucherId,
      });

      const bookingSubServiceRepository = manager.getRepository(
        BookingSubServiceEntity,
      );
      const bookingSubServices = price.subServices.map((sub) => {
        return bookingSubServiceRepository.create({
          booking,
          subServiceId: sub.id,
          price: sub.pricingConfig?.basePrice || 0,
          durationHours: sub.durationHours || 0,
          quantity: 1,
        });
      });
      await bookingSubServiceRepository.save(bookingSubServices);

      await this.paymentService.createPendingPayment(
        manager,
        booking,
        customer,
        paymentMethod,
        price.totalPrice,
      );

      const logRepository = manager.getRepository(BookingStatusLogEntity);
      const createLog = await logRepository.save(
        logRepository.create({
          booking,
          oldStatus: null,
          newStatus: BookingStatus.POSTED,
          changedByUser: { id: adminUserId } as UserEntity,
          note: dto.reason,
          cancellationFee: 0,
          refundAmount: 0,
        }),
      );

      let assignedTasker: TaskerEntity | null = null;
      let assignmentLogId: string | null = null;
      if (dto.taskerId) {
        assignedTasker = await manager
          .getRepository(TaskerEntity)
          .createQueryBuilder('tasker')
          .innerJoinAndSelect('tasker.user', 'user')
          .setLock('pessimistic_write', undefined, ['tasker'])
          .where('tasker.id = :taskerId', { taskerId: dto.taskerId })
          .getOne();
        if (!assignedTasker) {
          throw new NotFoundException('Không tìm thấy Tasker được chỉ định');
        }
        this.assertTaskerCanBeAssigned(assignedTasker);
        if (
          await this.hasTaskerScheduleConflict(
            manager,
            assignedTasker.id,
            booking,
          )
        ) {
          throw new ConflictException(
            'Tasker được chỉ định đã có booking trùng thời gian',
          );
        }
        if (paymentMethod === PaymentMethod.CASH) {
          const platformFee = await this.getRequiredPlatformFee(
            manager,
            booking,
          );
          await this.taskerBalanceService.holdCashCommission(
            manager,
            assignedTasker.id,
            booking,
            platformFee,
          );
        }

        booking.tasker = assignedTasker;
        booking.status = BookingStatus.CONFIRMED;
        await bookingRepository.save(booking);
        const assignmentLog = await logRepository.save(
          logRepository.create({
            booking,
            oldStatus: BookingStatus.POSTED,
            newStatus: BookingStatus.CONFIRMED,
            changedByUser: { id: adminUserId } as UserEntity,
            note: `Admin tạo booking và gán Tasker ${assignedTasker.user.fullName}: ${dto.reason}`,
            cancellationFee: 0,
            refundAmount: 0,
          }),
        );
        assignmentLogId = assignmentLog.id;
      }

      return {
        booking,
        customerUserId: customer.user.id,
        taskerUserId: assignedTasker?.user.id,
        createLogId: createLog.id,
        assignmentLogId,
        package: price.package,
        subServices: price.subServices,
        voucher: price.voucher ?? null,
      };
    });

    if (result.taskerUserId) {
      void this.activateConfirmedLifecycle(result.booking.id);
    }

    await Promise.allSettled([
      this.notificationService.notify({
        userId: result.customerUserId,
        type: result.taskerUserId
          ? NotificationType.BOOKING_CONFIRMED
          : NotificationType.SYSTEM,
        title: 'Admin đã tạo booking cho bạn',
        content: `Booking ${result.booking.bookingCode} đã được tạo với trạng thái ${result.booking.status}.`,
        referenceType: NotificationRefType.BOOKING,
        referenceId: result.booking.id,
        dedupeKey: `admin-create-booking:${result.createLogId}:customer`,
      }),
      ...(result.taskerUserId
        ? [
            this.notificationService.notify({
              userId: result.taskerUserId,
              type: NotificationType.BOOKING_CONFIRMED,
              title: 'Bạn được gán một đơn mới',
              content: `Admin đã gán cho bạn đơn ${result.booking.bookingCode}.`,
              referenceType: NotificationRefType.BOOKING,
              referenceId: result.booking.id,
              dedupeKey: `admin-create-booking:${result.assignmentLogId}:tasker`,
            }),
          ]
        : []),
    ]);

    return {
      id: result.booking.id,
      bookingCode: result.booking.bookingCode,
      status: result.booking.status,
      customerId: result.booking.customer?.id ?? null,
      taskerId: result.booking.tasker?.id ?? null,
      service: {
        id: result.package.id,
        code: result.package.packageCode,
        name: result.package.name,
      },
      package: {
        id: result.package.id,
        code: result.package.packageCode,
        name: result.package.name,
      },
      subServices: result.subServices.map((sub) => ({
        id: sub.id,
        name: sub.name,
      })),
      address: result.booking.address,
      schedule: {
        scheduledStartDate: result.booking.scheduledStartDate,
        scheduledStartTime: result.booking.scheduledStartTime,
        scheduledEndDate: result.booking.scheduledEndDate,
        scheduledEndTime: result.booking.scheduledEndTime,
        durationHours: Number(result.booking.durationHours),
      },
      price: {
        basePrice: Number(result.booking.basePrice),
        addonPrice: Number(result.booking.addonPrice),
        peakFee: Number(result.booking.peakFee),
        petFee: Number(result.booking.petFee),
        waitingFee: Number(result.booking.waitingFee),
        discountAmount: Number(result.booking.discountAmount),
        totalPrice: Number(result.booking.totalPrice),
      },
      payment: {
        method: result.booking.paymentMethod,
        status: result.booking.paymentStatus,
      },
      voucher: result.voucher
        ? {
            id: result.voucher.id,
            code: result.voucher.code,
            name: result.voucher.name,
          }
        : null,
      audit: {
        createdBy: adminUserId,
        reason: dto.reason,
        createLogId: result.createLogId,
        assignmentLogId: result.assignmentLogId,
        createdAt: result.booking.createdAt,
      },
    };
  }

  async getActiveTaskers() {
    const taskers = await this.dataSource
      .getRepository(TaskerEntity)
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.user', 'u')
      .where('t.status = :status', { status: TaskerStatus.ACTIVE })
      .orderBy('u.fullName', 'ASC')
      .getMany();

    return taskers.map((t) => ({
      id: t.id,
      fullName: t.user?.fullName || 'N/A',
      phoneNumber: t.user?.phone || 'N/A',
    }));
  }

  async cancelBookingByAdmin(bookingId: string, adminUserId: string) {
    const result = await this.dataSource.transaction(async (manager) => {
      const booking = await manager
        .getRepository(BookingEntity)
        .createQueryBuilder('b')
        .leftJoinAndSelect('b.customer', 'c')
        .leftJoinAndSelect('c.user', 'cu')
        .leftJoinAndSelect('b.tasker', 't')
        .leftJoinAndSelect('t.user', 'tu')
        .setLock('pessimistic_write', undefined, ['b'])
        .where('b.id = :bookingId', { bookingId })
        .getOne();

      if (!booking) {
        throw new NotFoundException('Đơn hàng không tồn tại');
      }

      if (
        booking.status === BookingStatus.COMPLETED ||
        booking.status === BookingStatus.CANCELLED
      ) {
        throw new BadRequestException(
          'Không thể hủy đơn hàng đã hoàn thành hoặc đã hủy',
        );
      }

      const oldStatus = booking.status;
      booking.status = BookingStatus.CANCELLED;
      booking.cancelledAt = new Date();
      booking.cancelledBy = CancelledBy.ADMIN;
      booking.cancelledByUserId = adminUserId;
      await this.vouchersService.releaseReservationForBooking(
        manager,
        booking.id,
      );
      await this.bookingWalletPaymentService.refundEscrow(
        manager,
        booking,
        'admin hủy đơn',
      );

      const savedBooking = await manager
        .getRepository(BookingEntity)
        .save(booking);

      // Đơn offline/vãng lai không gắn customer → bỏ qua cập nhật thống kê.
      if (booking.customer) {
        await manager.increment(
          CustomerEntity,
          { id: booking.customer.id },
          'totalCancelled',
          1,
        );
      }

      const statusLog = manager.getRepository(BookingStatusLogEntity).create({
        booking: savedBooking,
        oldStatus,
        newStatus: BookingStatus.CANCELLED,
        changedByUser: { id: adminUserId } as UserEntity,
        note: 'Admin hủy đơn hàng',
        cancelledBy: CancelledBy.ADMIN,
        cancelledByUser: { id: adminUserId } as UserEntity,
        cancellationFee: 0,
        refundAmount: 0,
      });
      await manager.getRepository(BookingStatusLogEntity).save(statusLog);

      return {
        response: { success: true, message: 'Đã hủy đơn hàng thành công' },
        bookingId: booking.id,
        bookingCode: booking.bookingCode,
        taskerUserId: booking.tasker?.user?.id,
        customerUserId: booking.customer?.user?.id,
      };
    });

    const notifications: Promise<unknown>[] = [];
    if (result.taskerUserId) {
      notifications.push(
        this.notificationService.notify({
          userId: result.taskerUserId,
          type: NotificationType.BOOKING_CANCELLED,
          referenceId: result.bookingId,
          referenceType: NotificationRefType.BOOKING,
          title: 'Đơn hàng bị hủy bởi Admin',
          content: `Đơn ${result.bookingCode} đã bị quản trị viên hủy.`,
          dedupeKey: `booking:${result.bookingId}:${NotificationType.BOOKING_CANCELLED}:tasker`,
        }),
      );
    }
    if (result.customerUserId) {
      notifications.push(
        this.notificationService.notify({
          userId: result.customerUserId,
          type: NotificationType.BOOKING_CANCELLED,
          referenceId: result.bookingId,
          referenceType: NotificationRefType.BOOKING,
          title: 'Đơn hàng đã bị hủy',
          content: `Đơn ${result.bookingCode} của bạn đã bị quản trị viên hủy. Liên hệ hỗ trợ nếu bạn cần thêm thông tin.`,
          dedupeKey: `booking:${result.bookingId}:${NotificationType.BOOKING_CANCELLED}:customer`,
        }),
      );
    }
    if (notifications.length) {
      await Promise.allSettled(notifications);
    }
    await this.bookingLifecycleScheduler.deactivateBooking(result.bookingId);

    return result.response;
  }

  async assignTaskerToBooking(
    bookingId: string,
    taskerId: string,
    adminUserId: string,
  ) {
    const result = await this.dataSource.transaction(async (manager) => {
      const booking = await manager
        .getRepository(BookingEntity)
        .createQueryBuilder('b')
        .leftJoinAndSelect('b.customer', 'c')
        .leftJoinAndSelect('c.user', 'cu')
        .setLock('pessimistic_write', undefined, ['b'])
        .where('b.id = :bookingId', { bookingId })
        .getOne();

      if (!booking) {
        throw new NotFoundException('Đơn hàng không tồn tại');
      }

      if (booking.status !== BookingStatus.POSTED) {
        throw new BadRequestException(
          'Chỉ có thể gán thợ cho đơn hàng đang chờ thợ (POSTED)',
        );
      }

      const tasker = await manager.getRepository(TaskerEntity).findOne({
        where: { id: taskerId },
        relations: ['user'],
      });

      if (!tasker) {
        throw new NotFoundException('Không tìm thấy nhân viên (Tasker)');
      }

      if (tasker.status !== TaskerStatus.ACTIVE) {
        throw new BadRequestException(
          'Nhân viên không ở trạng thái hoạt động (ACTIVE)',
        );
      }

      const oldStatus = booking.status;
      booking.tasker = tasker;
      booking.status = BookingStatus.CONFIRMED;

      const savedBooking = await manager
        .getRepository(BookingEntity)
        .save(booking);

      const statusLog = manager.getRepository(BookingStatusLogEntity).create({
        booking: savedBooking,
        oldStatus,
        newStatus: BookingStatus.CONFIRMED,
        changedByUser: { id: adminUserId } as UserEntity,
        note: 'Admin gán nhân viên thủ công',
        cancellationFee: 0,
        refundAmount: 0,
      });
      await manager.getRepository(BookingStatusLogEntity).save(statusLog);

      return {
        response: { success: true, message: 'Gán nhân viên thành công' },
        bookingId: booking.id,
        bookingCode: booking.bookingCode,
        customerUserId: booking.customer?.user?.id,
        taskerUserId: tasker.user?.id,
        taskerName: tasker.user?.fullName || 'N/A',
      };
    });

    void this.activateConfirmedLifecycle(result.bookingId);

    await Promise.allSettled([
      ...(result.customerUserId
        ? [
            this.notificationService.notify({
              userId: result.customerUserId,
              type: NotificationType.BOOKING_CONFIRMED,
              referenceId: result.bookingId,
              referenceType: NotificationRefType.BOOKING,
              title: 'Đơn hàng đã được gán nhân viên',
              content: `Quản trị viên đã gán nhân viên ${result.taskerName} cho đơn ${result.bookingCode} của bạn.`,
              dedupeKey: `booking:${result.bookingId}:${NotificationType.BOOKING_CONFIRMED}`,
            }),
          ]
        : []),
      ...(result.taskerUserId
        ? [
            this.notificationService.notify({
              userId: result.taskerUserId,
              type: NotificationType.SYSTEM,
              referenceId: result.bookingId,
              referenceType: NotificationRefType.BOOKING,
              title: 'Bạn được gán đơn mới',
              content: `Bạn đã được quản trị viên gán đơn ${result.bookingCode}.`,
              dedupeKey: `booking:${result.bookingId}:tasker_assigned`,
            }),
          ]
        : []),
    ]);

    return result.response;
  }

  async searchBookings(queryDto: BookingSearchQueryDto) {
    const {
      keyword,
      status,
      paymentStatus,
      customerId,
      taskerId,
      serviceId,
      fromDate,
      toDate,
      abnormalEarlyCheckout,
      surchargeDisputed,
      serviceTier,
      farCheckin,
      checkinReviewStatus,
      noShowReviewStatus,
      overdueCompletion,
      page = 1,
      limit = 10,
    } = queryDto;

    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;
    if (from && to && from > to) {
      throw new BadRequestException('fromDate phải nhỏ hơn hoặc bằng toDate');
    }

    const query = this.dataSource
      .getRepository(BookingEntity)
      .createQueryBuilder('booking')
      // leftJoin để đơn offline/vãng lai (customer_id NULL) vẫn hiện trong list admin.
      .leftJoin('booking.customer', 'customer')
      .leftJoin('customer.user', 'customerUser')
      .leftJoin('booking.tasker', 'tasker')
      .leftJoin('tasker.user', 'taskerUser')
      .leftJoin(
        ServicePackageEntity,
        'package',
        'package.id = booking.packageId',
      );

    const normalizedKeyword = keyword?.trim();
    if (normalizedKeyword) {
      query
        .andWhere(
          `(
          booking.bookingCode ILIKE :keyword
          OR customerUser.fullName ILIKE :keyword
          OR customerUser.email ILIKE :keyword
          OR customerUser.phone ILIKE :keyword
          OR taskerUser.fullName ILIKE :keyword
          OR taskerUser.email ILIKE :keyword
          OR taskerUser.phone ILIKE :keyword
          OR booking.guestName ILIKE :keyword
          OR booking.guestPhone ILIKE :keyword
        )`,
        )
        .setParameter('keyword', `%${normalizedKeyword}%`);
    }

    if (paymentStatus) {
      query
        .andWhere('booking.paymentStatus = :paymentStatus')
        .setParameter('paymentStatus', paymentStatus);
    }
    if (customerId) {
      query
        .andWhere('customer.id = :customerId')
        .setParameter('customerId', customerId);
    }
    if (taskerId) {
      query
        .andWhere('tasker.id = :taskerId')
        .setParameter('taskerId', taskerId);
    }
    if (serviceId) {
      query
        .andWhere('booking.serviceId = :serviceId')
        .setParameter('serviceId', serviceId);
    }
    if (from) {
      query
        .andWhere('booking.createdAt >= :fromDate')
        .setParameter('fromDate', from);
    }
    if (to) {
      query.andWhere('booking.createdAt <= :toDate').setParameter('toDate', to);
    }
    if (abnormalEarlyCheckout) {
      query
        .andWhere('booking.earlyMinutes > :earlyThreshold')
        .setParameter('earlyThreshold', EARLY_CHECKOUT_ABNORMAL_MINUTES);
    }
    if (surchargeDisputed) {
      query
        .andWhere('booking.surchargeStatus = :disputedStatus')
        .setParameter('disputedStatus', BookingSurchargeStatus.DISPUTED);
    }
    if (serviceTier) {
      query
        .andWhere('booking.serviceTier = :serviceTier')
        .setParameter('serviceTier', serviceTier);
    }
    if (farCheckin) {
      query.andWhere('booking.checkinFar = true');
    }
    if (checkinReviewStatus) {
      query
        .andWhere('booking.checkinReviewStatus = :checkinReviewStatus')
        .andWhere('booking.checkedInAt IS NOT NULL')
        .setParameter('checkinReviewStatus', checkinReviewStatus);
    }
    if (noShowReviewStatus) {
      query
        .andWhere('booking.noShowReviewStatus = :noShowReviewStatus')
        .setParameter('noShowReviewStatus', noShowReviewStatus);
    }
    if (overdueCompletion) {
      query
        .andWhere('booking.status = :overdueCompletionStatus', {
          overdueCompletionStatus: BookingStatus.IN_PROGRESS,
        })
        .andWhere(overdueCompletionSql('booking', VN_NOW_SQL));
    }

    const statusCountRows = await query
      .clone()
      .select('booking.status', 'status')
      .addSelect('COUNT(DISTINCT booking.id)', 'count')
      .groupBy('booking.status')
      .getRawMany<BookingStatusCountRow>();

    const statusCounts = Object.values(BookingStatus).reduce(
      (counts, bookingStatus) => {
        counts[bookingStatus] = 0;
        return counts;
      },
      {} as Record<BookingStatus, number>,
    );

    for (const row of statusCountRows) {
      statusCounts[row.status] = Number(row.count);
    }

    if (status) {
      query.andWhere('booking.status = :status').setParameter('status', status);
    }

    const total = await query.clone().getCount();
    const rows = await query
      .select([
        'booking.id AS "id"',
        'booking.bookingCode AS "bookingCode"',
        'customer.id AS "customerId"',
        'customerUser.id AS "customerUserId"',
        'customerUser.fullName AS "customerName"',
        'customerUser.email AS "customerEmail"',
        'customerUser.phone AS "customerPhone"',
        'booking.guestName AS "guestName"',
        'booking.guestPhone AS "guestPhone"',
        'tasker.id AS "taskerId"',
        'taskerUser.id AS "taskerUserId"',
        'taskerUser.fullName AS "taskerName"',
        'taskerUser.email AS "taskerEmail"',
        'taskerUser.phone AS "taskerPhone"',
        'booking.packageId AS "serviceId"',
        'package.packageCode AS "serviceCode"',
        'package.name AS "serviceName"',
        'booking.address AS "address"',
        'booking.scheduledStart AS "scheduledStart"',
        'booking.scheduledEnd AS "scheduledEnd"',
        'booking.scheduledStartDate AS "scheduledStartDate"',
        'booking.scheduledStartTime AS "scheduledStartTime"',
        'booking.scheduledEndDate AS "scheduledEndDate"',
        'booking.scheduledEndTime AS "scheduledEndTime"',
        'booking.durationHours AS "durationHours"',
        'booking.totalPrice AS "totalPrice"',
        'booking.status AS "status"',
        'booking.paymentStatus AS "paymentStatus"',
        'booking.paymentMethod AS "paymentMethod"',
        'booking.checkedInAt AS "checkedInAt"',
        'booking.checkedOutAt AS "checkedOutAt"',
        'booking.overtimeMinutes AS "overtimeMinutes"',
        'booking.earlyMinutes AS "earlyMinutes"',
        'booking.waitingFee AS "waitingFee"',
        'booking.checkinFar AS "checkinFar"',
        'booking.checkinDistanceMeters AS "checkinDistanceMeters"',
        'booking.checkinAccuracyMeters AS "checkinAccuracyMeters"',
        'booking.checkinLatitude AS "checkinLatitude"',
        'booking.checkinLongitude AS "checkinLongitude"',
        'booking.checkinTargetLatitude AS "checkinTargetLatitude"',
        'booking.checkinTargetLongitude AS "checkinTargetLongitude"',
        'booking.checkinProofPhotoUrl AS "checkinProofPhotoUrl"',
        'booking.checkinReviewStatus AS "checkinReviewStatus"',
        'booking.checkinVerificationSource AS "checkinVerificationSource"',
        'booking.noShowReviewStatus AS "noShowReviewStatus"',
        'booking.noShowDetectedAt AS "noShowDetectedAt"',
        'booking.createdAt AS "createdAt"',
      ])
      .orderBy('booking.createdAt', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany<AdminBookingListRow>();

    return {
      data: rows.map((row) => ({
        id: row.id,
        bookingCode: row.bookingCode,
        // Giữ các trường phẳng để không làm hỏng autocomplete booking hiện có.
        // Đơn vãng lai: hiển thị tên/SĐT khách lưu trên đơn.
        customerName: row.customerName ?? row.guestName ?? 'Khách vãng lai',
        taskerName: row.taskerName,
        serviceName: row.serviceName,
        scheduledStart: row.scheduledStart,
        customer: {
          id: row.customerId,
          userId: row.customerUserId,
          fullName: row.customerName ?? row.guestName ?? 'Khách vãng lai',
          email: row.customerEmail,
          phone: row.customerPhone ?? row.guestPhone,
        },
        tasker: row.taskerId
          ? {
              id: row.taskerId,
              userId: row.taskerUserId,
              fullName: row.taskerName,
              email: row.taskerEmail,
              phone: row.taskerPhone,
            }
          : null,
        service: {
          id: row.serviceId,
          code: row.serviceCode,
          name: row.serviceName,
        },
        address: row.address,
        schedule: {
          scheduledStart: row.scheduledStart,
          scheduledEnd: row.scheduledEnd,
          scheduledStartDate: row.scheduledStartDate,
          scheduledStartTime: row.scheduledStartTime,
          scheduledEndDate: row.scheduledEndDate,
          scheduledEndTime: row.scheduledEndTime,
          durationHours: Number(row.durationHours),
        },
        totalPrice: Number(row.totalPrice),
        status: row.status,
        paymentStatus: row.paymentStatus,
        paymentMethod: row.paymentMethod,
        workTiming: {
          checkedInAt: row.checkedInAt ?? null,
          checkedOutAt: row.checkedOutAt ?? null,
          overtimeMinutes: Number(row.overtimeMinutes ?? 0),
          earlyMinutes: Number(row.earlyMinutes ?? 0),
          surchargeFee: Number(row.waitingFee ?? 0),
          isEarlyAbnormal:
            Number(row.earlyMinutes ?? 0) > EARLY_CHECKOUT_ABNORMAL_MINUTES,
          isCheckinFar: row.checkinFar === true,
          checkinDistanceMeters:
            row.checkinDistanceMeters != null
              ? Number(row.checkinDistanceMeters)
              : null,
          checkinAccuracyMeters:
            row.checkinAccuracyMeters != null
              ? Number(row.checkinAccuracyMeters)
              : null,
          checkinLatitude:
            row.checkinLatitude != null ? Number(row.checkinLatitude) : null,
          checkinLongitude:
            row.checkinLongitude != null ? Number(row.checkinLongitude) : null,
          checkinTargetLatitude:
            row.checkinTargetLatitude != null
              ? Number(row.checkinTargetLatitude)
              : null,
          checkinTargetLongitude:
            row.checkinTargetLongitude != null
              ? Number(row.checkinTargetLongitude)
              : null,
          checkinProofPhotoUrl: row.checkinProofPhotoUrl ?? null,
          checkinReviewStatus: row.checkinReviewStatus,
          checkinVerificationSource: row.checkinVerificationSource ?? null,
        },
        noShow: {
          reviewStatus: row.noShowReviewStatus,
          detectedAt: row.noShowDetectedAt ?? null,
        },
        createdAt: row.createdAt,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      statusCounts,
    };
  }

  async getBookingDetail(bookingId: string) {
    const booking = await this.dataSource
      .getRepository(BookingEntity)
      .createQueryBuilder('booking')
      // leftJoin để xem được cả đơn offline/vãng lai (customer_id NULL).
      .leftJoinAndSelect('booking.customer', 'customer')
      .leftJoinAndSelect('customer.user', 'customerUser')
      .leftJoinAndSelect('booking.tasker', 'tasker')
      .leftJoinAndSelect('tasker.user', 'taskerUser')
      .leftJoinAndSelect('booking.addressRef', 'addressRef')
      .leftJoinAndSelect(
        'booking.checkinReviewedByAdmin',
        'checkinReviewedByAdmin',
      )
      .leftJoinAndSelect(
        'booking.noShowReviewedByAdmin',
        'noShowReviewedByAdmin',
      )
      .leftJoinAndSelect('booking.package', 'package')
      .leftJoinAndSelect('booking.bookingSubServices', 'bookingSubServices')
      .leftJoinAndSelect('bookingSubServices.subService', 'subService')
      .where('booking.id = :bookingId', { bookingId })
      .getOne();

    if (!booking) {
      throw new NotFoundException(`Không tìm thấy booking với id ${bookingId}`);
    }

    const [
      payment,
      timeline,
      voucher,
      settlementLedger,
      checkinIncident,
      noShowIncident,
    ] = await Promise.all([
      this.dataSource.getRepository(PaymentEntity).findOne({
        where: { booking: { id: booking.id } },
        order: { createdAt: 'DESC' },
      }),
      this.dataSource.getRepository(BookingStatusLogEntity).find({
        where: { booking: { id: booking.id } },
        relations: ['changedByUser', 'cancelledByUser', 'payment'],
        order: { createdAt: 'ASC' },
      }),
      booking.voucherId
        ? this.dataSource.getRepository(VoucherEntity).findOne({
            where: { id: booking.voucherId },
          })
        : Promise.resolve(null),
      this.getSettlementLedger(booking.id),
      this.dataSource
        .getRepository(IncidentEntity)
        .createQueryBuilder('incident')
        .where('incident.booking_id = :bookingId', { bookingId: booking.id })
        .andWhere('incident.type = :type', {
          type: IncidentType.CHECKIN_VIOLATION,
        })
        .andWhere('incident.status != :closed', {
          closed: IncidentStatus.CLOSED,
        })
        .orderBy('incident.reportedAt', 'DESC')
        .getOne(),
      this.dataSource
        .getRepository(IncidentEntity)
        .createQueryBuilder('incident')
        .where('incident.booking_id = :bookingId', { bookingId: booking.id })
        .andWhere('incident.type = :type', {
          type: IncidentType.NO_SHOW,
        })
        .andWhere('incident.status != :closed', {
          closed: IncidentStatus.CLOSED,
        })
        .orderBy('incident.reportedAt', 'DESC')
        .getOne(),
    ]);

    const totalPrice = Number(booking.totalPrice);
    const subtotal = totalPrice + Number(booking.discountAmount);
    const surchargeAmount = Math.min(
      Math.max(Math.round(Number(booking.waitingFee)), 0),
      subtotal,
    );
    const settledBreakdown = resolveBookingPaymentBreakdown({
      subtotal,
      surchargeAmount,
      paymentMethod: booking.paymentMethod,
      ledger: settlementLedger,
    });
    const commissionRate =
      settledBreakdown?.commissionRate ??
      (await this.pricingService.getPlatformCommissionRate(
        this.dataSource.manager,
      ));
    const platformFee =
      settledBreakdown?.platformFee ??
      Math.round((subtotal * commissionRate) / 100);
    const taskerIncome =
      settledBreakdown?.taskerIncome ?? Math.max(subtotal - platformFee, 0);
    const baseAmount = Math.max(subtotal - surchargeAmount, 0);
    const basePlatformFee =
      settledBreakdown?.basePlatformFee ??
      Math.round((baseAmount * commissionRate) / 100);
    const surchargePlatformFee =
      settledBreakdown?.surchargePlatformFee ??
      Math.max(platformFee - basePlatformFee, 0);
    const surchargePaymentMethod =
      settledBreakdown?.surchargePaymentMethod ??
      (surchargeAmount <= 0
        ? null
        : booking.paymentMethod === PaymentMethod.CASH ||
            booking.surchargeStatus ===
              BookingSurchargeStatus.PENDING_TASKER_CONFIRM
          ? PaymentMethod.CASH
          : booking.surchargeStatus === BookingSurchargeStatus.PAID
            ? booking.paymentMethod
            : null);
    const acceptedAt =
      timeline.find((log) => log.newStatus === BookingStatus.CONFIRMED)
        ?.createdAt ?? null;

    return {
      id: booking.id,
      bookingCode: booking.bookingCode,
      status: booking.status,
      customer: {
        // Guest (đơn offline/vãng lai): lấy tên/SĐT lưu trên đơn, không có tài khoản.
        id: booking.customer?.id ?? null,
        userId: booking.customer?.user?.id ?? null,
        fullName:
          booking.customer?.user?.fullName ??
          booking.guestName ??
          'Khách vãng lai',
        email: booking.customer?.user?.email ?? null,
        phone: booking.customer?.user?.phone ?? booking.guestPhone ?? null,
        avatarUrl: booking.customer?.user?.avatarUrl ?? null,
      },
      tasker: booking.tasker
        ? {
            id: booking.tasker.id,
            userId: booking.tasker.user.id,
            fullName: booking.tasker.user.fullName,
            email: booking.tasker.user.email,
            phone: booking.tasker.user.phone,
            avatarUrl: booking.tasker.user.avatarUrl ?? null,
            ratingAvg: Number(booking.tasker.ratingAvg),
          }
        : null,
      service: booking.package
        ? {
            id: booking.package.id,
            code: booking.package.packageCode,
            name: booking.package.name,
            description: booking.package.policyDescription ?? null,
          }
        : {
            id: booking.packageId,
            code: null,
            name: 'Gói dịch vụ đã ngừng hoạt động',
            description: null,
          },
      package: booking.package
        ? {
            id: booking.package.id,
            code: booking.package.packageCode,
            name: booking.package.name,
            description: booking.package.policyDescription ?? null,
          }
        : null,
      subServices: (booking.bookingSubServices || []).map((bss) => ({
        id: bss.subServiceId,
        name: bss.subService?.name || 'Dịch vụ con',
        price: toNumber(bss.price),
        durationHours: toNumber(bss.durationHours),
      })),
      address: {
        id: booking.addressRef?.id ?? null,
        label: booking.addressRef?.label ?? null,
        fullAddress: booking.address,
        district: booking.district ?? null,
        wardDetail: booking.addressRef?.wardDetail ?? null,
        latitude:
          booking.addressRef?.latitude != null
            ? Number(booking.addressRef.latitude)
            : booking.latitude != null
              ? Number(booking.latitude)
              : null,
        longitude:
          booking.addressRef?.longitude != null
            ? Number(booking.addressRef.longitude)
            : booking.longitude != null
              ? Number(booking.longitude)
              : null,
        hasPet: booking.addressRef?.hasPet ?? false,
      },
      schedule: {
        scheduledStart: booking.scheduledStart ?? null,
        scheduledEnd: booking.scheduledEnd ?? null,
        scheduledStartDate: booking.scheduledStartDate ?? null,
        scheduledStartTime: booking.scheduledStartTime ?? null,
        scheduledEndDate: booking.scheduledEndDate ?? null,
        scheduledEndTime: booking.scheduledEndTime ?? null,
        durationHours: Number(booking.durationHours),
      },
      price: {
        basePrice: Number(booking.basePrice),
        addonPrice: Number(booking.addonPrice),
        peakFee: Number(booking.peakFee),
        petFee: Number(booking.petFee),
        waitingFee: Number(booking.waitingFee),
        discountAmount: Number(booking.discountAmount),
        totalPrice,
      },
      operation: {
        acceptedAt,
        checkedInAt: booking.checkedInAt ?? null,
        checkedOutAt: booking.checkedOutAt ?? null,
        completedAt: booking.completedAt ?? null,
        cancelledAt: booking.cancelledAt ?? null,
        serviceTier: booking.serviceTier,
        premiumFee: Number(booking.premiumFee ?? 0),
        preferredTaskerId: booking.preferredTaskerId ?? null,
        workTiming: {
          checkedInAt: booking.checkedInAt ?? null,
          overtimeMinutes: Number(booking.overtimeMinutes ?? 0),
          earlyMinutes: Number(booking.earlyMinutes ?? 0),
          surchargeFee: Number(booking.waitingFee ?? 0),
          surchargePending: isSurchargePending(booking.surchargeStatus),
          surchargeStatus: booking.surchargeStatus,
          surchargeDisputeReason: booking.surchargeDisputeReason ?? null,
          platformAdvanceAmount: Number(booking.platformAdvanceAmount ?? 0),
          approvedOvertimeMinutes: Number(booking.approvedOvertimeMinutes ?? 0),
          isEarlyAbnormal:
            Number(booking.earlyMinutes ?? 0) > EARLY_CHECKOUT_ABNORMAL_MINUTES,
          isCheckinFar: booking.checkinFar === true,
          checkinDistanceMeters:
            booking.checkinDistanceMeters != null
              ? Number(booking.checkinDistanceMeters)
              : null,
          checkinProofPhotoUrl: booking.checkinProofPhotoUrl ?? null,
          checkinLatitude:
            booking.checkinLatitude != null
              ? Number(booking.checkinLatitude)
              : null,
          checkinLongitude:
            booking.checkinLongitude != null
              ? Number(booking.checkinLongitude)
              : null,
          checkinAccuracyMeters:
            booking.checkinAccuracyMeters != null
              ? Number(booking.checkinAccuracyMeters)
              : null,
          checkinTargetLatitude:
            booking.checkinTargetLatitude != null
              ? Number(booking.checkinTargetLatitude)
              : null,
          checkinTargetLongitude:
            booking.checkinTargetLongitude != null
              ? Number(booking.checkinTargetLongitude)
              : null,
          checkinVerificationSource: booking.checkinVerificationSource ?? null,
          checkinReviewStatus: booking.checkinReviewStatus,
          checkinReviewedAt: booking.checkinReviewedAt ?? null,
          checkinReviewReason: booking.checkinReviewReason ?? null,
          checkinReviewedByAdmin: booking.checkinReviewedByAdmin
            ? {
                id: booking.checkinReviewedByAdmin.id,
                fullName: booking.checkinReviewedByAdmin.fullName,
              }
            : null,
          checkinIncident: checkinIncident
            ? {
                id: checkinIncident.id,
                incidentCode: checkinIncident.incidentCode ?? null,
                status: checkinIncident.status,
                claimedAmount:
                  checkinIncident.claimedAmount != null
                    ? Number(checkinIncident.claimedAmount)
                    : null,
              }
            : null,
        },
        noShow: {
          reviewStatus: booking.noShowReviewStatus,
          detectedAt: booking.noShowDetectedAt ?? null,
          explanation: booking.noShowExplanation ?? null,
          explanationSubmittedAt: booking.noShowExplanationSubmittedAt ?? null,
          reviewedAt: booking.noShowReviewedAt ?? null,
          reviewReason: booking.noShowReviewReason ?? null,
          warningPoints: Number(booking.noShowWarningPoints ?? 0),
          refundAmount: Number(booking.noShowRefundAmount ?? 0),
          reviewedByAdmin: booking.noShowReviewedByAdmin
            ? {
                id: booking.noShowReviewedByAdmin.id,
                fullName: booking.noShowReviewedByAdmin.fullName,
              }
            : null,
          incident: noShowIncident
            ? {
                id: noShowIncident.id,
                incidentCode: noShowIncident.incidentCode ?? null,
                status: noShowIncident.status,
                claimedAmount:
                  noShowIncident.claimedAmount != null
                    ? Number(noShowIncident.claimedAmount)
                    : null,
              }
            : null,
        },
        timeline: timeline.map((log) => ({
          id: log.id,
          oldStatus: log.oldStatus ?? null,
          newStatus: log.newStatus,
          note: log.note ?? null,
          changedBy: log.changedByUser
            ? {
                id: log.changedByUser.id,
                fullName: log.changedByUser.fullName,
                role: log.changedByUser.role,
              }
            : null,
          cancelledBy: log.cancelledBy ?? null,
          cancelledByUser: log.cancelledByUser
            ? {
                id: log.cancelledByUser.id,
                fullName: log.cancelledByUser.fullName,
                role: log.cancelledByUser.role,
              }
            : null,
          cancelReason: log.cancelReason ?? null,
          cancellationFee: Number(log.cancellationFee),
          refundAmount: Number(log.refundAmount),
          paymentId: log.payment?.id ?? null,
          createdAt: log.createdAt,
        })),
      },
      payment: {
        status: booking.paymentStatus,
        method: booking.paymentMethod,
        totalPrice,
        platformFee,
        taskerIncome,
        commissionRate,
        isEstimated: settledBreakdown === null,
        baseAmount,
        basePlatformFee,
        basePaymentMethod: booking.paymentMethod,
        surchargeAmount,
        surchargePlatformFee,
        surchargePaymentMethod,
        latestPayment: payment
          ? {
              id: payment.id,
              status: payment.status,
              method: payment.method,
              amount: Number(payment.amount),
              transactionCode: payment.transactionCode ?? null,
              paidAt: payment.paidAt ?? null,
              refundedAt: payment.refundedAt ?? null,
              createdAt: payment.createdAt,
            }
          : null,
        voucher: voucher
          ? {
              id: voucher.id,
              code: voucher.code,
              name: voucher.name,
              type: voucher.type,
              value: Number(voucher.value),
              discountAmount: Number(booking.discountAmount),
            }
          : null,
      },
      note: booking.note ?? null,
      isRecurring: booking.isRecurring,
      recurringRule: booking.recurringRule ?? null,
      cancelledBy: booking.cancelledBy ?? null,
      cancelledByUserId: booking.cancelledByUserId ?? null,
      voucherId: booking.voucherId ?? null,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
    };
  }

  async getAvailableTaskers(
    bookingId: string,
    queryDto: AvailableTaskersQueryDto,
  ) {
    const booking = await this.findAssignableBooking(bookingId);
    const { keyword, page = 1, limit = 10 } = queryDto;
    const platformFee =
      booking.paymentMethod === PaymentMethod.CASH
        ? await this.getRequiredPlatformFee(this.dataSource.manager, booking)
        : 0;

    const query = this.dataSource
      .getRepository(TaskerEntity)
      .createQueryBuilder('tasker')
      .innerJoin('tasker.user', 'user')
      .leftJoin(
        WalletEntity,
        'wallet',
        'wallet.tasker_id = tasker.id AND wallet.owner_type = :walletOwnerType',
        { walletOwnerType: WalletOwnerType.TASKER },
      )
      .where('tasker.status = :taskerStatus', {
        taskerStatus: TaskerStatus.ACTIVE,
      })
      .andWhere('tasker.docStatus = :docStatus', {
        docStatus: DocumentStatus.APPROVED,
      })
      .andWhere('user.isActive = true')
      .andWhere('user.deletedAt IS NULL')
      .andWhere('tasker.id != :currentTaskerId', {
        currentTaskerId:
          booking.tasker?.id ?? '00000000-0000-0000-0000-000000000000',
      })
      .andWhere(
        `NOT EXISTS (
          SELECT 1
          FROM bookings busy_booking
          WHERE busy_booking.tasker_id = tasker.id
            AND busy_booking.id != :bookingId
            AND busy_booking.status IN (:...busyStatuses)
            AND (
              busy_booking.scheduled_start_date
              + busy_booking.scheduled_start_time
            ) < (
              CAST(:targetEndDate AS date)
              + CAST(:targetEndTime AS time)
            )
            AND (
              busy_booking.scheduled_end_date
              + busy_booking.scheduled_end_time
            ) > (
              CAST(:targetStartDate AS date)
              + CAST(:targetStartTime AS time)
            )
        )`,
        {
          bookingId: booking.id,
          busyStatuses: BUSY_TASKER_BOOKING_STATUSES,
          targetStartDate: booking.scheduledStartDate,
          targetStartTime: booking.scheduledStartTime,
          targetEndDate: booking.scheduledEndDate,
          targetEndTime: booking.scheduledEndTime,
        },
      );

    if (booking.paymentMethod === PaymentMethod.CASH && platformFee > 0) {
      query.andWhere('COALESCE(wallet.balance, 0) >= :platformFee', {
        platformFee,
      });
    }

    if (keyword) {
      query.andWhere(
        `(
          user.fullName ILIKE :keyword
          OR user.email ILIKE :keyword
          OR user.phone ILIKE :keyword
        )`,
        { keyword: `%${keyword}%` },
      );
    }

    const total = await query.clone().getCount();
    const rows = await query
      .select([
        'tasker.id AS "id"',
        'user.id AS "userId"',
        'user.fullName AS "fullName"',
        'user.email AS "email"',
        'user.phone AS "phone"',
        'user.avatarUrl AS "avatarUrl"',
        'tasker.presenceStatus AS "presenceStatus"',
        'tasker.ratingAvg AS "ratingAvg"',
        'tasker.totalCompletedJobs AS "totalCompletedJobs"',
        'tasker.workingAddress AS "workingAddress"',
        'COALESCE(wallet.balance, 0) AS "walletBalance"',
      ])
      .orderBy(
        `CASE WHEN tasker.presenceStatus = 'ONLINE' THEN 0 ELSE 1 END`,
        'ASC',
      )
      .addOrderBy('tasker.ratingAvg', 'DESC')
      .addOrderBy('tasker.totalCompletedJobs', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany<AvailableTaskerRow>();

    return {
      booking: {
        id: booking.id,
        bookingCode: booking.bookingCode,
        status: booking.status,
        currentTaskerId: booking.tasker?.id ?? null,
        schedule: {
          scheduledStartDate: booking.scheduledStartDate,
          scheduledStartTime: booking.scheduledStartTime,
          scheduledEndDate: booking.scheduledEndDate,
          scheduledEndTime: booking.scheduledEndTime,
        },
        paymentMethod: booking.paymentMethod,
        requiredPlatformFee:
          booking.paymentMethod === PaymentMethod.CASH ? platformFee : 0,
      },
      data: rows.map((row) => {
        const walletBalance = Number(row.walletBalance);
        const depositBalance = Number(row.depositBalance);
        return {
          id: row.id,
          userId: row.userId,
          fullName: row.fullName,
          email: row.email,
          phone: row.phone,
          avatarUrl: row.avatarUrl,
          presenceStatus: row.presenceStatus,
          ratingAvg: Number(row.ratingAvg),
          totalCompletedJobs: row.totalCompletedJobs,
          workingAddress: row.workingAddress,
          financialCapacity: {
            walletBalance,
            depositBalance,
            availableAmount: walletBalance + depositBalance,
          },
        };
      }),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async assignTasker(
    bookingId: string,
    adminUserId: string,
    dto: AssignTaskerDto,
  ) {
    const assignment = await this.dataSource.transaction(async (manager) => {
      const booking = await manager
        .getRepository(BookingEntity)
        .createQueryBuilder('booking')
        .leftJoinAndSelect('booking.tasker', 'currentTasker')
        .leftJoinAndSelect('currentTasker.user', 'currentTaskerUser')
        .leftJoinAndSelect('booking.customer', 'customer')
        .leftJoinAndSelect('customer.user', 'customerUser')
        .setLock('pessimistic_write', undefined, ['booking'])
        .where('booking.id = :bookingId', { bookingId })
        .getOne();

      if (!booking) {
        throw new NotFoundException(
          `Không tìm thấy booking với id ${bookingId}`,
        );
      }
      this.assertBookingCanBeAssigned(booking);

      if (booking.tasker?.id === dto.taskerId) {
        throw new ConflictException('Tasker này đã được gán cho booking');
      }

      const tasker = await manager
        .getRepository(TaskerEntity)
        .createQueryBuilder('tasker')
        .innerJoinAndSelect('tasker.user', 'user')
        .setLock('pessimistic_write', undefined, ['tasker'])
        .where('tasker.id = :taskerId', { taskerId: dto.taskerId })
        .getOne();
      if (!tasker) {
        throw new NotFoundException('Không tìm thấy Tasker');
      }
      this.assertTaskerCanBeAssigned(tasker);

      const hasScheduleConflict = await this.hasTaskerScheduleConflict(
        manager,
        tasker.id,
        booking,
      );
      if (hasScheduleConflict) {
        throw new ConflictException(
          'Tasker đã có booking trùng thời gian làm việc',
        );
      }

      if (booking.paymentMethod === PaymentMethod.CASH) {
        const platformFee = await this.getRequiredPlatformFee(manager, booking);
        // Đổi Tasker: hold cũ được giải phóng bên trong holdCashCommission trước khi
        // giữ cho người mới (booking.tasker lúc này vẫn là người cũ).
        await this.taskerBalanceService.holdCashCommission(
          manager,
          tasker.id,
          booking,
          platformFee,
        );
      }

      const previousTasker = booking.tasker
        ? {
            id: booking.tasker.id,
            userId: booking.tasker.user?.id,
            fullName: booking.tasker.user?.fullName ?? null,
          }
        : null;
      const oldStatus = booking.status;
      booking.tasker = tasker;
      booking.status = BookingStatus.CONFIRMED;
      const savedBooking = await manager
        .getRepository(BookingEntity)
        .save(booking);

      const action = previousTasker ? 'thay Tasker' : 'gán Tasker';
      const statusLog = manager.getRepository(BookingStatusLogEntity).create({
        booking: savedBooking,
        oldStatus,
        newStatus: BookingStatus.CONFIRMED,
        changedByUser: { id: adminUserId } as UserEntity,
        note:
          dto.note || `Admin ${action}: ${tasker.user.fullName} (${tasker.id})`,
        cancellationFee: 0,
        refundAmount: 0,
      });
      await manager.getRepository(BookingStatusLogEntity).save(statusLog);

      return {
        booking: savedBooking,
        customerUserId: booking.customer?.user?.id ?? null,
        previousTasker,
        tasker: {
          id: tasker.id,
          userId: tasker.user.id,
          fullName: tasker.user.fullName,
          email: tasker.user.email,
          phone: tasker.user.phone,
          avatarUrl: tasker.user.avatarUrl ?? null,
        },
        statusLogId: statusLog.id,
      };
    });

    void this.activateConfirmedLifecycle(assignment.booking.id);

    await Promise.allSettled([
      // Đơn offline/vãng lai không có tài khoản khách → chỉ thông báo tasker.
      ...(assignment.customerUserId
        ? [
            this.notificationService.notify({
              userId: assignment.customerUserId,
              type: NotificationType.BOOKING_CONFIRMED,
              title: 'Đơn đặt lịch đã được xác nhận',
              content: `${assignment.tasker.fullName} đã được gán cho đơn ${assignment.booking.bookingCode}.`,
              referenceType: NotificationRefType.BOOKING,
              referenceId: assignment.booking.id,
              dedupeKey: `admin-assignment:${assignment.booking.id}:${assignment.tasker.id}:customer`,
            }),
          ]
        : []),
      this.notificationService.notify({
        userId: assignment.tasker.userId,
        type: NotificationType.BOOKING_CONFIRMED,
        title: 'Bạn được gán một đơn mới',
        content: `Admin đã gán cho bạn đơn ${assignment.booking.bookingCode}.`,
        referenceType: NotificationRefType.BOOKING,
        referenceId: assignment.booking.id,
        dedupeKey: `admin-assignment:${assignment.booking.id}:${assignment.tasker.id}:tasker`,
      }),
      ...(assignment.previousTasker?.userId
        ? [
            this.notificationService.notify({
              userId: assignment.previousTasker.userId,
              type: NotificationType.SYSTEM,
              title: 'Booking đã được điều phối lại',
              content: `Bạn không còn được phân công đơn ${assignment.booking.bookingCode}.`,
              referenceType: NotificationRefType.BOOKING,
              referenceId: assignment.booking.id,
              dedupeKey: `admin-reassignment:${assignment.booking.id}:${assignment.previousTasker.id}`,
            }),
          ]
        : []),
    ]);

    return {
      id: assignment.booking.id,
      bookingCode: assignment.booking.bookingCode,
      status: assignment.booking.status,
      previousTasker: assignment.previousTasker,
      tasker: assignment.tasker,
      statusLogId: assignment.statusLogId,
      assignedAt: assignment.booking.updatedAt,
    };
  }

  async reviewCheckin(
    bookingId: string,
    adminUserId: string,
    dto: ReviewBookingCheckinDto,
  ) {
    if (
      dto.openIncident &&
      dto.decision !== AdminCheckinReviewDecision.REJECT
    ) {
      throw new BadRequestException(
        'Chỉ có thể mở Incident khi Admin từ chối check-in',
      );
    }

    const targetReviewStatus =
      dto.decision === AdminCheckinReviewDecision.APPROVE
        ? BookingCheckinReviewStatus.APPROVED
        : dto.decision === AdminCheckinReviewDecision.REJECT
          ? BookingCheckinReviewStatus.REJECTED
          : BookingCheckinReviewStatus.NOT_VERIFIABLE;

    const reviewed = await this.dataSource.transaction(async (manager) => {
      const booking = await manager
        .getRepository(BookingEntity)
        .createQueryBuilder('booking')
        .leftJoinAndSelect('booking.customer', 'customer')
        .leftJoinAndSelect('customer.user', 'customerUser')
        .leftJoinAndSelect('booking.tasker', 'tasker')
        .leftJoinAndSelect('tasker.user', 'taskerUser')
        .setLock('pessimistic_write', undefined, ['booking'])
        .where('booking.id = :bookingId', { bookingId })
        .getOne();
      if (!booking) {
        throw new NotFoundException(
          `Không tìm thấy booking với id ${bookingId}`,
        );
      }
      if (!booking.checkedInAt) {
        throw new ConflictException('Booking chưa check-in');
      }

      const isIdempotentRetry =
        booking.checkinReviewStatus === targetReviewStatus &&
        booking.checkinReviewReason === dto.reason;
      if (
        booking.checkinReviewStatus !==
          BookingCheckinReviewStatus.PENDING_REVIEW &&
        !isIdempotentRetry
      ) {
        throw new ConflictException(
          `Check-in đã được xử lý ở trạng thái ${booking.checkinReviewStatus}`,
        );
      }
      if (dto.openIncident && (!booking.customer || !booking.tasker)) {
        throw new UnprocessableEntityException(
          'Booking phải có customer và tasker để mở hồ sơ bồi thường',
        );
      }

      if (dto.openIncident) {
        const activeIncident = await manager
          .getRepository(IncidentEntity)
          .createQueryBuilder('incident')
          .where('incident.booking_id = :bookingId', { bookingId })
          .andWhere('incident.status != :closed', {
            closed: IncidentStatus.CLOSED,
          })
          .getOne();
        if (
          activeIncident &&
          activeIncident.type !== IncidentType.CHECKIN_VIOLATION
        ) {
          throw new ConflictException({
            message: 'Đơn này đã có sự cố khác đang xử lý',
            incidentId: activeIncident.id,
          });
        }
      }

      if (isIdempotentRetry) {
        return {
          booking,
          auditId: null as string | null,
          customerUserId: booking.customer?.user?.id ?? null,
          taskerUserId: booking.tasker?.user?.id ?? null,
        };
      }

      booking.checkinReviewStatus = targetReviewStatus;
      booking.checkinReviewedByAdmin = { id: adminUserId } as UserEntity;
      booking.checkinReviewedAt = new Date();
      booking.checkinReviewReason = dto.reason;
      const saved = await manager.getRepository(BookingEntity).save(booking);
      const audit = await manager.getRepository(BookingStatusLogEntity).save(
        manager.getRepository(BookingStatusLogEntity).create({
          booking: saved,
          oldStatus: booking.status,
          newStatus: booking.status,
          changedByUser: { id: adminUserId } as UserEntity,
          note: `Admin review check-in: ${targetReviewStatus} — ${dto.reason}`,
          cancellationFee: 0,
          refundAmount: 0,
        }),
      );

      return {
        booking: saved,
        auditId: audit.id as string | null,
        customerUserId: booking.customer?.user?.id ?? null,
        taskerUserId: booking.tasker?.user?.id ?? null,
      };
    });

    let incidentId: string | null = null;
    if (dto.openIncident) {
      const incident =
        await this.incidentAdminService.createFromCheckinViolation(
          adminUserId,
          bookingId,
          {
            claimedAmount: dto.claimedAmount!,
            reviewReason: dto.reason,
          },
        );
      incidentId = incident.id;
    }

    if (reviewed.auditId) {
      const reviewLabel =
        targetReviewStatus === BookingCheckinReviewStatus.APPROVED
          ? 'được chấp nhận'
          : targetReviewStatus === BookingCheckinReviewStatus.REJECTED
            ? 'bị từ chối'
            : 'không đủ dữ liệu xác minh';
      await Promise.allSettled([
        ...(reviewed.taskerUserId
          ? [
              this.notificationService.notify({
                userId: reviewed.taskerUserId,
                type: NotificationType.SYSTEM,
                title: 'Thông báo hệ thống',
                content: `Hệ thống đã xác nhận booking ${reviewed.booking.bookingCode}.`,
                referenceType: NotificationRefType.BOOKING,
                referenceId: bookingId,
                dedupeKey: `checkin-review:${reviewed.auditId}:tasker`,
              }),
            ]
          : []),
        ...(reviewed.customerUserId
          ? [
              this.notificationService.notify({
                userId: reviewed.customerUserId,
                type: NotificationType.SYSTEM,
                title: 'CleanZ đã review check-in',
                content: `Check-in đơn ${reviewed.booking.bookingCode} ${reviewLabel}.`,
                referenceType: NotificationRefType.BOOKING,
                referenceId: bookingId,
                dedupeKey: `checkin-review:${reviewed.auditId}:customer`,
              }),
            ]
          : []),
      ]);
    }

    return {
      ...(await this.getBookingDetail(bookingId)),
      checkinReviewResult: {
        status: targetReviewStatus,
        incidentId,
      },
    };
  }

  async reviewNoShow(
    bookingId: string,
    adminUserId: string,
    dto: ReviewBookingNoShowDto,
  ) {
    if (
      dto.openIncident &&
      dto.decision !== AdminNoShowReviewDecision.CONFIRM_NO_SHOW
    ) {
      throw new BadRequestException(
        'Chỉ có thể mở Incident khi Admin xác nhận Tasker no-show',
      );
    }

    const targetStatus =
      dto.decision === AdminNoShowReviewDecision.CONFIRM_NO_SHOW
        ? BookingNoShowReviewStatus.CONFIRMED
        : BookingNoShowReviewStatus.EXCUSED;

    const reviewed = await this.dataSource.transaction(async (manager) => {
      const booking = await manager
        .getRepository(BookingEntity)
        .createQueryBuilder('booking')
        .leftJoinAndSelect('booking.customer', 'customer')
        .leftJoinAndSelect('customer.user', 'customerUser')
        .leftJoinAndSelect('booking.tasker', 'tasker')
        .leftJoinAndSelect('tasker.user', 'taskerUser')
        .setLock('pessimistic_write', undefined, ['booking'])
        .where('booking.id = :bookingId', { bookingId })
        .getOne();
      if (!booking) {
        throw new NotFoundException(
          `Không tìm thấy booking với id ${bookingId}`,
        );
      }
      if (
        booking.status !== BookingStatus.CANCELLED ||
        !booking.noShowDetectedAt
      ) {
        throw new ConflictException(
          'Booking không phải case tự hủy do no-show',
        );
      }

      const isIdempotentRetry =
        booking.noShowReviewStatus === targetStatus &&
        booking.noShowReviewReason === dto.reason;
      if (
        booking.noShowReviewStatus !==
          BookingNoShowReviewStatus.PENDING_REVIEW &&
        !isIdempotentRetry
      ) {
        throw new ConflictException(
          `No-show đã được xử lý ở trạng thái ${booking.noShowReviewStatus}`,
        );
      }
      if (dto.openIncident && (!booking.customer || !booking.tasker)) {
        throw new UnprocessableEntityException(
          'Booking phải có customer và tasker để mở hồ sơ bồi thường',
        );
      }
      if (dto.openIncident) {
        const activeIncident = await manager
          .getRepository(IncidentEntity)
          .createQueryBuilder('incident')
          .where('incident.booking_id = :bookingId', { bookingId })
          .andWhere('incident.status != :closed', {
            closed: IncidentStatus.CLOSED,
          })
          .getOne();
        if (activeIncident && activeIncident.type !== IncidentType.NO_SHOW) {
          throw new ConflictException({
            message: 'Đơn này đã có sự cố khác đang xử lý',
            incidentId: activeIncident.id,
          });
        }
      }
      if (isIdempotentRetry) {
        return {
          booking,
          auditId: null as string | null,
          customerUserId: booking.customer?.user?.id ?? null,
          taskerUserId: booking.tasker?.user?.id ?? null,
        };
      }

      booking.noShowReviewStatus = targetStatus;
      booking.noShowReviewedByAdmin = { id: adminUserId } as UserEntity;
      booking.noShowReviewedAt = new Date();
      booking.noShowReviewReason = dto.reason;
      if (targetStatus === BookingNoShowReviewStatus.CONFIRMED) {
        booking.noShowWarningPoints = NO_SHOW_WARNING_POINTS;
        if (booking.tasker) {
          await manager
            .getRepository(TaskerEntity)
            .increment(
              { id: booking.tasker.id },
              'warningPoints',
              NO_SHOW_WARNING_POINTS,
            );
        }
      } else {
        booking.noShowWarningPoints = 0;
      }

      const saved = await manager.getRepository(BookingEntity).save(booking);
      const audit = await manager.getRepository(BookingStatusLogEntity).save(
        manager.getRepository(BookingStatusLogEntity).create({
          booking: saved,
          oldStatus: BookingStatus.CANCELLED,
          newStatus: BookingStatus.CANCELLED,
          changedByUser: { id: adminUserId } as UserEntity,
          note:
            `Admin review no-show: ${targetStatus} — ${dto.reason}` +
            (targetStatus === BookingNoShowReviewStatus.CONFIRMED
              ? ` (+${NO_SHOW_WARNING_POINTS} điểm cảnh báo)`
              : ' (không phạt Tasker)'),
          cancellationFee: 0,
          refundAmount: 0,
        }),
      );
      return {
        booking: saved,
        auditId: audit.id as string | null,
        customerUserId: booking.customer?.user?.id ?? null,
        taskerUserId: booking.tasker?.user?.id ?? null,
      };
    });

    let incidentId: string | null = null;
    if (dto.openIncident) {
      const incident =
        await this.incidentAdminService.createFromNoShowViolation(
          adminUserId,
          bookingId,
          {
            claimedAmount: dto.claimedAmount!,
            reviewReason: dto.reason,
          },
        );
      incidentId = incident.id;
    }

    if (reviewed.auditId) {
      const confirmed = targetStatus === BookingNoShowReviewStatus.CONFIRMED;
      await Promise.allSettled([
        ...(reviewed.taskerUserId
          ? [
              this.notificationService.notify({
                userId: reviewed.taskerUserId,
                type: NotificationType.SYSTEM,
                title: confirmed
                  ? 'Admin xác nhận vi phạm no-show'
                  : 'Bạn được miễn trách nhiệm no-show',
                content: confirmed
                  ? `Booking ${reviewed.booking.bookingCode}: bạn bị cộng ${NO_SHOW_WARNING_POINTS} điểm cảnh báo. Lý do: ${dto.reason}`
                  : `Booking ${reviewed.booking.bookingCode}: Admin đã chấp nhận giải trình, không cộng điểm. Lý do: ${dto.reason}`,
                referenceType: NotificationRefType.BOOKING,
                referenceId: bookingId,
                dedupeKey: `no-show-review:${reviewed.auditId}:tasker`,
              }),
            ]
          : []),
        ...(reviewed.customerUserId
          ? [
              this.notificationService.notify({
                userId: reviewed.customerUserId,
                type: NotificationType.SYSTEM,
                title: 'CleanZ đã kết luận case no-show',
                content: confirmed
                  ? `Tasker của booking ${reviewed.booking.bookingCode} đã được xác nhận vi phạm.`
                  : `Booking ${reviewed.booking.bookingCode}: Admin xác định Tasker có lý do được miễn trách nhiệm. Khoản hoàn của bạn không thay đổi.`,
                referenceType: NotificationRefType.BOOKING,
                referenceId: bookingId,
                dedupeKey: `no-show-review:${reviewed.auditId}:customer`,
              }),
            ]
          : []),
      ]);
    }

    return {
      ...(await this.getBookingDetail(bookingId)),
      noShowReviewResult: {
        status: targetStatus,
        incidentId,
      },
    };
  }

  async changeBookingStatus(
    bookingId: string,
    adminUserId: string,
    dto: ChangeBookingStatusDto,
  ) {
    const result = await this.dataSource.transaction(async (manager) => {
      const booking = await manager
        .getRepository(BookingEntity)
        .createQueryBuilder('booking')
        .leftJoinAndSelect('booking.customer', 'customer')
        .leftJoinAndSelect('customer.user', 'customerUser')
        .leftJoinAndSelect('booking.tasker', 'tasker')
        .leftJoinAndSelect('tasker.user', 'taskerUser')
        .setLock('pessimistic_write', undefined, ['booking'])
        .where('booking.id = :bookingId', { bookingId })
        .getOne();

      if (!booking) {
        throw new NotFoundException(
          `Không tìm thấy booking với id ${bookingId}`,
        );
      }
      if (booking.status === dto.status) {
        throw new ConflictException(`Booking đã ở trạng thái ${dto.status}`);
      }

      const oldStatus = booking.status;
      const originalTaskerUserId = booking.tasker?.user?.id;
      let latestPayment: PaymentEntity | null = null;
      let refundAmount = 0;

      if (dto.status === BookingStatus.CANCELLED) {
        if (!CANCELLABLE_BY_ADMIN_STATUSES.includes(oldStatus)) {
          throw new ConflictException(
            `Không thể hủy booking từ trạng thái ${oldStatus}`,
          );
        }

        booking.status = BookingStatus.CANCELLED;
        booking.cancelledAt = new Date();
        booking.cancelledBy = CancelledBy.ADMIN;
        booking.cancelledByUserId = adminUserId;
        await this.vouchersService.releaseReservationForBooking(
          manager,
          booking.id,
        );
        await this.bookingWalletPaymentService.refundEscrow(
          manager,
          booking,
          'admin hủy đơn',
        );
        latestPayment = await this.paymentService.findLatestByBookingId(
          manager,
          booking.id,
        );
        refundAmount =
          latestPayment?.status === PaymentStatus.PAID
            ? Number(latestPayment.amount)
            : 0;
        if (booking.customer) {
          await manager.increment(
            CustomerEntity,
            { id: booking.customer.id },
            'totalCancelled',
            1,
          );
        }
      } else if (dto.status === BookingStatus.POSTED) {
        if (
          oldStatus !== BookingStatus.CANCELLED &&
          oldStatus !== BookingStatus.EXPIRED
        ) {
          throw new ConflictException(
            'Chỉ booking CANCELLED hoặc EXPIRED mới có thể khôi phục',
          );
        }
        if (
          booking.paymentStatus === PaymentStatus.REFUNDED ||
          booking.paymentStatus === PaymentStatus.PARTIALLY_REFUNDED
        ) {
          throw new ConflictException(
            'Booking đã hoàn tiền nên không thể khôi phục trực tiếp',
          );
        }
        if (
          !booking.scheduledStartDate ||
          !booking.scheduledStartTime ||
          createVietnamDateTime(
            String(booking.scheduledStartDate).slice(0, 10),
            String(booking.scheduledStartTime).slice(0, 5),
          ) <= new Date()
        ) {
          throw new BadRequestException(
            'Không thể khôi phục booking có lịch làm việc đã qua',
          );
        }

        booking.status = BookingStatus.POSTED;
        booking.tasker = null;
        booking.cancelledAt = null;
        booking.cancelledBy = null;
        booking.cancelledByUserId = null;
        booking.checkedInAt = null;
        booking.completedAt = null;
        if (oldStatus === BookingStatus.CANCELLED && booking.customer) {
          await manager.query(
            `UPDATE customers
             SET total_cancelled = GREATEST(total_cancelled - 1, 0)
             WHERE id = $1`,
            [booking.customer.id],
          );
        }
      } else {
        const allowedNextStatus = ADMIN_FORWARD_STATUS[oldStatus];
        if (allowedNextStatus !== dto.status) {
          throw new ConflictException(
            `Chuyển trạng thái không hợp lệ: ${oldStatus} → ${dto.status}`,
          );
        }
        if (!booking.tasker) {
          throw new ConflictException(
            'Booking chưa có Tasker; hãy gán Tasker trước khi chuyển trạng thái',
          );
        }

        if (dto.status === BookingStatus.COMPLETED) {
          if (isSurchargePending(booking.surchargeStatus)) {
            throw new ConflictException(
              'Đơn đang chờ xác nhận phần phát sinh. Hãy xử lý hoặc chờ hết hạn phụ phí trước khi hoàn thành.',
            );
          }
          if (
            booking.paymentMethod !== PaymentMethod.CASH &&
            booking.paymentStatus !== PaymentStatus.PAID
          ) {
            throw new ConflictException(
              'Booking chưa thanh toán nên không thể hoàn thành',
            );
          }

          await this.bookingSettlementService.settleCompletedBooking(manager, {
            booking,
            tasker: booking.tasker,
            actorUserId: adminUserId,
            note: dto.reason,
            surchargeStatus: booking.surchargeStatus,
            writeStatusLog: false,
          });
        } else {
          booking.status = dto.status;
        }
      }

      const savedBooking = await manager
        .getRepository(BookingEntity)
        .save(booking);
      const statusLog = manager.getRepository(BookingStatusLogEntity).create({
        booking: savedBooking,
        oldStatus,
        newStatus: dto.status,
        changedByUser: { id: adminUserId } as UserEntity,
        note: dto.reason,
        cancelledBy:
          dto.status === BookingStatus.CANCELLED ? CancelledBy.ADMIN : null,
        cancelledByUser:
          dto.status === BookingStatus.CANCELLED
            ? ({ id: adminUserId } as UserEntity)
            : null,
        cancelReason:
          dto.status === BookingStatus.CANCELLED ? dto.reason : null,
        cancellationFee: 0,
        refundAmount,
        payment: latestPayment,
      });
      const savedLog = await manager
        .getRepository(BookingStatusLogEntity)
        .save(statusLog);

      return {
        booking: savedBooking,
        customerUserId: booking.customer?.user?.id ?? null,
        taskerUserId: booking.tasker?.user?.id ?? originalTaskerUserId,
        audit: {
          id: savedLog.id,
          changedBy: adminUserId,
          reason: dto.reason,
          changedAt: savedLog.createdAt,
          oldStatus,
          newStatus: dto.status,
        },
      };
    });

    await this.notifyAdminStatusChange(result, dto.status, result.audit.id);
    if (
      dto.status === BookingStatus.CANCELLED ||
      dto.status === BookingStatus.COMPLETED
    ) {
      void this.bookingLifecycleScheduler.deactivateBooking(result.booking.id);
    } else if (dto.status === BookingStatus.POSTED) {
      void this.bookingLifecycleScheduler
        .activatePostedDispatch(result.booking.id)
        .catch((error) =>
          this.logger.error(
            `Không thể khôi phục dispatch booking=${result.booking.id}: ${String(error)}`,
          ),
        );
    }

    return {
      id: result.booking.id,
      bookingCode: result.booking.bookingCode,
      status: result.booking.status,
      paymentStatus: result.booking.paymentStatus,
      taskerId: result.booking.tasker?.id ?? null,
      checkedInAt: result.booking.checkedInAt ?? null,
      completedAt: result.booking.completedAt ?? null,
      cancelledAt: result.booking.cancelledAt ?? null,
      audit: result.audit,
    };
  }

  private async notifyAdminStatusChange(
    result: {
      booking: BookingEntity;
      // null cho đơn offline/vãng lai (không có tài khoản khách để thông báo).
      customerUserId: string | null;
      taskerUserId?: string;
    },
    status: BookingStatus,
    auditId: string,
  ): Promise<void> {
    const isCancelled = status === BookingStatus.CANCELLED;
    const isCompleted = status === BookingStatus.COMPLETED;
    const type = isCancelled
      ? NotificationType.BOOKING_CANCELLED
      : isCompleted
        ? NotificationType.BOOKING_COMPLETED
        : NotificationType.SYSTEM;
    const title = isCancelled
      ? 'Booking đã bị Admin hủy'
      : isCompleted
        ? 'Booking đã được hoàn thành'
        : 'Trạng thái booking đã được cập nhật';
    const content = `Đơn ${result.booking.bookingCode} đã chuyển sang ${status}.`;
    const receivers = [
      ...(result.customerUserId ? [result.customerUserId] : []),
      ...(result.taskerUserId ? [result.taskerUserId] : []),
    ];

    await Promise.allSettled(
      receivers.map((userId) =>
        this.notificationService.notify({
          userId,
          type,
          title,
          content,
          referenceType: NotificationRefType.BOOKING,
          referenceId: result.booking.id,
          dedupeKey: `admin-status:${auditId}:${userId}`,
        }),
      ),
    );
  }

  private async activateConfirmedLifecycle(bookingId: string): Promise<void> {
    try {
      await this.bookingLifecycleScheduler.activateConfirmedBooking(bookingId);
    } catch (error) {
      this.logger.error(
        `Không thể kích hoạt lifecycle booking=${bookingId}: ${String(error)}`,
      );
    }
  }

  private async findAssignableBooking(
    bookingId: string,
  ): Promise<BookingEntity> {
    const booking = await this.dataSource.getRepository(BookingEntity).findOne({
      where: { id: bookingId },
      relations: ['tasker'],
    });
    if (!booking) {
      throw new NotFoundException(`Không tìm thấy booking với id ${bookingId}`);
    }
    this.assertBookingCanBeAssigned(booking);
    return booking;
  }

  private async generateUniqueBookingCode(
    manager: EntityManager,
  ): Promise<string> {
    const bookingRepository = manager.getRepository(BookingEntity);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const bookingCode = generateOrderCode();
      const exists = await bookingRepository.exists({
        where: { bookingCode },
      });
      if (!exists) {
        return bookingCode;
      }
    }
    throw new BadRequestException('Không thể tạo mã booking, vui lòng thử lại');
  }

  private assertBookingCanBeAssigned(booking: BookingEntity): void {
    if (!ADMIN_ASSIGNABLE_BOOKING_STATUSES.includes(booking.status)) {
      throw new ConflictException(
        'Chỉ có thể gán Tasker cho booking POSTED hoặc CONFIRMED',
      );
    }
    if (
      !booking.scheduledStartDate ||
      !booking.scheduledStartTime ||
      !booking.scheduledEndDate ||
      !booking.scheduledEndTime
    ) {
      throw new BadRequestException(
        'Booking chưa có đầy đủ thời gian làm việc để tìm Tasker khả dụng',
      );
    }
  }

  private assertTaskerCanBeAssigned(tasker: TaskerEntity): void {
    if (
      tasker.status !== TaskerStatus.ACTIVE ||
      tasker.docStatus !== DocumentStatus.APPROVED ||
      !tasker.user?.isActive ||
      tasker.user.deletedAt
    ) {
      throw new BadRequestException(
        'Tasker chưa hoạt động, chưa duyệt hồ sơ hoặc tài khoản đã bị khóa',
      );
    }
  }

  private hasTaskerScheduleConflict(
    manager: EntityManager,
    taskerId: string,
    booking: BookingEntity,
  ): Promise<boolean> {
    return manager
      .getRepository(BookingEntity)
      .createQueryBuilder('busy_booking')
      .innerJoin('busy_booking.tasker', 'tasker')
      .where('tasker.id = :taskerId', { taskerId })
      .andWhere('busy_booking.id != :bookingId', { bookingId: booking.id })
      .andWhere('busy_booking.status IN (:...busyStatuses)', {
        busyStatuses: BUSY_TASKER_BOOKING_STATUSES,
      })
      .andWhere(
        `(
          "busy_booking"."scheduled_start_date"
          + "busy_booking"."scheduled_start_time"
        ) < (
          CAST(:targetEndDate AS date) + CAST(:targetEndTime AS time)
        )`,
        {
          targetEndDate: booking.scheduledEndDate,
          targetEndTime: booking.scheduledEndTime,
        },
      )
      .andWhere(
        `(
          "busy_booking"."scheduled_end_date"
          + "busy_booking"."scheduled_end_time"
        ) > (
          CAST(:targetStartDate AS date) + CAST(:targetStartTime AS time)
        )`,
        {
          targetStartDate: booking.scheduledStartDate,
          targetStartTime: booking.scheduledStartTime,
        },
      )
      .getExists();
  }

  private async getRequiredPlatformFee(
    manager: EntityManager,
    booking: BookingEntity,
  ): Promise<number> {
    const commissionRate =
      await this.pricingService.getPlatformCommissionRate(manager);
    const subtotal =
      Number(booking.totalPrice) + Number(booking.discountAmount);
    return Math.round((subtotal * commissionRate) / 100);
  }

  private async getSettlementLedger(
    bookingId: string,
  ): Promise<BookingSettlementLedgerSnapshot> {
    const rows = await this.dataSource
      .getRepository(WalletTransactionEntity)
      .createQueryBuilder('transaction')
      .innerJoin('transaction.wallet', 'wallet')
      .select('transaction.type', 'type')
      .addSelect('transaction.reference_type', 'referenceType')
      .addSelect('transaction.amount', 'amount')
      .where('transaction.booking_id = :bookingId', { bookingId })
      .andWhere('wallet.owner_type = :ownerType', {
        ownerType: WalletOwnerType.TASKER,
      })
      .andWhere(
        `(
          transaction.type = :platformFeeType
          OR (
            transaction.type = :taskerEarningType
            AND transaction.reference_type = :walletSettlementRef
          )
        )`,
        {
          platformFeeType: WalletTransactionType.PLATFORM_FEE,
          taskerEarningType: WalletTransactionType.TASKER_EARNING,
          walletSettlementRef: BOOKING_WALLET_SETTLE_REF,
        },
      )
      .getRawMany<{
        type: WalletTransactionType;
        referenceType: string | null;
        amount: string;
      }>();

    const explicitTaskerPlatformFee = rows
      .filter((row) => row.type === WalletTransactionType.PLATFORM_FEE)
      .reduce((sum, row) => sum + Number(row.amount), 0);
    const walletSettlementRows = rows.filter(
      (row) => row.type === WalletTransactionType.TASKER_EARNING,
    );
    const walletSettlementEarning =
      walletSettlementRows.length > 0
        ? walletSettlementRows.reduce((sum, row) => sum + Number(row.amount), 0)
        : null;

    return {
      explicitTaskerPlatformFee,
      walletSettlementEarning,
      hasSettlementEntries: rows.length > 0,
    };
  }

  async expireOverdueBookings() {
    const result = await this.dataSource.transaction(async (manager) => {
      const bookings = await manager
        .getRepository(BookingEntity)
        .createQueryBuilder('booking')
        .setLock('pessimistic_write', undefined, ['booking'])
        .setOnLocked('skip_locked')
        .where('booking.status = :status', { status: BookingStatus.POSTED })
        .andWhere('booking.tasker_id IS NULL')
        .andWhere('booking.scheduled_start_date IS NOT NULL')
        .andWhere('booking.scheduled_start_time IS NOT NULL')
        .andWhere(
          "(booking.scheduled_start_date + booking.scheduled_start_time) <= timezone('Asia/Ho_Chi_Minh', now())",
        )
        .getMany();

      if (!bookings.length) {
        return { expiredCount: 0, bookingIds: [] };
      }

      for (const booking of bookings) {
        const oldStatus = booking.status;
        booking.status = BookingStatus.EXPIRED;
        await manager.getRepository(BookingEntity).save(booking);
        await this.bookingWalletPaymentService.refundEscrow(
          manager,
          booking,
          'đơn hết hạn',
        );

        const statusLog = manager.getRepository(BookingStatusLogEntity).create({
          booking,
          oldStatus,
          newStatus: BookingStatus.EXPIRED,
          changedByUser: null,
          note: 'Booking quá hạn',
          cancellationFee: 0,
          refundAmount: 0,
        });
        await manager.getRepository(BookingStatusLogEntity).save(statusLog);
      }

      return {
        expiredCount: bookings.length,
        bookingIds: bookings.map((booking) => booking.id),
      };
    });

    await Promise.all(
      result.bookingIds.map((bookingId) =>
        this.bookingLifecycleScheduler.deactivateBooking(bookingId),
      ),
    );
    return result;
  }
}
