import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { BookingEntity } from './entities/booking.entity';
import { BookingAddonEntity } from './entities/booking-addon.entity';
import { CustomerEntity } from '../customers/entities/customer.entity';
import { ServiceEntity } from '../services/entities/service.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingResponseDto } from './dto/booking-response.dto';
import { BookingMapper } from './mapper/booking.mapper';
import { BookingStatus } from '../../common/enums/booking-status.enum';
import { PaymentStatus } from '../../common/enums/payment-status.enum';
import { getAddonFakeData } from './fake-data/services-fake-data';
import { generateOrderCode } from 'src/common/helpers/generate-code';
import { UserRole } from '../../common/enums/user-role.enum';
import type { AuthUser } from '../auth/types/AuthRequest';
import { GetBookingHistoryQueryDto } from './dto/get-booking-history-query.dto';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookingRepository: Repository<BookingEntity>,
    @InjectRepository(CustomerEntity)
    private readonly customerRepository: Repository<CustomerEntity>,
    @InjectRepository(ServiceEntity)
    private readonly serviceRepository: Repository<ServiceEntity>,
  ) {}

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
      bookingQuery.andWhere('staffUser.id = :staffUserId', {
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

  async create(
    userId: string,
    createBookingDto: CreateBookingDto,
  ): Promise<BookingResponseDto> {
    const customer = await this.customerRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });

    if (!customer) {
      throw new NotFoundException('Customer profile không tồn tại');
    }

    // Check customer có booking đang hoạt động nào không
    const activeBooking = await this.bookingRepository.findOne({
      where: {
        customer: { id: customer.id },
        status: In([
          BookingStatus.PENDING,
          BookingStatus.CONFIRMED,
          BookingStatus.IN_PROGRESS,
        ]),
      },
    });

    if (activeBooking) {
      throw new ConflictException(
        'Bạn đã có booking đang hoạt động. Vui lòng hoàn thành hoặc hủy booking hiện tại trước khi tạo booking mới.',
      );
    }

    // check service (Chỉ lấy dv đang active, dv hỗ trợ locationType)
    const service = await this.serviceRepository.findOne({
      where: { id: createBookingDto.serviceId },
    });

    if (!service || !service.isActive) {
      throw new NotFoundException('Dịch vụ không tồn tại hoặc đã bị tạm ẩn');
    }
    if (
      !service.supportedLocationTypes.includes(createBookingDto.locationType)
    ) {
      throw new BadRequestException(
        `Dịch vụ không hỗ trợ loại địa điểm ${createBookingDto.locationType}`,
      );
    }

    if (!createBookingDto.address || createBookingDto.address.trim() === '') {
      throw new BadRequestException('Địa chỉ là bắt buộc');
    }

    // Valid giờ
    const bookingDateTime = new Date(
      `${createBookingDto.bookingDate}T${createBookingDto.bookingTime}:00`,
    );
    const now = new Date();

    if (bookingDateTime <= now) {
      throw new BadRequestException(
        'Ngày và giờ đặt lịch phải lớn hơn thời điểm hiện tại',
      );
    }
    const hourlyRate = Number(service.basePrice);
    let basePrice = 0;

    if (createBookingDto.estimatedHours) {
      basePrice = hourlyRate * createBookingDto.estimatedHours;
    }

    // dv bổ sung (nếu có)
    const addons: BookingAddonEntity[] = [];
    let addonsTotal = 0;
    if (
      createBookingDto.addonServiceIds &&
      createBookingDto.addonServiceIds.length > 0
    ) {
      for (const addonId of createBookingDto.addonServiceIds) {
        const addonData = getAddonFakeData(addonId);
        if (!addonData) {
          throw new BadRequestException(
            `Dịch vụ bổ sung ${addonId} không tồn tại`,
          );
        }
        const addon = new BookingAddonEntity();
        addon.addonName = addonData.name;
        addon.addonPrice = addonData.basePrice!;
        addons.push(addon);
        addonsTotal += addonData.basePrice!;
      }
    }
    const totalPrice = basePrice + addonsTotal;
    const orderCode = generateOrderCode();
    const booking = this.bookingRepository.create({
      orderCode,
      customer,
      service,
      locationType: createBookingDto.locationType,
      address: createBookingDto.address,
      bookingDate: new Date(createBookingDto.bookingDate),
      bookingTime: createBookingDto.bookingTime,
      estimatedHours: createBookingDto.estimatedHours,
      hourlyRate: createBookingDto.estimatedHours ? hourlyRate : undefined,
      quotedPrice: totalPrice,
      totalPrice: totalPrice,
      specialRequests: createBookingDto.specialRequests,
      notes: createBookingDto.notes,
      status: BookingStatus.PENDING,
      paymentStatus: PaymentStatus.UNPAID,
    });
    if (addons.length > 0) {
      booking.addons = addons;
    }
    const savedBooking = await this.bookingRepository.save(booking);
    const bookingWithRelations = await this.bookingRepository.findOne({
      where: { id: savedBooking.id },
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
      throw new NotFoundException('Booking không tồn tại sau khi tạo');
    }
    return BookingMapper.toResponseDto(bookingWithRelations);
  }
}
