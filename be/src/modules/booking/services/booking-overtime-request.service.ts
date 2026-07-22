import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { BookingStatus } from 'src/common/enums/booking-status.enum';
import { PaymentMethod } from 'src/common/enums/payment-method.enum';
import { BookingOvertimeRequestStatus } from 'src/common/enums/booking-overtime-request-status.enum';
import { NotificationType } from 'src/common/enums/notification-type.enum';
import { NotificationRefType } from 'src/common/enums/notification-ref-type.enum';
import { toNumber } from 'src/common/helpers/number.helper';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { NotificationService } from 'src/modules/notification/notification.service';
import { UserEntity } from 'src/modules/users/entities/user.entity';
import { BookingEntity } from '../entity/booking.entity';
import { BookingStatusLogEntity } from '../entity/booking-status-log.entity';
import { RespondOvertimeDto } from '../dto/overtime-request.dto';
import { BookingWalletPaymentService } from './booking-wallet-payment.service';
import {
  BookingCheckinService,
  OVERTIME_REQUEST_WINDOW_MS,
} from './booking-checkin.service';

export interface OvertimeRequestResult {
  bookingId: string;
  bookingCode: string;
  status: BookingOvertimeRequestStatus;
  minutes: number;
  fee: number;
  /** Hạn chót khách phải phản hồi (null khi đã có kết quả). */
  respondBy: string | null;
  /** Tổng số phút thêm giờ đã được khách duyệt trên đơn này. */
  approvedOvertimeMinutes: number;
}

/**
 * Tasker chỉ báo trước cho khách khi công việc có thể phát sinh.
 * Số phút và phụ phí chính thức luôn được tính theo thời điểm checkout.
 */
@Injectable()
export class BookingOvertimeRequestService {
  private readonly logger = new Logger(BookingOvertimeRequestService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly notificationService: NotificationService,
    private readonly bookingWalletPaymentService: BookingWalletPaymentService,
    private readonly bookingCheckinService: BookingCheckinService,
  ) {}

  /** Tasker báo khách công việc có thể phát sinh thêm thời gian. */
  async requestOvertime(
    taskerUserId: string,
    bookingId: string,
  ): Promise<OvertimeRequestResult> {
    return asyncHandleOperation(async () => {
      const result = await this.dataSource.transaction(async (manager) => {
        const booking = await this.lockBooking(manager, bookingId, {
          taskerUserId,
        });

        if (!booking.customer) {
          throw new BadRequestException(
            'Đơn khách vãng lai không thể gửi thông báo trong ứng dụng — hãy trao đổi trực tiếp với khách',
          );
        }
        if (
          booking.overtimeRequestStatus === BookingOvertimeRequestStatus.PENDING
        ) {
          throw new BadRequestException(
            'Đang có yêu cầu thêm giờ chờ khách phản hồi',
          );
        }
        if (
          booking.overtimeRequestStatus ===
          BookingOvertimeRequestStatus.NOTIFIED
        ) {
          throw new BadRequestException(
            'Đã thông báo cho khách về khả năng phát sinh thêm giờ',
          );
        }

        booking.overtimeRequestStatus = BookingOvertimeRequestStatus.NOTIFIED;
        booking.overtimeRequestMinutes = 0;
        booking.overtimeRequestFee = 0;
        booking.overtimeRequestedAt = new Date();
        booking.overtimeRespondedAt = new Date();

        const savedBooking = await manager
          .getRepository(BookingEntity)
          .save(booking);

        await manager.getRepository(BookingStatusLogEntity).save(
          manager.getRepository(BookingStatusLogEntity).create({
            booking: savedBooking,
            oldStatus: BookingStatus.IN_PROGRESS,
            newStatus: BookingStatus.IN_PROGRESS,
            changedByUser: { id: taskerUserId } as UserEntity,
            note:
              'Tasker đã báo khách công việc có thể phát sinh thêm giờ; ' +
              'phụ phí sẽ chốt theo thời điểm checkout',
            cancellationFee: 0,
            refundAmount: 0,
          }),
        );

        return savedBooking;
      });

      const customerUserId = result.customer?.user?.id;
      if (customerUserId) {
        await this.notificationService.notify({
          userId: customerUserId,
          type: NotificationType.BOOKING_OVERTIME_REQUEST,
          title: 'Công việc có thể phát sinh thêm giờ',
          content:
            `Booking #${result.bookingCode}: tasker báo công việc có thể kéo dài. ` +
            'Phụ phí sẽ được tính theo thời gian làm thực tế khi checkout và gửi bạn xác nhận.',
          referenceId: result.id,
          referenceType: NotificationRefType.BOOKING,
        });
      }

      this.logger.log(
        `Booking ${result.bookingCode}: tasker đã báo khách có thể phát sinh thêm giờ`,
      );

      return this.toResult(result);
    }, 'Không thể báo khách về thời gian phát sinh');
  }

  /**
   * Khách duyệt hoặc từ chối. Đơn ví được GIỮ TIỀN ngay khi duyệt để phần cam kết
   * chắc chắn thu được; làm ít hơn thì hoàn lại lúc checkout.
   */
  async respondOvertime(
    customerUserId: string,
    bookingId: string,
    dto: RespondOvertimeDto,
  ): Promise<OvertimeRequestResult> {
    return asyncHandleOperation(async () => {
      const result = await this.dataSource.transaction(async (manager) => {
        const booking = await this.lockBooking(manager, bookingId, {
          customerUserId,
        });

        if (
          booking.overtimeRequestStatus !== BookingOvertimeRequestStatus.PENDING
        ) {
          throw new BadRequestException(
            'Không có yêu cầu thêm giờ nào đang chờ bạn phản hồi',
          );
        }

        const minutes = toNumber(booking.overtimeRequestMinutes);
        const fee = Math.round(toNumber(booking.overtimeRequestFee));
        booking.overtimeRespondedAt = new Date();

        if (dto.action === 'REJECT') {
          booking.overtimeRequestStatus = BookingOvertimeRequestStatus.REJECTED;
        } else {
          booking.overtimeRequestStatus = BookingOvertimeRequestStatus.APPROVED;
          booking.approvedOvertimeMinutes =
            toNumber(booking.approvedOvertimeMinutes) + minutes;

          // Đơn ví: giữ tiền ngay để cam kết có bảo đảm. Ví thiếu → ném lỗi,
          // yêu cầu vẫn ở trạng thái PENDING (transaction rollback).
          if (booking.paymentMethod === PaymentMethod.WALLET && fee > 0) {
            const previousTotalPrice = toNumber(booking.totalPrice);
            booking.totalPrice = previousTotalPrice + fee;
            await this.bookingWalletPaymentService.adjustEscrow(
              manager,
              booking,
              previousTotalPrice,
            );
          }
        }

        const savedBooking = await manager
          .getRepository(BookingEntity)
          .save(booking);

        await manager.getRepository(BookingStatusLogEntity).save(
          manager.getRepository(BookingStatusLogEntity).create({
            booking: savedBooking,
            oldStatus: BookingStatus.IN_PROGRESS,
            newStatus: BookingStatus.IN_PROGRESS,
            changedByUser: { id: customerUserId } as UserEntity,
            note:
              dto.action === 'APPROVE'
                ? `Khách duyệt thêm ${minutes} phút (${fee.toLocaleString('vi-VN')}đ)`
                : `Khách từ chối yêu cầu thêm ${minutes} phút`,
            cancellationFee: 0,
            refundAmount: 0,
          }),
        );

        return savedBooking;
      });

      await this.bookingCheckinService.cancelOvertimeRequestTimeout(bookingId);

      const taskerUserId = result.tasker?.user?.id;
      const approved =
        result.overtimeRequestStatus === BookingOvertimeRequestStatus.APPROVED;
      if (taskerUserId) {
        await this.notificationService.notify({
          userId: taskerUserId,
          type: approved
            ? NotificationType.BOOKING_OVERTIME_APPROVED
            : NotificationType.BOOKING_OVERTIME_REJECTED,
          title: approved
            ? 'Khách đã duyệt thêm giờ'
            : 'Khách từ chối thêm giờ',
          content: approved
            ? `Booking #${result.bookingCode}: bạn được làm thêm ${toNumber(result.overtimeRequestMinutes)} phút, phụ phí đã được cam kết.`
            : `Booking #${result.bookingCode}: khách không đồng ý thêm giờ. Hãy checkout đúng giờ đã đặt.`,
          referenceId: result.id,
          referenceType: NotificationRefType.BOOKING,
        });
      }

      this.logger.log(
        `Booking ${result.bookingCode}: khách ${approved ? 'duyệt' : 'từ chối'} thêm giờ`,
      );

      return this.toResult(result);
    }, 'Không thể phản hồi yêu cầu thêm giờ');
  }

  private async lockBooking(
    manager: EntityManager,
    bookingId: string,
    actor: { taskerUserId?: string; customerUserId?: string },
  ): Promise<BookingEntity> {
    const query = manager
      .getRepository(BookingEntity)
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.tasker', 'tasker')
      .leftJoinAndSelect('tasker.user', 'taskerUser')
      .leftJoinAndSelect('booking.customer', 'customer')
      .leftJoinAndSelect('customer.user', 'customerUser')
      .setLock('pessimistic_write', undefined, ['booking'])
      .where('booking.id = :bookingId', { bookingId });

    if (actor.taskerUserId) {
      query.andWhere('taskerUser.id = :taskerUserId', {
        taskerUserId: actor.taskerUserId,
      });
    }
    if (actor.customerUserId) {
      query.andWhere('customerUser.id = :customerUserId', {
        customerUserId: actor.customerUserId,
      });
    }

    const booking = await query.getOne();
    if (!booking) {
      throw new NotFoundException(
        'Booking không tồn tại hoặc không thuộc về bạn',
      );
    }
    if (booking.status !== BookingStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Chỉ đơn đang làm việc mới xin/duyệt thêm giờ được',
      );
    }
    return booking;
  }

  private toResult(booking: BookingEntity): OvertimeRequestResult {
    const respondBy =
      booking.overtimeRequestStatus === BookingOvertimeRequestStatus.PENDING &&
      booking.overtimeRequestedAt
        ? new Date(
            booking.overtimeRequestedAt.getTime() + OVERTIME_REQUEST_WINDOW_MS,
          ).toISOString()
        : null;

    return {
      bookingId: booking.id,
      bookingCode: booking.bookingCode,
      status: booking.overtimeRequestStatus,
      minutes: toNumber(booking.overtimeRequestMinutes),
      fee: toNumber(booking.overtimeRequestFee),
      respondBy,
      approvedOvertimeMinutes: toNumber(booking.approvedOvertimeMinutes),
    };
  }
}
