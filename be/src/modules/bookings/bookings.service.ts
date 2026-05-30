import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingEntity } from './entities/booking.entity';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { AssignStaffDto } from './dto/assign-staff.dto';
import { BookingResponseDto } from './dto/booking-response.dto';
import { BookingMapper } from './mapper/booking.mapper';
import { BookingStatus } from '../../common/enums/booking-status.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import type { AuthUser } from '../auth/types/AuthRequest';
import { GetBookingHistoryQueryDto } from './dto/get-booking-history-query.dto';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { StaffServiceEntity } from '../staffs/entities/staff-service.entity';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookingRepository: Repository<BookingEntity>,
    @InjectRepository(StaffServiceEntity)
    private readonly staffServiceRepository: Repository<StaffServiceEntity>,
  ) {}

// Rule: Admin, staff, customer
  async getBookingHistory(
    currentUser: AuthUser,
    query: GetBookingHistoryQueryDto,
  ): Promise<PaginatedResponseDto<BookingResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    if (query.bookingDateFrom && query.bookingDateTo) {
      const dateFrom = new Date(query.bookingDateFrom);
      const dateTo = new Date(query.bookingDateTo);

      if (dateFrom > dateTo) {
        throw new BadRequestException(
          'bookingDateFrom không được lớn hơn bookingDateTo',
        );
      }
    }

    const bookingQuery = this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.customer', 'customer')
      .leftJoinAndSelect('customer.user', 'customerUser')
      .leftJoinAndSelect('booking.service', 'service')
      .leftJoinAndSelect('booking.staffService', 'staffService')
      .leftJoinAndSelect('staffService.service', 'staffServiceService')
      .leftJoinAndSelect('staffService.staff', 'staff')
      .leftJoinAndSelect('staff.user', 'staffUser')
      .leftJoinAndSelect('booking.addons', 'addons')
      .orderBy('booking.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (currentUser.role === UserRole.CUSTOMER) {
      bookingQuery.andWhere('customerUser.id = :customerUserId', {
        customerUserId: currentUser.id,
      });
    }

    if (currentUser.role === UserRole.STAFF) {
      bookingQuery
        .andWhere('staffService.id IS NOT NULL')
        .andWhere('staffUser.id = :staffUserId', {
          staffUserId: currentUser.id,
        });
    }

    if (query.status) {
      bookingQuery.andWhere('booking.status = :status', {
        status: query.status,
      });
    }

    if (query.bookingDateFrom) {
      bookingQuery.andWhere('booking.bookingDate >= :bookingDateFrom', {
        bookingDateFrom: query.bookingDateFrom,
      });
    }

    if (query.bookingDateTo) {
      bookingQuery.andWhere('booking.bookingDate <= :bookingDateTo', {
        bookingDateTo: query.bookingDateTo,
      });
    }

    const [bookings, total] = await bookingQuery.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      data: bookings.map((booking) => BookingMapper.toResponseDto(booking)),
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async getDetailBooking(
    id: string,
    currentUser: AuthUser,
  ): Promise<BookingResponseDto> {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: [
        'customer',
        'customer.user',
        'service',
        'staffService',
        'staffService.service',
        'staffService.staff',
        'staffService.staff.user',
        'addons',
      ],
    });
    if (!booking) {
      throw new NotFoundException('Booking không tồn tại');
    }
    if (currentUser.role === UserRole.ADMIN) {
      return BookingMapper.toResponseDto(booking);
    }
    if (
      currentUser.role === UserRole.CUSTOMER &&
      booking.customer.user.id !== currentUser.id
    ) {
      throw new ForbiddenException('Bạn không có quyền xem booking này');
    }
    if (currentUser.role === UserRole.STAFF) {
      const assignedStaffUserId = booking.staffService?.staff?.user?.id;

      if (!assignedStaffUserId || assignedStaffUserId !== currentUser.id) {
        throw new ForbiddenException('Bạn không có quyền xem booking này');
      }
    }

    return BookingMapper.toResponseDto(booking);
  }

  // Rule: Customer, Admin

  async cancelBooking(
    id: string,
    currentUser: AuthUser,
    cancelBookingDto: CancelBookingDto,
  ): Promise<BookingResponseDto> {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: [
        'customer',
        'customer.user',
        'service',
        'staffService',
        'staffService.service',
        'staffService.staff',
        'staffService.staff.user',
        'addons',
      ],
    });

    if (!booking) {
      throw new NotFoundException('Booking không tồn tại');
    }
    if (currentUser.role === UserRole.CUSTOMER) {
      if (booking.customer.user.id !== currentUser.id) {
        throw new ForbiddenException('Bạn không có quyền hủy booking này');
      }
      if (booking.status !== BookingStatus.PENDING) {
        throw new BadRequestException(
          'Bạn chỉ có thể hủy booking ở trạng thái chờ xác nhận (PENDING). Vui lòng liên hệ admin để được hỗ trợ.',
        );
      }
    }
    if (currentUser.role === UserRole.ADMIN) {
      if (
        booking.status === BookingStatus.COMPLETED ||
        booking.status === BookingStatus.CANCELLED
      ) {
        throw new BadRequestException(
          `Không thể hủy booking ở trạng thái ${booking.status}`,
        );
      }
    }
    booking.status = BookingStatus.CANCELLED;
    booking.cancelledBy = currentUser.id;
    booking.cancellationReason = cancelBookingDto.cancellationReason;
    booking.cancelledAt = new Date();
    const updatedBooking = await this.bookingRepository.save(booking);
    return BookingMapper.toResponseDto(updatedBooking);
  }

  // ======================== ADMIN ONLY ========================

  async assignStaff(
    id: string,
    assignStaffDto: AssignStaffDto,
  ): Promise<BookingResponseDto | { warning: string }> {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: [
        'customer',
        'customer.user',
        'service',
        'staffService',
        'staffService.service',
        'staffService.staff',
        'staffService.staff.user',
        'addons',
      ],
    });

    if (!booking) {
      throw new NotFoundException('Booking không tồn tại');
    }

    if (booking.status === BookingStatus.COMPLETED) {
      throw new BadRequestException(
        'Không thể gán staff cho booking đã hoàn thành',
      );
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Không thể gán staff cho booking đã hủy');
    }

    const serviceId: string = booking.service.id;

    // Tìm staffService của staff đó match với booking's service
    let staffService = await this.staffServiceRepository.findOne({
      where: {
        staff: { id: assignStaffDto.staffId },
        service: { id: serviceId },
      },
      relations: ['staff', 'service'],
    });

    // Nếu staff đc chọn ko match với bk service
    if (!staffService) {
      // Lần 1: Cảnh báo, yêu cầu xác nhận
      if (!assignStaffDto.forceAssign) {
        return {
          warning:
            'Nhân viên chưa đăng ký dịch vụ này, bạn có muốn tiếp tục gán không?',
        };
      }

      // Lần 2 (forceAssign=true): Bỏ qua valid, auto tạo staffService cho staff đó
      staffService = this.staffServiceRepository.create({
        staff: { id: assignStaffDto.staffId },
        service: { id: serviceId },
        locationTypes: [booking.locationType],
        isAvailable: true,
      });
      staffService = await this.staffServiceRepository.save(staffService);
      const reloadedStaffService = await this.staffServiceRepository.findOne({
        where: { id: staffService.id },
        relations: ['staff', 'staff.user', 'service'],
      });
      if (reloadedStaffService) {
        staffService = reloadedStaffService;
      }
    }
    booking.staffService = staffService;
    if (booking.status === BookingStatus.PENDING) {
      booking.status = BookingStatus.CONFIRMED;
      booking.confirmedAt = new Date();
    }
    await this.bookingRepository.save(booking);
    const updatedBooking = await this.bookingRepository.findOne({
      where: { id: booking.id },
      relations: [
        'customer',
        'customer.user',
        'service',
        'staffService',
        'staffService.service',
        'staffService.staff',
        'staffService.staff.user',
        'addons',
      ],
    });
    if (!updatedBooking) {
      throw new NotFoundException('Booking không tồn tại sau khi gán staff');
    }
    return BookingMapper.toResponseDto(updatedBooking);
  }
}
