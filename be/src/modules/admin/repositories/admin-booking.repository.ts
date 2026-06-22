import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BookingEntity } from 'src/modules/booking/entity/booking.entity';
import { BookingSearchQueryDto } from '../dto/booking-search-query.dto';
import { TaskerEntity } from 'src/modules/tasker/entity/tasker.entity';
import { TaskerStatus } from 'src/common/enums/tasker-status.enum';
import { BookingStatus } from 'src/common/enums/booking-status.enum';
import { CancelledBy } from 'src/common/enums/cancelled-by.enum';
import { CustomerEntity } from 'src/modules/customer/entity/customer.entity';
import { BookingStatusLogEntity } from 'src/modules/booking/entity/booking-status-log.entity';
import { UserEntity } from 'src/modules/users/entities/user.entity';
import { NotificationEntity } from 'src/modules/notification/entity/notification.entity';
import { NotificationType } from 'src/common/enums/notification-type.enum';
import { NotificationRefType } from 'src/common/enums/notification-ref-type.enum';

@Injectable()
export class AdminBookingRepository {
  constructor(private readonly dataSource: DataSource) {}

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

  async getBookingDetail(id: string) {
    const booking = await this.dataSource
      .getRepository(BookingEntity)
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.customer', 'cust')
      .leftJoinAndSelect('cust.user', 'cust_u')
      .leftJoinAndSelect('b.tasker', 't')
      .leftJoinAndSelect('t.user', 't_u')
      .where('b.id = :id', { id })
      .getOne();

    if (!booking) return null;

    return {
      id: booking.id,
      bookingCode: booking.bookingCode,
      status: booking.status,
      totalPrice: Number(booking.totalPrice),
      paymentMethod: booking.paymentMethod,
      paymentStatus: booking.paymentStatus,
      scheduledStart: booking.scheduledStart,
      durationHours: Number(booking.durationHours),
      address: booking.address,
      note: booking.note,
      customer: {
        fullName: booking.customer?.user?.fullName || 'N/A',
        phoneNumber: booking.customer?.user?.phone || 'N/A',
      },
      tasker: booking.tasker
        ? {
            fullName: booking.tasker.user?.fullName || 'N/A',
            phoneNumber: booking.tasker.user?.phone || 'N/A',
          }
        : null,
    };
  }

  async cancelBookingByAdmin(bookingId: string, adminUserId: string) {
    return this.dataSource.transaction(async (manager) => {
      const booking = await manager
        .getRepository(BookingEntity)
        .createQueryBuilder('b')
        .leftJoinAndSelect('b.customer', 'c')
        .leftJoinAndSelect('b.tasker', 't')
        .leftJoinAndSelect('t.user', 'tu')
        .setLock('pessimistic_write', undefined, ['b'])
        .where('b.id = :bookingId', { bookingId })
        .getOne();

      if (!booking) {
        throw new NotFoundException('Đơn hàng không tồn tại');
      }

      if (booking.status === BookingStatus.COMPLETED || booking.status === BookingStatus.CANCELLED) {
        throw new BadRequestException('Không thể hủy đơn hàng đã hoàn thành hoặc đã hủy');
      }

      const oldStatus = booking.status;
      booking.status = BookingStatus.CANCELLED;
      booking.cancelledAt = new Date();
      booking.cancelledBy = CancelledBy.ADMIN;
      booking.cancelledByUserId = adminUserId;

      const savedBooking = await manager.getRepository(BookingEntity).save(booking);

      await manager.increment(
        CustomerEntity,
        { id: booking.customer.id },
        'totalCancelled',
        1,
      );

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

      if (booking.tasker?.user?.id) {
        const noti = manager.getRepository(NotificationEntity).create({
          user: { id: booking.tasker.user.id } as UserEntity,
          type: NotificationType.BOOKING_CANCELLED,
          referenceId: booking.id,
          referenceType: NotificationRefType.BOOKING,
          title: 'Đơn hàng bị hủy bởi Admin',
          content: `Đơn ${booking.bookingCode} đã bị quản trị viên hủy.`,
          isRead: false,
          dedupeKey: `booking:${booking.id}:${NotificationType.BOOKING_CANCELLED}`,
        });
        await manager.getRepository(NotificationEntity).save(noti);
      }

      return { success: true, message: 'Đã hủy đơn hàng thành công' };
    });
  }

  async assignTaskerToBooking(bookingId: string, taskerId: string, adminUserId: string) {
    return this.dataSource.transaction(async (manager) => {
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
        throw new BadRequestException('Chỉ có thể gán thợ cho đơn hàng đang chờ thợ (POSTED)');
      }

      const tasker = await manager.getRepository(TaskerEntity).findOne({
        where: { id: taskerId },
        relations: ['user'],
      });

      if (!tasker) {
        throw new NotFoundException('Không tìm thấy nhân viên (Tasker)');
      }

      if (tasker.status !== TaskerStatus.ACTIVE) {
        throw new BadRequestException('Nhân viên không ở trạng thái hoạt động (ACTIVE)');
      }

      const oldStatus = booking.status;
      booking.tasker = tasker;
      booking.status = BookingStatus.CONFIRMED;

      const savedBooking = await manager.getRepository(BookingEntity).save(booking);

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

      if (booking.customer?.user?.id) {
        const noti = manager.getRepository(NotificationEntity).create({
          user: { id: booking.customer.user.id } as UserEntity,
          type: NotificationType.BOOKING_CONFIRMED,
          referenceId: booking.id,
          referenceType: NotificationRefType.BOOKING,
          title: 'Đơn hàng đã được gán nhân viên',
          content: `Quản trị viên đã gán nhân viên ${tasker.user?.fullName || 'N/A'} cho đơn ${booking.bookingCode} của bạn.`,
          isRead: false,
          dedupeKey: `booking:${booking.id}:${NotificationType.BOOKING_CONFIRMED}`,
        });
        await manager.getRepository(NotificationEntity).save(noti);
      }

      if (tasker.user?.id) {
        const noti = manager.getRepository(NotificationEntity).create({
          user: { id: tasker.user.id } as UserEntity,
          type: NotificationType.SYSTEM,
          referenceId: booking.id,
          referenceType: NotificationRefType.BOOKING,
          title: 'Bạn được gán đơn mới',
          content: `Bạn đã được quản trị viên gán đơn ${booking.bookingCode}.`,
          isRead: false,
          dedupeKey: `booking:${booking.id}:tasker_assigned`,
        });
        await manager.getRepository(NotificationEntity).save(noti);
      }

      return { success: true, message: 'Gán nhân viên thành công' };
    });
  }

  async searchBookings(queryDto: BookingSearchQueryDto) {
    const { keyword, page = 1, limit = 10 } = queryDto;
    const skip = (page - 1) * limit;

    const query = this.dataSource
      .getRepository(BookingEntity)
      .createQueryBuilder('b')
      .leftJoin('b.customer', 'c')
      .leftJoin('c.user', 'u')
      .orderBy('b.createdAt', 'DESC');

    if (keyword) {
      query.andWhere('(b.bookingCode ILIKE :kw OR u.fullName ILIKE :kw)', {
        kw: `%${keyword}%`,
      });
    }

    const total = await query.getCount();

    const rows = await query
      .select([
        'b.id AS id',
        'b.booking_code AS "bookingCode"',
        'u.full_name AS "customerName"',
        'b.status AS status',
        'b.scheduled_start AS "scheduledStart"',
        'b.total_price AS "totalPrice"',
      ])
      .offset(skip)
      .limit(limit)
      .getRawMany();

    return {
      data: rows,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async expireOverdueBookings() {
    return this.dataSource.transaction(async (manager) => {
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
  }
}


