import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import {
  assertBookingAbsenceReportTransition,
  BookingAbsenceReportStatus,
} from 'src/common/enums/booking-absence-report-status.enum';
import { BookingStatus } from 'src/common/enums/booking-status.enum';
import { CancelledBy } from 'src/common/enums/cancelled-by.enum';
import { NotificationRefType } from 'src/common/enums/notification-ref-type.enum';
import { NotificationType } from 'src/common/enums/notification-type.enum';
import { UserRole } from 'src/common/enums/user-role.enum';
import { toNumber } from 'src/common/helpers/number.helper';
import { CustomerEntity } from 'src/modules/customer/entity/customer.entity';
import { NotificationService } from 'src/modules/notification/notification.service';
import { PaymentService } from 'src/modules/payment/payment.service';
import {
  CustomerAbsencePolicy,
  calculateAbsenceCompensation,
} from 'src/modules/system-config/operational-policy';
import { SystemConfigService } from 'src/modules/system-config/system-config.service';
import { TrackingGateway } from 'src/modules/tracking/tracking.gateway';
import { UserEntity } from 'src/modules/users/entities/user.entity';
import { TaskerBalanceService } from 'src/modules/wallet/tasker-balance.service';
import { VouchersService } from 'src/modules/voucher/services/vouchers.service';
import {
  getTrustedAbsenceProofAssetKey,
  ReportBookingAbsenceDto,
} from '../dto/report-booking-absence.dto';
import { BookingAbsenceReportEntity } from '../entity/booking-absence-report.entity';
import { BookingStatusLogEntity } from '../entity/booking-status-log.entity';
import { BookingEntity } from '../entity/booking.entity';
import { BookingLifecycleSchedulerService } from './booking-lifecycle-scheduler.service';
import { BookingAbsenceSettlementService } from './booking-absence-settlement.service';

export interface BookingAbsenceEligibility {
  canReport: boolean;
  reason?: string;
  reasonCode?: string;
  waitedMinutes: number;
  minWaitMinutes: number;
  availableAt: string | null;
  expiresAt: string | null;
  estimatedCompensation: number;
  reviewSlaHours: number;
  existingReport?: Record<string, unknown>;
}

export function toBookingAbsenceReportResponse(
  report: BookingAbsenceReportEntity,
): Record<string, unknown> {
  return {
    id: report.id,
    bookingId: report.booking?.id,
    status: report.status,
    isGuest: report.isGuest,
    proofPhotoUrl: report.proofPhotoUrl,
    callHistoryPhotoUrl: report.callHistoryPhotoUrl ?? null,
    taskerNote: report.taskerNote ?? null,
    reportedAt: report.reportedAt,
    reviewDueAt: report.reviewDueAt,
    waitedMinutes: report.waitedMinutes,
    compensationAmount: toNumber(report.compensationAmount),
    subtotalSnapshot: toNumber(report.subtotalSnapshot),
    checkinDistanceMeters:
      report.checkinDistanceMeters == null
        ? null
        : toNumber(report.checkinDistanceMeters),
    checkinFar: report.checkinFar,
    reviewedAt: report.reviewedAt ?? null,
    reviewReason: report.reviewReason ?? null,
    refundedUpfront: toNumber(report.refundedUpfront),
    debtRecoveredUpfront: toNumber(report.debtRecoveredUpfront),
    heldForReview: toNumber(report.heldForReview),
    paidFromEscrow: toNumber(report.paidFromEscrow),
    paidFromCustomerWallet: toNumber(report.paidFromCustomerWallet),
    advancedByPlatform: toNumber(report.advancedByPlatform),
    platformBorneAmount: toNumber(report.platformBorneAmount),
    refundedOnClose: toNumber(report.refundedOnClose),
    debtRecoveredOnClose: toNumber(report.debtRecoveredOnClose),
    policySnapshot: report.policySnapshot,
  };
}

/** Payload tối thiểu cho khách sở hữu booking; không lộ ảnh/GPS/ghi chú nội bộ của Tasker. */
export function toCustomerBookingAbsenceReportResponse(
  report: BookingAbsenceReportEntity,
): Record<string, unknown> {
  return {
    id: report.id,
    status: report.status,
    reportedAt: report.reportedAt,
    reviewDueAt: report.reviewDueAt,
    compensationAmount: toNumber(report.compensationAmount),
    reviewedAt: report.reviewedAt ?? null,
    reviewReason: report.reviewReason ?? null,
    refundedUpfront: toNumber(report.refundedUpfront),
    debtRecoveredUpfront: toNumber(report.debtRecoveredUpfront),
    heldForReview: toNumber(report.heldForReview),
    advancedByPlatform: toNumber(report.advancedByPlatform),
    refundedOnClose: toNumber(report.refundedOnClose),
    debtRecoveredOnClose: toNumber(report.debtRecoveredOnClose),
  };
}

@Injectable()
export class BookingAbsenceService {
  private readonly logger = new Logger(BookingAbsenceService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly systemConfigService: SystemConfigService,
    private readonly settlementService: BookingAbsenceSettlementService,
    private readonly voucherService: VouchersService,
    private readonly taskerBalanceService: TaskerBalanceService,
    private readonly paymentService: PaymentService,
    private readonly lifecycleScheduler: BookingLifecycleSchedulerService,
    private readonly notificationService: NotificationService,
    private readonly trackingGateway: TrackingGateway,
  ) {}

  async getEligibility(
    taskerUserId: string,
    bookingId: string,
  ): Promise<BookingAbsenceEligibility> {
    const booking = await this.findBookingForTasker(
      this.dataSource.manager,
      taskerUserId,
      bookingId,
      false,
    );
    const policy = await this.systemConfigService.getCustomerAbsencePolicy(
      this.dataSource.manager,
    );
    const existingReport = await this.dataSource.manager
      .getRepository(BookingAbsenceReportEntity)
      .findOne({
        where: { booking: { id: bookingId } },
        order: { reportedAt: 'DESC' },
      });
    return this.buildEligibility(booking, policy, new Date(), existingReport);
  }

  async report(
    taskerUserId: string,
    bookingId: string,
    dto: ReportBookingAbsenceDto,
  ): Promise<Record<string, unknown>> {
    const addressProofAssetKey = getTrustedAbsenceProofAssetKey(
      dto.proofPhotoUrl,
    );
    if (!addressProofAssetKey) {
      throw new BadRequestException({
        code: 'ABSENCE_PROOF_URL_NOT_TRUSTED',
        message:
          'Ảnh địa chỉ khách hàng phải được tải lên qua CleanZ trước khi gửi',
      });
    }
    const callHistoryAssetKey = getTrustedAbsenceProofAssetKey(
      dto.callHistoryPhotoUrl,
    );
    if (!callHistoryAssetKey) {
      throw new BadRequestException({
        code: 'ABSENCE_CALL_HISTORY_URL_NOT_TRUSTED',
        message:
          'Ảnh lịch sử cuộc gọi phải được tải lên qua CleanZ trước khi gửi',
      });
    }
    if (addressProofAssetKey === callHistoryAssetKey) {
      throw new BadRequestException({
        code: 'ABSENCE_EVIDENCE_PHOTOS_MUST_DIFFER',
        message: 'Hai bằng chứng phải là hai ảnh khác nhau',
      });
    }
    const outcome = await this.dataSource.transaction(async (manager) => {
      const booking = await this.findBookingForTasker(
        manager,
        taskerUserId,
        bookingId,
        true,
      );
      const policy =
        await this.systemConfigService.getCustomerAbsencePolicy(manager);
      const reportRepo = manager.getRepository(BookingAbsenceReportEntity);
      const existing = await reportRepo.findOne({
        where: {
          booking: { id: bookingId },
          status: BookingAbsenceReportStatus.PENDING_REVIEW,
        },
      });
      const now = new Date();
      const eligibility = this.buildEligibility(booking, policy, now, existing);
      if (!eligibility.canReport) {
        throw new BadRequestException({
          code: eligibility.reasonCode ?? 'ABSENCE_REPORT_NOT_ALLOWED',
          message: eligibility.reason ?? 'Chưa thể báo khách hàng vắng mặt',
        });
      }

      const isGuest = !booking.customer;
      const compensation = calculateAbsenceCompensation({
        policy,
        totalPrice: toNumber(booking.totalPrice),
        discountAmount: toNumber(booking.discountAmount),
        isGuest,
      });
      const waitedMinutes = Math.max(
        0,
        Math.floor((now.getTime() - booking.checkedInAt!.getTime()) / 60_000),
      );
      const report = await reportRepo.save(
        reportRepo.create({
          booking,
          tasker: booking.tasker!,
          customer: booking.customer ?? null,
          isGuest,
          status: BookingAbsenceReportStatus.PENDING_REVIEW,
          reviewDueAt: new Date(
            now.getTime() + policy.reviewSlaHours * 3_600_000,
          ),
          proofPhotoUrl: dto.proofPhotoUrl,
          callHistoryPhotoUrl: dto.callHistoryPhotoUrl,
          taskerNote: dto.note?.trim() || null,
          reportedAt: now,
          waitedMinutes,
          compensationAmount: compensation.amount,
          subtotalSnapshot: compensation.subtotal,
          policySnapshot: { ...policy },
          checkinDistanceMeters:
            booking.checkinDistanceMeters == null
              ? null
              : toNumber(booking.checkinDistanceMeters),
          checkinFar: Boolean(booking.checkinFar),
        }),
      );

      const oldStatus = booking.status;
      booking.status = BookingStatus.CANCELLED;
      booking.cancelledAt = now;
      booking.cancelledBy = CancelledBy.CUSTOMER_ABSENT;
      booking.cancelledByUserId = taskerUserId;
      await manager.getRepository(BookingEntity).save(booking);

      await this.voucherService.releaseReservationForBooking(
        manager,
        booking.id,
      );
      await this.taskerBalanceService.releaseCashCommissionHold(
        manager,
        booking,
      );
      const upfront = await this.settlementService.prepareReport(
        manager,
        booking,
        report,
      );
      Object.assign(report, upfront);
      await reportRepo.save(report);

      const payment = await this.paymentService.findLatestByBookingId(
        manager,
        booking.id,
      );
      await manager.getRepository(BookingStatusLogEntity).save(
        manager.getRepository(BookingStatusLogEntity).create({
          booking,
          oldStatus,
          newStatus: BookingStatus.CANCELLED,
          changedByUser: { id: taskerUserId } as UserEntity,
          note: 'Tasker báo khách hàng vắng mặt; chuyển sang hàng chờ Admin duyệt',
          cancelledBy: CancelledBy.CUSTOMER_ABSENT,
          cancelledByUser: { id: taskerUserId } as UserEntity,
          cancelReason:
            dto.note?.trim() || 'Khách hàng vắng mặt sau khi Tasker check-in',
          cancellationFee: 0,
          refundAmount: upfront.refundedUpfront,
          policySnapshot: { customerAbsence: { ...policy } },
          payment: payment ?? null,
        }),
      );

      return {
        report,
        previousStatus: oldStatus,
        taskerUserId: booking.tasker!.user.id,
        customerUserId: booking.customer?.user?.id ?? null,
        bookingCode: booking.bookingCode,
        paymentStatus: booking.paymentStatus,
      };
    });

    await this.afterReportCommitted(outcome);
    return this.mapReport(outcome.report);
  }

  async review(
    reportId: string,
    adminUserId: string,
    target:
      | BookingAbsenceReportStatus.APPROVED
      | BookingAbsenceReportStatus.REJECTED,
    reason: string,
  ): Promise<{ report: Record<string, unknown>; changed: boolean }> {
    const normalizedReason = reason.trim();
    const outcome = await this.dataSource.transaction(async (manager) => {
      const report = await this.findReportForUpdate(manager, reportId);
      if (report.status === target) {
        if ((report.reviewReason ?? '') === normalizedReason) {
          return { report, changed: false };
        }
        throw new ConflictException({
          code: 'ABSENCE_REPORT_ALREADY_REVIEWED',
          message: 'Báo cáo đã được chốt với lý do khác',
        });
      }
      if (report.status !== BookingAbsenceReportStatus.PENDING_REVIEW) {
        throw new ConflictException({
          code: 'ABSENCE_REPORT_ALREADY_CLOSED',
          message: 'Báo cáo đã được hệ thống chốt trước đó',
        });
      }
      assertBookingAbsenceReportTransition(report.status, target);

      if (report.customer) {
        await manager
          .getRepository(CustomerEntity)
          .createQueryBuilder('customer')
          .setLock('pessimistic_write', undefined, ['customer'])
          .where('customer.id = :customerId', {
            customerId: report.customer.id,
          })
          .getOneOrFail();
      }

      if (target === BookingAbsenceReportStatus.APPROVED) {
        await this.settlementService.approve(manager, report);
        if (report.customer) {
          await manager
            .getRepository(CustomerEntity)
            .increment({ id: report.customer.id }, 'totalCancelled', 1);
        }
      } else {
        await this.settlementService.reject(manager, report);
      }

      report.status = target;
      report.reviewedByAdmin = { id: adminUserId } as UserEntity;
      report.reviewedAt = new Date();
      report.reviewReason = normalizedReason;
      await manager.getRepository(BookingAbsenceReportEntity).save(report);
      return { report, changed: true };
    });

    if (outcome.changed) await this.notifyResolution(outcome.report);
    return { report: this.mapReport(outcome.report), changed: outcome.changed };
  }

  async expire(reportId: string): Promise<boolean> {
    const outcome = await this.dataSource.transaction(async (manager) => {
      const report = await this.findReportForUpdate(manager, reportId);
      if (report.status !== BookingAbsenceReportStatus.PENDING_REVIEW) {
        return { report, changed: false };
      }
      assertBookingAbsenceReportTransition(
        report.status,
        BookingAbsenceReportStatus.EXPIRED,
      );
      await this.settlementService.expire(manager, report);
      report.status = BookingAbsenceReportStatus.EXPIRED;
      report.reviewedAt = new Date();
      report.reviewReason = 'Hệ thống tự chốt do quá SLA duyệt';
      await manager.getRepository(BookingAbsenceReportEntity).save(report);
      return { report, changed: true };
    });
    if (outcome.changed) await this.notifyResolution(outcome.report);
    return outcome.changed;
  }

  mapReport(report: BookingAbsenceReportEntity): Record<string, unknown> {
    return toBookingAbsenceReportResponse(report);
  }

  private buildEligibility(
    booking: BookingEntity,
    policy: CustomerAbsencePolicy,
    now: Date,
    existingReport: BookingAbsenceReportEntity | null,
  ): BookingAbsenceEligibility {
    const checkedInAt = booking.checkedInAt ?? null;
    const availableAt = checkedInAt
      ? new Date(checkedInAt.getTime() + policy.minWaitMinutes * 60_000)
      : null;
    const expiresAt = checkedInAt
      ? new Date(checkedInAt.getTime() + policy.reportWindowMinutes * 60_000)
      : null;
    const waitedMinutes = checkedInAt
      ? Math.max(
          0,
          Math.floor((now.getTime() - checkedInAt.getTime()) / 60_000),
        )
      : 0;
    const estimatedCompensation = calculateAbsenceCompensation({
      policy,
      totalPrice: toNumber(booking.totalPrice),
      discountAmount: toNumber(booking.discountAmount),
      isGuest: !booking.customer,
    }).amount;
    const base = {
      waitedMinutes,
      minWaitMinutes: policy.minWaitMinutes,
      availableAt: availableAt?.toISOString() ?? null,
      expiresAt: expiresAt?.toISOString() ?? null,
      estimatedCompensation,
      reviewSlaHours: policy.reviewSlaHours,
      ...(existingReport
        ? { existingReport: this.mapReport(existingReport) }
        : {}),
    };

    if (existingReport) {
      return {
        ...base,
        canReport: false,
        reasonCode: 'ABSENCE_REPORT_ALREADY_EXISTS',
        reason: 'Booking đã có báo cáo khách vắng mặt',
      };
    }
    if (booking.status !== BookingStatus.CHECKED_IN || !checkedInAt) {
      return {
        ...base,
        canReport: false,
        reasonCode: 'ABSENCE_REPORT_REQUIRES_CHECKIN',
        reason: 'Chỉ có thể báo sau khi đã check-in tại địa chỉ khách',
      };
    }
    if (availableAt && now < availableAt) {
      return {
        ...base,
        canReport: false,
        reasonCode: 'ABSENCE_REPORT_WAIT_REQUIRED',
        reason: `Cần chờ đủ ${policy.minWaitMinutes} phút sau khi check-in`,
      };
    }
    if (expiresAt && now > expiresAt) {
      return {
        ...base,
        canReport: false,
        reasonCode: 'ABSENCE_REPORT_WINDOW_EXPIRED',
        reason: 'Đã quá thời hạn báo khách hàng vắng mặt',
      };
    }
    if (
      !booking.customer &&
      this.settlementService.getEscrowAvailable(booking) > 0
    ) {
      return {
        ...base,
        canReport: false,
        reasonCode: 'GUEST_PREPAID_ABSENCE_UNSUPPORTED',
        reason: 'Đơn khách vãng lai trả trước cần liên hệ bộ phận hỗ trợ',
      };
    }
    return { ...base, canReport: true };
  }

  private async findBookingForTasker(
    manager: EntityManager,
    taskerUserId: string,
    bookingId: string,
    lock: boolean,
  ): Promise<BookingEntity> {
    const qb = manager
      .getRepository(BookingEntity)
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.tasker', 'tasker')
      .leftJoinAndSelect('tasker.user', 'taskerUser')
      .leftJoinAndSelect('booking.customer', 'customer')
      .leftJoinAndSelect('customer.user', 'customerUser')
      .where('booking.id = :bookingId', { bookingId })
      .andWhere('taskerUser.id = :taskerUserId', { taskerUserId });
    if (lock) qb.setLock('pessimistic_write', undefined, ['booking']);
    const booking = await qb.getOne();
    if (!booking) {
      throw new NotFoundException(
        'Booking không tồn tại hoặc không thuộc Tasker hiện tại',
      );
    }
    return booking;
  }

  private async findReportForUpdate(
    manager: EntityManager,
    reportId: string,
  ): Promise<BookingAbsenceReportEntity> {
    const report = await manager
      .getRepository(BookingAbsenceReportEntity)
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.booking', 'booking')
      .leftJoinAndSelect('booking.tasker', 'bookingTasker')
      .leftJoinAndSelect('bookingTasker.user', 'taskerUser')
      .leftJoinAndSelect('booking.customer', 'bookingCustomer')
      .leftJoinAndSelect('bookingCustomer.user', 'customerUser')
      .leftJoinAndSelect('report.tasker', 'tasker')
      .leftJoinAndSelect('report.customer', 'customer')
      .setLock('pessimistic_write', undefined, ['report'])
      .where('report.id = :reportId', { reportId })
      .getOne();
    if (!report) {
      throw new NotFoundException('Không tìm thấy báo cáo khách vắng mặt');
    }
    return report;
  }

  private async afterReportCommitted(outcome: {
    report: BookingAbsenceReportEntity;
    previousStatus: BookingStatus;
    taskerUserId: string;
    customerUserId: string | null;
    bookingCode: string;
    paymentStatus: string;
  }): Promise<void> {
    const { report } = outcome;
    const admins = await this.dataSource.getRepository(UserEntity).find({
      where: { role: UserRole.ADMIN, isActive: true },
      select: { id: true },
    });
    await Promise.allSettled([
      this.lifecycleScheduler.deactivateBooking(report.booking.id),
      this.trackingGateway.emitBookingStatusUpdated(report.booking.id, {
        bookingId: report.booking.id,
        bookingCode: outcome.bookingCode,
        previousStatus: outcome.previousStatus,
        status: BookingStatus.CANCELLED,
        changedAt: report.reportedAt.toISOString(),
        actor: { type: 'TASKER', id: outcome.taskerUserId },
        paymentStatus: outcome.paymentStatus,
      }),
      this.notificationService.notify({
        userId: outcome.taskerUserId,
        type: NotificationType.BOOKING_ABSENCE_REPORTED,
        title: 'Báo cáo đã được tiếp nhận',
        content: `Báo cáo khách vắng của booking #${outcome.bookingCode} đang chờ Admin duyệt.`,
        referenceId: report.booking.id,
        referenceType: NotificationRefType.BOOKING,
        dedupeKey: `booking:${report.booking.id}:absence:reported:tasker`,
      }),
      outcome.customerUserId
        ? this.notificationService.notify({
            userId: outcome.customerUserId,
            type: NotificationType.BOOKING_ABSENCE_REPORTED,
            title: 'Booking đã được báo khách vắng mặt',
            content: `Booking #${outcome.bookingCode} đã hủy và đang chờ Admin xác minh. Phần tiền không tranh chấp đã được hoàn.`,
            referenceId: report.booking.id,
            referenceType: NotificationRefType.BOOKING,
            dedupeKey: `booking:${report.booking.id}:absence:reported:customer`,
          })
        : Promise.resolve(),
      this.notificationService.notifyMany(
        admins.map((admin) => admin.id),
        {
          type: NotificationType.BOOKING_ABSENCE_REPORTED,
          title: 'Báo cáo khách vắng mới',
          content: `Booking #${outcome.bookingCode} cần được duyệt trước ${report.reviewDueAt.toLocaleString('vi-VN')}.`,
          referenceId: report.booking.id,
          referenceType: NotificationRefType.BOOKING,
          dedupeKey: `booking:${report.booking.id}:absence:reported:admin`,
        },
      ),
    ]).then((results) => {
      const failed = results.filter((result) => result.status === 'rejected');
      if (failed.length > 0) {
        this.logger.warn(
          `Báo cáo ${report.id} đã commit nhưng có ${failed.length} side effect thất bại`,
        );
      }
    });
  }

  private async notifyResolution(
    report: BookingAbsenceReportEntity,
  ): Promise<void> {
    const type =
      report.status === BookingAbsenceReportStatus.APPROVED
        ? NotificationType.BOOKING_ABSENCE_APPROVED
        : report.status === BookingAbsenceReportStatus.REJECTED
          ? NotificationType.BOOKING_ABSENCE_REJECTED
          : NotificationType.BOOKING_ABSENCE_EXPIRED;
    const statusText =
      report.status === BookingAbsenceReportStatus.APPROVED
        ? 'đã được duyệt'
        : report.status === BookingAbsenceReportStatus.REJECTED
          ? 'đã bị từ chối'
          : 'đã quá hạn duyệt và được hệ thống chốt';
    const taskerUserId = report.booking.tasker?.user?.id;
    const customerUserId = report.booking.customer?.user?.id;
    const expiredAdminIds =
      report.status === BookingAbsenceReportStatus.EXPIRED
        ? (
            await this.dataSource.getRepository(UserEntity).find({
              where: { role: UserRole.ADMIN, isActive: true },
              select: { id: true },
            })
          ).map((admin) => admin.id)
        : [];
    await Promise.allSettled([
      taskerUserId
        ? this.notificationService.notify({
            userId: taskerUserId,
            type,
            title: 'Cập nhật báo cáo khách vắng',
            content: `Báo cáo booking #${report.booking.bookingCode} ${statusText}.`,
            referenceId: report.booking.id,
            referenceType: NotificationRefType.BOOKING,
            dedupeKey: `booking:${report.booking.id}:absence:${report.status}:tasker`,
          })
        : Promise.resolve(),
      customerUserId
        ? this.notificationService.notify({
            userId: customerUserId,
            type,
            title: 'Kết quả xác minh khách vắng',
            content: `Báo cáo booking #${report.booking.bookingCode} ${statusText}.`,
            referenceId: report.booking.id,
            referenceType: NotificationRefType.BOOKING,
            dedupeKey: `booking:${report.booking.id}:absence:${report.status}:customer`,
          })
        : Promise.resolve(),
      expiredAdminIds.length > 0
        ? this.notificationService.notifyMany(expiredAdminIds, {
            type: NotificationType.BOOKING_ABSENCE_EXPIRED,
            title: 'Báo cáo khách vắng đã quá SLA',
            content: `Booking #${report.booking.bookingCode} đã được hệ thống chốt; nền tảng chịu khoản bồi hoàn do quá hạn duyệt.`,
            referenceId: report.booking.id,
            referenceType: NotificationRefType.BOOKING,
            dedupeKey: `booking:${report.booking.id}:absence:EXPIRED:admin`,
          })
        : Promise.resolve(),
    ]);
  }
}
