import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { BookingStatus } from 'src/common/enums/booking-status.enum';
import { BookingSurchargeStatus } from 'src/common/enums/booking-surcharge-status.enum';
import { PaymentMethod } from 'src/common/enums/payment-method.enum';
import { NotificationType } from 'src/common/enums/notification-type.enum';
import { NotificationRefType } from 'src/common/enums/notification-ref-type.enum';
import { toNumber } from 'src/common/helpers/number.helper';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { NotificationService } from 'src/modules/notification/notification.service';
import { TrackingGateway } from 'src/modules/tracking/tracking.gateway';
import { BookingEntity } from '../entity/booking.entity';
import { ConfirmCompletionDto } from '../dto/confirm-completion.dto';
import { RejectSurchargeDto } from '../dto/reject-surcharge.dto';
import { BookingStatusLogEntity } from '../entity/booking-status-log.entity';
import { UserEntity } from 'src/modules/users/entities/user.entity';
import { BookingSettlementService } from './booking-settlement.service';
import { BookingWalletPaymentService } from './booking-wallet-payment.service';
import { BookingCheckinService } from './booking-checkin.service';

/** Kết quả nội bộ của một nhánh xử lý phụ phí (đã quyết toán xong). */
interface SurchargeOutcome {
  booking: BookingEntity;
  surcharge: number;
  /** Phần nền tảng ứng trả (gộp cả hoa hồng) — 0 nếu khách đã trả. */
  advanceBase: number;
  /** Số tiền thực chuyển vào ví tasker sau khi trừ hoa hồng. */
  netPaid: number;
}

export interface ConfirmCompletionResult {
  success: boolean;
  message: string;
  bookingId: string;
  status: BookingStatus;
  totalPrice: number;
  surcharge: number;
}

/**
 * Khách xác nhận hoàn thành khi đơn có phần phát sinh (thêm giờ). Đơn tiền mặt →
 * thanh toán tổng (gốc + phát sinh) bằng tiền mặt; đơn trả trước bằng ví → khách
 * chọn trừ thêm vào ví hoặc trả phần phát sinh bằng tiền mặt.
 */
@Injectable()
export class CustomerConfirmCompletionService {
  private readonly logger = new Logger(CustomerConfirmCompletionService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly bookingSettlementService: BookingSettlementService,
    private readonly bookingWalletPaymentService: BookingWalletPaymentService,
    private readonly bookingCheckinService: BookingCheckinService,
    private readonly trackingGateway: TrackingGateway,
    private readonly notificationService: NotificationService,
  ) {}

  async confirmCompletion(
    customerUserId: string,
    bookingId: string,
    dto: ConfirmCompletionDto,
  ): Promise<ConfirmCompletionResult> {
    return asyncHandleOperation(async () => {
      const result = await this.dataSource.transaction(async (manager) => {
        const bookingRepo = manager.getRepository(BookingEntity);
        const booking = await bookingRepo
          .createQueryBuilder('booking')
          .leftJoinAndSelect('booking.tasker', 'tasker')
          .leftJoinAndSelect('tasker.user', 'taskerUser')
          .leftJoinAndSelect('booking.customer', 'customer')
          .leftJoinAndSelect('customer.user', 'customerUser')
          .leftJoinAndSelect('booking.bookingSubServices', 'bookingSubServices')
          .setLock('pessimistic_write', undefined, ['booking'])
          .where('booking.id = :bookingId', { bookingId })
          .andWhere('customerUser.id = :customerUserId', { customerUserId })
          .getOne();

        if (!booking) {
          throw new NotFoundException(
            'Booking không tồn tại hoặc không thuộc về bạn',
          );
        }

        if (
          booking.status !== BookingStatus.IN_PROGRESS ||
          booking.surchargeStatus !== BookingSurchargeStatus.PENDING_CUSTOMER
        ) {
          throw new BadRequestException(
            'Booking không có phần phát sinh cần xác nhận',
          );
        }

        if (!booking.tasker) {
          throw new BadRequestException('Booking chưa gán tasker');
        }

        const surcharge = Math.round(toNumber(booking.waitingFee));
        const previousTotalPrice = toNumber(booking.totalPrice);

        // Với đơn ví, khách chọn trả phụ phí bằng tiền mặt → phần này quyết toán
        // như tiền mặt (hybrid); mặc định trừ tiếp vào ví.
        const payViaCash =
          booking.paymentMethod === PaymentMethod.WALLET &&
          dto.surchargePaymentMethod === 'CASH';
        const collectsCash =
          booking.paymentMethod === PaymentMethod.CASH || payViaCash;

        // Tổng cuối luôn gồm phần phát sinh (để báo cáo nhất quán).
        booking.totalPrice = previousTotalPrice + surcharge;

        // Thu tiền mặt: tiền chưa vào hệ thống nên CHƯA quyết toán. Chuyển sang
        // chờ tasker xác nhận đã nhận đủ tiền rồi mới hoàn thành đơn.
        if (collectsCash) {
          booking.surchargeStatus =
            BookingSurchargeStatus.PENDING_TASKER_CONFIRM;
          const savedBooking = await bookingRepo.save(booking);

          await manager.getRepository(BookingStatusLogEntity).save(
            manager.getRepository(BookingStatusLogEntity).create({
              booking: savedBooking,
              oldStatus: BookingStatus.IN_PROGRESS,
              newStatus: BookingStatus.IN_PROGRESS,
              changedByUser: { id: customerUserId } as UserEntity,
              note:
                `Khách đồng ý trả phát sinh ${surcharge.toLocaleString('vi-VN')}đ ` +
                `bằng tiền mặt — chờ tasker xác nhận đã nhận`,
              cancellationFee: 0,
              refundAmount: 0,
            }),
          );

          return { booking: savedBooking, surcharge, awaitingTasker: true };
        }

        // Trừ thêm phần phát sinh từ ví khách vào ví SYSTEM (ném lỗi nếu thiếu).
        await this.bookingWalletPaymentService.adjustEscrow(
          manager,
          booking,
          previousTotalPrice,
        );

        const settleResult =
          await this.bookingSettlementService.settleCompletedBooking(manager, {
            booking,
            tasker: booking.tasker,
            actorUserId: customerUserId,
            note: `Khách xác nhận hoàn thành — phát sinh ${surcharge.toLocaleString('vi-VN')}đ`,
          });

        return {
          booking: settleResult.booking,
          surcharge,
          awaitingTasker: false,
        };
      });

      await this.bookingCheckinService.cancelSurchargeTimeout(bookingId);

      // Nhánh tiền mặt: dừng ở đây, nhắc tasker xác nhận đã nhận tiền.
      if (result.awaitingTasker) {
        await this.bookingCheckinService.scheduleSurchargeReceiptTimeout(
          bookingId,
        );

        const pendingTaskerUserId = result.booking.tasker?.user?.id;
        if (pendingTaskerUserId) {
          await this.notificationService.notify({
            userId: pendingTaskerUserId,
            type: NotificationType.BOOKING_SURCHARGE_AWAITING_RECEIPT,
            title: 'Khách đồng ý trả phần phát sinh',
            content:
              `Booking #${result.booking.bookingCode}: khách đồng ý trả ` +
              `${result.surcharge.toLocaleString('vi-VN')}đ tiền mặt. ` +
              `Nhận đủ tiền rồi bấm xác nhận để hoàn thành đơn.`,
            referenceId: result.booking.id,
            referenceType: NotificationRefType.BOOKING,
          });
        }

        return {
          success: true,
          message:
            'Đã xác nhận. Vui lòng thanh toán tiền mặt cho tasker để hoàn tất đơn.',
          bookingId: result.booking.id,
          status: result.booking.status,
          totalPrice: toNumber(result.booking.totalPrice),
          surcharge: result.surcharge,
        };
      }

      const completedAt =
        result.booking.completedAt?.toISOString() ?? new Date().toISOString();
      await this.trackingGateway.emitBookingCompleted(result.booking.id, {
        bookingId: result.booking.id,
        status: result.booking.status,
        completedAt,
        paymentStatus: result.booking.paymentStatus,
      });

      const taskerUserId = result.booking.tasker?.user?.id;
      if (taskerUserId) {
        await this.notificationService.notify({
          userId: taskerUserId,
          type: NotificationType.BOOKING_COMPLETED,
          title: 'Khách đã xác nhận phát sinh',
          content: `Booking #${result.booking.bookingCode} đã hoàn thành, đã thu phần phát sinh ${result.surcharge.toLocaleString('vi-VN')}đ.`,
          referenceId: result.booking.id,
          referenceType: NotificationRefType.BOOKING,
        });
      }

      return {
        success: true,
        message: 'Đã xác nhận hoàn thành và thanh toán phần phát sinh',
        bookingId: result.booking.id,
        status: result.booking.status,
        totalPrice: toNumber(result.booking.totalPrice),
        surcharge: result.surcharge,
      };
    }, 'Không thể xác nhận hoàn thành booking');
  }

  /**
   * Khách từ chối trả phần phát sinh. Đơn vẫn hoàn thành theo GIÁ GỐC, nhưng:
   * - Giữ nguyên `overtimeMinutes` làm bằng chứng (không xoá như luồng cũ).
   * - Nền tảng ứng trả tasker phần phát sinh trong hạn mức để tasker không mất trắng.
   * - Đánh dấu DISPUTED để admin xử lý và để đếm vi phạm của khách.
   */
  async rejectSurcharge(
    customerUserId: string,
    bookingId: string,
    dto: RejectSurchargeDto,
  ): Promise<ConfirmCompletionResult> {
    return asyncHandleOperation(async () => {
      const result = await this.dataSource.transaction(async (manager) => {
        const booking = await this.lockPendingSurchargeBooking(
          manager,
          bookingId,
          BookingSurchargeStatus.PENDING_CUSTOMER,
          { customerUserId },
        );

        return this.waiveSurchargeWithAdvance(manager, booking, {
          actorUserId: customerUserId,
          reason: dto.reason?.trim() || 'Khách từ chối trả phần phát sinh',
          note: 'Khách từ chối phần phát sinh — hoàn thành theo giá gốc, nền tảng ứng trả tasker',
        });
      });

      await this.bookingCheckinService.cancelSurchargeTimeout(bookingId);
      await this.emitDisputeOutcome(result);

      return {
        success: true,
        message:
          'Đã ghi nhận việc bạn không đồng ý phần phát sinh. Đơn hoàn thành theo giá gốc.',
        bookingId: result.booking.id,
        status: result.booking.status,
        totalPrice: toNumber(result.booking.totalPrice),
        surcharge: 0,
      };
    }, 'Không thể từ chối phần phát sinh');
  }

  /**
   * Tasker xác nhận đã nhận đủ tiền mặt phần phát sinh → quyết toán và hoàn thành.
   * Đơn ví trả phụ phí tiền mặt đi nhánh hybrid (escrow phần gốc + tiền mặt phụ phí).
   */
  async confirmSurchargeReceived(
    taskerUserId: string,
    bookingId: string,
  ): Promise<ConfirmCompletionResult> {
    return asyncHandleOperation(async () => {
      const result = await this.dataSource.transaction(async (manager) => {
        const booking = await this.lockPendingSurchargeBooking(
          manager,
          bookingId,
          BookingSurchargeStatus.PENDING_TASKER_CONFIRM,
          { taskerUserId },
        );

        return this.settleCashSurcharge(manager, booking, taskerUserId);
      });

      await this.bookingCheckinService.cancelSurchargeReceiptTimeout(bookingId);
      await this.emitCompleted(result.booking);

      const customerUserId = result.booking.customer?.user?.id;
      if (customerUserId) {
        await this.notificationService.notify({
          userId: customerUserId,
          type: NotificationType.BOOKING_COMPLETED,
          title: 'Đơn đã hoàn thành',
          content: `Tasker đã xác nhận nhận đủ tiền booking #${result.booking.bookingCode}.`,
          referenceId: result.booking.id,
          referenceType: NotificationRefType.BOOKING,
        });
      }

      return {
        success: true,
        message: 'Đã xác nhận nhận đủ tiền, đơn hoàn thành',
        bookingId: result.booking.id,
        status: result.booking.status,
        totalPrice: toNumber(result.booking.totalPrice),
        surcharge: result.surcharge,
      };
    }, 'Không thể xác nhận đã nhận tiền phát sinh');
  }

  // ── Helpers dùng chung cho các nhánh xác nhận / từ chối ─────────────────────

  /**
   * Khoá booking đang treo phụ phí ở đúng trạng thái mong đợi và đúng chủ thể
   * (khách của đơn, hoặc tasker của đơn).
   */
  private async lockPendingSurchargeBooking(
    manager: EntityManager,
    bookingId: string,
    expectedStatus: BookingSurchargeStatus,
    actor: { customerUserId?: string; taskerUserId?: string },
  ): Promise<BookingEntity> {
    const query = manager
      .getRepository(BookingEntity)
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.tasker', 'tasker')
      .leftJoinAndSelect('tasker.user', 'taskerUser')
      .leftJoinAndSelect('booking.customer', 'customer')
      .leftJoinAndSelect('customer.user', 'customerUser')
      .leftJoinAndSelect('booking.bookingSubServices', 'bookingSubServices')
      .setLock('pessimistic_write', undefined, ['booking'])
      .where('booking.id = :bookingId', { bookingId });

    if (actor.customerUserId) {
      query.andWhere('customerUser.id = :customerUserId', {
        customerUserId: actor.customerUserId,
      });
    }
    if (actor.taskerUserId) {
      query.andWhere('taskerUser.id = :taskerUserId', {
        taskerUserId: actor.taskerUserId,
      });
    }

    const booking = await query.getOne();
    if (!booking) {
      throw new NotFoundException(
        'Booking không tồn tại hoặc không thuộc về bạn',
      );
    }
    if (
      booking.status !== BookingStatus.IN_PROGRESS ||
      booking.surchargeStatus !== expectedStatus
    ) {
      throw new BadRequestException(
        'Booking không ở trạng thái chờ xử lý phần phát sinh',
      );
    }
    if (!booking.tasker) {
      throw new BadRequestException('Booking chưa gán tasker');
    }
    return booking;
  }

  private async waiveSurchargeWithAdvance(
    manager: EntityManager,
    booking: BookingEntity,
    meta: { actorUserId: string; reason: string; note: string },
  ): Promise<SurchargeOutcome> {
    const surcharge = Math.round(toNumber(booking.waitingFee));
    const result = await this.bookingSettlementService.settleDisputedSurcharge(
      manager,
      {
        booking,
        tasker: booking.tasker!,
        actorUserId: meta.actorUserId,
        reason: meta.reason,
        note: meta.note,
      },
    );

    return {
      booking: result.booking,
      surcharge,
      advanceBase: result.advanceBase,
      netPaid: result.netPaid,
    };
  }

  private async settleCashSurcharge(
    manager: EntityManager,
    booking: BookingEntity,
    actorUserId: string,
  ): Promise<SurchargeOutcome> {
    const surcharge = Math.round(toNumber(booking.waitingFee));
    // Đơn ví trả phụ phí tiền mặt → hybrid; đơn CASH thu tổng nên không tách.
    const cashSurcharge =
      booking.paymentMethod === PaymentMethod.WALLET ? surcharge : 0;

    const result = await this.bookingSettlementService.settleCompletedBooking(
      manager,
      {
        booking,
        tasker: booking.tasker!,
        actorUserId,
        note: `Tasker xác nhận đã nhận đủ phần phát sinh ${surcharge.toLocaleString('vi-VN')}đ tiền mặt`,
        cashSurcharge,
      },
    );

    return { booking: result.booking, surcharge, advanceBase: 0, netPaid: 0 };
  }

  private async emitCompleted(booking: BookingEntity): Promise<void> {
    await this.trackingGateway.emitBookingCompleted(booking.id, {
      bookingId: booking.id,
      status: booking.status,
      completedAt:
        booking.completedAt?.toISOString() ?? new Date().toISOString(),
      paymentStatus: booking.paymentStatus,
    });
  }

  private async emitDisputeOutcome(outcome: SurchargeOutcome): Promise<void> {
    await this.emitCompleted(outcome.booking);

    const { booking, surcharge, netPaid } = outcome;
    const taskerUserId = booking.tasker?.user?.id;
    const customerUserId = booking.customer?.user?.id;

    await Promise.all([
      taskerUserId &&
        this.notificationService.notify({
          userId: taskerUserId,
          type: NotificationType.BOOKING_SURCHARGE_DISPUTED,
          title: 'Khách không thanh toán phần phát sinh',
          content:
            `Booking #${booking.bookingCode}: khách không trả ` +
            `${surcharge.toLocaleString('vi-VN')}đ phát sinh. ` +
            (netPaid > 0
              ? `Nền tảng đã ứng ${netPaid.toLocaleString('vi-VN')}đ vào ví bạn và sẽ làm việc với khách.`
              : 'Bộ phận hỗ trợ sẽ liên hệ với bạn.'),
          referenceId: booking.id,
          referenceType: NotificationRefType.BOOKING,
        }),
      customerUserId &&
        this.notificationService.notify({
          userId: customerUserId,
          type: NotificationType.BOOKING_SURCHARGE_DISPUTED,
          title: 'Đã ghi nhận việc không thanh toán phần phát sinh',
          content:
            `Booking #${booking.bookingCode} đã hoàn thành theo giá gốc. ` +
            `Khoản phát sinh ${surcharge.toLocaleString('vi-VN')}đ đang được xem xét.`,
          referenceId: booking.id,
          referenceType: NotificationRefType.BOOKING,
        }),
    ]);
  }
}
