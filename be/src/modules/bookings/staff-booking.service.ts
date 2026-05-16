import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import { BookingEntity } from './entities/booking.entity';
import { StaffEntity } from '../staffs/entities/staff.entity';
import { StaffServiceEntity } from '../staffs/entities/staff-service.entity';
import { BookingResponseDto } from './dto/booking-response.dto';
import { BookingMapper } from './mapper/booking.mapper';
import { BookingStatus } from '../../common/enums/booking-status.enum';
import { APPROVAL_STATUS } from '../../common/enums/approval-status.enum';

@Injectable()
export class StaffBookingService {
  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookingRepository: Repository<BookingEntity>,
    @InjectRepository(StaffEntity)
    private readonly staffRepository: Repository<StaffEntity>,
    @InjectRepository(StaffServiceEntity)
    private readonly staffServiceRepository: Repository<StaffServiceEntity>,
  ) {}
  async getAvailableBookings(
    staffUserId: string,
  ): Promise<BookingResponseDto[]> {
    const staff = await this.staffRepository.findOne({
      where: {
        user: { id: staffUserId },
        approvalStatus: APPROVAL_STATUS.APPROVED,
      },
      relations: ['user'],
    });
    if (!staff) {
      throw new NotFoundException(
        'Không tìm thấy staff hoặc staff chưa được duyệt',
      );
    }
    const staffServices = await this.staffServiceRepository.find({
      where: { staff: { id: staff.id }, isAvailable: true },
      relations: ['service'],
    });
    if (staffServices.length === 0) {
      return [];
    }
    const supportedServiceIds = staffServices.map((ss) => ss.service.id);
    const bookings = await this.bookingRepository.find({
      where: {
        status: BookingStatus.PENDING,
        staffService: IsNull(),
        service: { id: In(supportedServiceIds) },
      },
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
      order: { createdAt: 'DESC' },
    });
    const staffServiceByServiceId = new Map(
      staffServices.map((ss) => [ss.service.id, ss]),
    );
    const now = new Date();
    const filteredBookings = bookings.filter((booking) => {
      const staffService = staffServiceByServiceId.get(booking.service.id);
      if (!staffService) {
        return false;
      }
      if (!staffService.locationTypes.includes(booking.locationType)) {
        return false;
      }
      const bookingDateTime = new Date(
        `${booking.bookingDate.toISOString().split('T')[0]}T${booking.bookingTime}:00`,
      );
      return bookingDateTime > now;
    });

    return filteredBookings.map((booking) =>
      BookingMapper.toResponseDto(booking),
    );
  }

  async acceptBooking(
    id: string,
    staffUserId: string,
  ): Promise<BookingResponseDto> {
    return this.bookingRepository.manager.transaction(async (manager) => {
      const txStaffRepository = manager.getRepository(StaffEntity);
      const txStaffServiceRepository =
        manager.getRepository(StaffServiceEntity);
      const txBookingRepository = manager.getRepository(BookingEntity);

      const staff = await txStaffRepository.findOne({
        where: {
          user: { id: staffUserId },
          approvalStatus: APPROVAL_STATUS.APPROVED,
        },
        relations: ['user'],
      });

      if (!staff) {
        throw new NotFoundException(
          'Không tìm thấy staff hoặc staff chưa được duyệt',
        );
      }

      const booking = await txBookingRepository.findOne({
        where: { id },
        relations: ['service', 'staffService'],
      });

      if (!booking) {
        throw new NotFoundException('Booking không tồn tại');
      }

      if (booking.status !== BookingStatus.PENDING) {
        throw new BadRequestException(
          `Booking không thể nhận ở trạng thái ${booking.status}`,
        );
      }

      if (booking.staffService) {
        throw new ConflictException('Booking đã có người nhận');
      }
      const bookingDateTime = new Date(
        `${booking.bookingDate.toISOString().split('T')[0]}T${booking.bookingTime}:00`,
      );
      const now = new Date();

      if (bookingDateTime < now) {
        throw new BadRequestException('Không thể nhận booking đã quá giờ hẹn');
      }

      const matchedStaffService = await txStaffServiceRepository.findOne({
        where: {
          staff: { id: staff.id },
          service: { id: booking.service.id },
          isAvailable: true,
        },
      });

      if (!matchedStaffService) {
        throw new ForbiddenException(
          'Bạn không có quyền nhận booking này vì chưa đăng ký dịch vụ tương ứng',
        );
      }

      if (!matchedStaffService.locationTypes.includes(booking.locationType)) {
        throw new ForbiddenException(
          'Bạn không có quyền nhận booking này vì không hỗ trợ loại địa điểm này',
        );
      }
      const conflictingBookings = await txBookingRepository
        .createQueryBuilder('b')
        .leftJoin('b.staffService', 'ss')
        .leftJoin('ss.staff', 's')
        .where('s.id = :staffId', { staffId: staff.id })
        .andWhere('b.status IN (:...statuses)', {
          statuses: [BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS],
        })
        .andWhere('b.bookingDate = :bookingDate', {
          bookingDate: booking.bookingDate,
        })
        .andWhere('b.bookingTime = :bookingTime', {
          bookingTime: booking.bookingTime,
        })
        .getCount();

      if (conflictingBookings > 0) {
        throw new ConflictException('Bạn đã có booking khác vào thời điểm này');
      }
      booking.staffService = matchedStaffService;
      booking.status = BookingStatus.CONFIRMED;
      booking.confirmedAt = new Date();
      await txBookingRepository.save(booking);
      const bookingWithRelations = await txBookingRepository.findOne({
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
      if (!bookingWithRelations) {
        throw new NotFoundException('Booking không tồn tại sau khi cập nhật');
      }
      return BookingMapper.toResponseDto(bookingWithRelations);
    });
  }
}
