import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BookingStatus } from 'src/common/enums/booking-status.enum';
import { PaymentMethod } from 'src/common/enums/payment-method.enum';
import { NotificationType } from 'src/common/enums/notification-type.enum';
import { NotificationRefType } from 'src/common/enums/notification-ref-type.enum';
import { toNumber } from 'src/common/helpers/number.helper';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { NotificationService } from 'src/modules/notification/notification.service';
import { TrackingGateway } from 'src/modules/tracking/tracking.gateway';
import { BookingEntity } from '../entity/booking.entity';
import { ConfirmCompletionDto } from '../dto/confirm-completion.dto';
import { BookingSettlementService } from './booking-settlement.service';
import { BookingWalletPaymentService } from './booking-wallet-payment.service';
import { BookingCheckinService } from './booking-checkin.service';

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
          !booking.surchargePending
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

        // Tổng cuối luôn gồm phần phát sinh (để báo cáo nhất quán).
        booking.totalPrice = previousTotalPrice + surcharge;

        if (booking.paymentMethod === PaymentMethod.WALLET && !payViaCash) {
          // Trừ thêm phần phát sinh từ ví khách vào ví SYSTEM (ném lỗi nếu thiếu).
          await this.bookingWalletPaymentService.adjustEscrow(
            manager,
            booking,
            previousTotalPrice,
          );
        }

        const settleResult =
          await this.bookingSettlementService.settleCompletedBooking(manager, {
            booking,
            tasker: booking.tasker,
            actorUserId: customerUserId,
            note: `Khách xác nhận hoàn thành — phát sinh ${surcharge.toLocaleString('vi-VN')}đ`,
            cashSurcharge: payViaCash ? surcharge : 0,
          });

        return { booking: settleResult.booking, surcharge };
      });

      await this.bookingCheckinService.cancelSurchargeTimeout(bookingId);

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
}
