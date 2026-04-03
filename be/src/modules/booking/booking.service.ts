import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingEntity } from './entities/booking.entity';
import { CustomerEntity } from '../customers/entities/customer.entity';
import { WorkerServiceEntity } from '../workers/entities/worker-service.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { ReviewBookingDto } from './dto/review-booking.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { BookingFilterDto } from './dto/booking-filter.dto';
import {
  PaginatedBookingResponseDto,
  BookingResponseDto,
} from './dto/booking-response.dto';
import { toBookingResponseDto } from './mapper/booking.mapper';
import { BookingStatus } from 'src/common/enums/booking-status.enum';
import { ServiceLocationType } from 'src/common/enums/service-location-type.enum';
import { UserRole } from 'src/common/enums/user-role.enum';
import { MailService } from '../mail/mail.service';

// Các transition hợp lệ cho trạng thái booking
const VALID_STATUS_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  [BookingStatus.PENDING]: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED],
  [BookingStatus.CONFIRMED]: [
    BookingStatus.IN_PROGRESS,
    BookingStatus.CANCELLED,
  ],
  [BookingStatus.IN_PROGRESS]: [BookingStatus.COMPLETED],
  [BookingStatus.COMPLETED]: [],
  [BookingStatus.CANCELLED]: [],
};

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  // Relations cần load cho booking response
  private readonly bookingRelations = [
    'customer',
    'customer.user',
    'workerService',
    'workerService.service',
    'workerService.worker',
    'workerService.worker.user',
  ];

  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookingRepository: Repository<BookingEntity>,
    @InjectRepository(CustomerEntity)
    private readonly customerRepository: Repository<CustomerEntity>,
    @InjectRepository(WorkerServiceEntity)
    private readonly workerServiceRepository: Repository<WorkerServiceEntity>,
    private readonly mailService: MailService,
  ) {}

  // ─── TẠO BOOKING ──────────────────────────────────────

  async createBooking(
    userId: string,
    dto: CreateBookingDto,
  ): Promise<BookingResponseDto> {
    // 1. Tìm customer profile
    const customer = await this.customerRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });
    if (!customer) {
      throw new NotFoundException(
        'Không tìm thấy profile khách hàng. Vui lòng tạo profile trước.',
      );
    }

    // 2. Tìm worker service
    const workerService = await this.workerServiceRepository.findOne({
      where: { id: dto.workerServiceId, isAvailable: true },
      relations: ['service', 'worker', 'worker.user'],
    });
    if (!workerService) {
      throw new NotFoundException(
        'Không tìm thấy dịch vụ hoặc dịch vụ không khả dụng',
      );
    }

    // 3. Validate serviceLocationType — Worker phải hỗ trợ loại này
    if (!workerService.locationTypes.includes(dto.serviceLocationType)) {
      throw new BadRequestException(
        `Worker này không hỗ trợ dịch vụ "${dto.serviceLocationType}". Chỉ hỗ trợ: ${workerService.locationTypes.join(', ')}`,
      );
    }

    // 4. Xử lý địa chỉ theo loại location
    let address = dto.address;
    if (dto.serviceLocationType === ServiceLocationType.AT_SHOP) {
      // Tại quán → lấy shopAddress từ workerService
      address = workerService.shopAddress || undefined;
    } else if (
      dto.serviceLocationType === ServiceLocationType.HOME &&
      !dto.address
    ) {
      throw new BadRequestException('Địa chỉ bắt buộc khi đặt dịch vụ tại nhà');
    }

    // 5. Tính giá
    const totalPrice = workerService.customPrice
      ? Number(workerService.customPrice)
      : Number(workerService.service.basePrice);

    // 6. Tạo booking
    const booking = this.bookingRepository.create({
      customer: { id: customer.id } as CustomerEntity,
      workerService: { id: workerService.id } as WorkerServiceEntity,
      bookingType: dto.bookingType,
      serviceLocationType: dto.serviceLocationType,
      status: BookingStatus.PENDING,
      scheduledDate: dto.scheduledDate,
      scheduledTime: dto.scheduledTime,
      address,
      latitude: dto.latitude,
      longitude: dto.longitude,
      totalPrice,
      customerNote: dto.customerNote,
      paymentMethod: dto.paymentMethod,
    });

    const savedBooking = await this.bookingRepository.save(booking);

    // 7. Cập nhật totalBooking của customer
    customer.totalBooking += 1;
    await this.customerRepository.save(customer);

    // 8. Load full relations cho response
    const result = await this.findBookingOrFail(savedBooking.id);

    // 9. Gửi email thông báo cho Worker
    this.sendBookingNotification(
      'new_booking',
      result,
      workerService.worker.user.email,
      workerService.worker.user.fullName,
    );

    return toBookingResponseDto(result);
  }

  // ─── DANH SÁCH BOOKING ────────────────────────────────

  async getBookings(
    userId: string,
    userRole: UserRole,
    filterDto: BookingFilterDto,
  ): Promise<PaginatedBookingResponseDto> {
    const {
      status,
      bookingType,
      serviceLocationType,
      dateFrom,
      dateTo,
      page = 1,
      limit = 10,
    } = filterDto;

    const query = this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.customer', 'customer')
      .leftJoinAndSelect('customer.user', 'customerUser')
      .leftJoinAndSelect('booking.workerService', 'workerService')
      .leftJoinAndSelect('workerService.service', 'service')
      .leftJoinAndSelect('workerService.worker', 'worker')
      .leftJoinAndSelect('worker.user', 'workerUser');

    // Filter theo role
    if (userRole === UserRole.CUSTOMER) {
      query.andWhere('customerUser.id = :userId', { userId });
    } else if (userRole === UserRole.WORKER) {
      query.andWhere('workerUser.id = :userId', { userId });
    }
    // Admin thấy tất cả

    // Apply filters
    if (status) {
      query.andWhere('booking.status = :status', { status });
    }
    if (bookingType) {
      query.andWhere('booking.bookingType = :bookingType', { bookingType });
    }
    if (serviceLocationType) {
      query.andWhere('booking.serviceLocationType = :serviceLocationType', {
        serviceLocationType,
      });
    }
    if (dateFrom) {
      query.andWhere('booking.createdAt >= :dateFrom', { dateFrom });
    }
    if (dateTo) {
      query.andWhere('booking.createdAt <= :dateTo', { dateTo });
    }

    query.orderBy('booking.createdAt', 'DESC');
    query.skip((page - 1) * limit).take(limit);

    const [bookings, total] = await query.getManyAndCount();

    return {
      data: bookings.map((b) => toBookingResponseDto(b)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─── CHI TIẾT BOOKING ─────────────────────────────────

  async getBookingById(
    bookingId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<BookingResponseDto> {
    const booking = await this.findBookingOrFail(bookingId);

    // Kiểm tra quyền truy cập
    this.assertBookingAccess(booking, userId, userRole);

    return toBookingResponseDto(booking);
  }

  // ─── CẬP NHẬT TRẠNG THÁI (WORKER) ─────────────────────

  async updateBookingStatus(
    bookingId: string,
    dto: UpdateBookingStatusDto,
    userId: string,
    userRole: UserRole,
  ): Promise<BookingResponseDto> {
    const booking = await this.findBookingOrFail(bookingId);

    // Chỉ Worker sở hữu hoặc Admin mới được cập nhật
    if (userRole !== UserRole.ADMIN) {
      if (booking.workerService.worker.user.id !== userId) {
        throw new ForbiddenException('Bạn không có quyền cập nhật booking này');
      }
    }

    // Validate transition
    const validNext = VALID_STATUS_TRANSITIONS[booking.status];
    if (
      !validNext.includes(dto.status) ||
      dto.status === BookingStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Không thể chuyển từ "${booking.status}" sang "${dto.status}"`,
      );
    }

    // Cập nhật trạng thái
    booking.status = dto.status;

    if (dto.status === BookingStatus.IN_PROGRESS) {
      booking.startedAt = new Date();
    }

    if (dto.status === BookingStatus.COMPLETED) {
      booking.completedAt = new Date();

      // Cập nhật totalJobs cho worker
      const worker = booking.workerService.worker;
      worker.totalJobs += 1;
      // Lưu worker riêng qua workerService relation
    }

    const updated = await this.bookingRepository.save(booking);

    // Gửi email thông báo cho Customer
    const customerEmail = booking.customer.user.email;
    const customerName = booking.customer.user.fullName;

    const notifTypeMap: Partial<Record<BookingStatus, string>> = {
      [BookingStatus.CONFIRMED]: 'booking_confirmed',
      [BookingStatus.IN_PROGRESS]: 'booking_in_progress',
      [BookingStatus.COMPLETED]: 'booking_completed',
    };

    const notifType = notifTypeMap[dto.status];
    if (notifType) {
      this.sendBookingNotification(
        notifType,
        updated,
        customerEmail,
        customerName,
      );
    }

    return toBookingResponseDto(await this.findBookingOrFail(updated.id));
  }

  // ─── HỦY BOOKING ──────────────────────────────────────

  async cancelBooking(
    bookingId: string,
    dto: CancelBookingDto,
    userId: string,
    userRole: UserRole,
  ): Promise<BookingResponseDto> {
    const booking = await this.findBookingOrFail(bookingId);

    // Kiểm tra quyền
    this.assertBookingAccess(booking, userId, userRole);

    // Validate có thể hủy
    const validNext = VALID_STATUS_TRANSITIONS[booking.status];
    if (!validNext.includes(BookingStatus.CANCELLED)) {
      throw new BadRequestException(
        `Không thể hủy booking ở trạng thái "${booking.status}"`,
      );
    }

    // Xác định ai hủy
    let cancelledBy: string;
    if (userRole === UserRole.ADMIN) {
      cancelledBy = 'admin';
    } else if (booking.customer.user.id === userId) {
      cancelledBy = 'customer';
    } else {
      cancelledBy = 'worker';
    }

    booking.status = BookingStatus.CANCELLED;
    booking.cancellationReason = dto.cancellationReason;
    booking.cancelledBy = cancelledBy;

    await this.bookingRepository.save(booking);

    // Gửi email thông báo cho bên kia
    if (cancelledBy === 'customer') {
      // Thông báo Worker
      this.sendBookingNotification(
        'booking_cancelled_by_customer',
        booking,
        booking.workerService.worker.user.email,
        booking.workerService.worker.user.fullName,
      );
    } else {
      // Thông báo Customer
      this.sendBookingNotification(
        'booking_cancelled_by_worker',
        booking,
        booking.customer.user.email,
        booking.customer.user.fullName,
      );
    }

    return toBookingResponseDto(await this.findBookingOrFail(booking.id));
  }

  // ─── ĐÁNH GIÁ BOOKING ─────────────────────────────────

  async reviewBooking(
    bookingId: string,
    dto: ReviewBookingDto,
    userId: string,
  ): Promise<BookingResponseDto> {
    const booking = await this.findBookingOrFail(bookingId);

    // Chỉ Customer mới đánh giá
    if (booking.customer.user.id !== userId) {
      throw new ForbiddenException('Bạn không có quyền đánh giá booking này');
    }

    // Chỉ đánh giá khi COMPLETED
    if (booking.status !== BookingStatus.COMPLETED) {
      throw new BadRequestException(
        'Chỉ có thể đánh giá booking đã hoàn thành',
      );
    }

    // Kiểm tra đã đánh giá chưa
    if (booking.rating) {
      throw new BadRequestException('Booking này đã được đánh giá rồi');
    }

    booking.rating = dto.rating;
    booking.review = dto.review;

    await this.bookingRepository.save(booking);

    // Cập nhật avgRating cho worker
    await this.updateWorkerAvgRating(booking.workerService.worker.id);

    return toBookingResponseDto(await this.findBookingOrFail(booking.id));
  }

  // ─── CẬP NHẬT THANH TOÁN (cho nhánh payment) ──────────

  async updatePayment(
    bookingId: string,
    dto: UpdatePaymentDto,
  ): Promise<BookingResponseDto> {
    const booking = await this.findBookingOrFail(bookingId);

    if (dto.paymentStatus !== undefined) {
      booking.paymentStatus = dto.paymentStatus;
    }
    if (dto.paymentMethod !== undefined) {
      booking.paymentMethod = dto.paymentMethod;
    }
    if (dto.transactionId !== undefined) {
      booking.transactionId = dto.transactionId;
    }
    if (dto.paymentData !== undefined) {
      booking.paymentData = dto.paymentData;
    }

    await this.bookingRepository.save(booking);

    return toBookingResponseDto(await this.findBookingOrFail(booking.id));
  }

  // ─── PRIVATE HELPERS ───────────────────────────────────

  private async findBookingOrFail(id: string): Promise<BookingEntity> {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: this.bookingRelations,
    });
    if (!booking) {
      throw new NotFoundException('Không tìm thấy booking');
    }
    return booking;
  }

  private assertBookingAccess(
    booking: BookingEntity,
    userId: string,
    userRole: UserRole,
  ): void {
    if (userRole === UserRole.ADMIN) return;

    const isCustomer = booking.customer.user.id === userId;
    const isWorker = booking.workerService.worker.user.id === userId;

    if (!isCustomer && !isWorker) {
      throw new ForbiddenException('Bạn không có quyền truy cập booking này');
    }
  }

  private async updateWorkerAvgRating(workerId: string): Promise<void> {
    const result = await this.bookingRepository
      .createQueryBuilder('booking')
      .select('AVG(booking.rating)', 'avg')
      .leftJoin('booking.workerService', 'ws')
      .where('ws.worker_id = :workerId', { workerId })
      .andWhere('booking.rating IS NOT NULL')
      .getRawOne<{ avg: string }>();

    const avgRating = result?.avg ? parseFloat(result.avg) : 0;

    await this.bookingRepository.manager
      .getRepository('worker_profiles')
      .update({ id: workerId }, { avgRating: Math.round(avgRating * 10) / 10 });
  }

  private sendBookingNotification(
    type: string,
    booking: BookingEntity,
    toEmail: string,
    toName: string,
  ): void {
    const serviceName = booking.workerService?.service?.name || 'Dịch vụ';

    const subjectMap: Record<string, string> = {
      new_booking: `Bạn có booking mới: ${serviceName}`,
      booking_confirmed: `Booking "${serviceName}" đã được xác nhận`,
      booking_in_progress: `Dịch vụ "${serviceName}" đang được thực hiện`,
      booking_completed: `Dịch vụ "${serviceName}" đã hoàn thành`,
      booking_cancelled_by_customer: `Khách hàng đã hủy booking "${serviceName}"`,
      booking_cancelled_by_worker: `Booking "${serviceName}" đã bị hủy`,
    };

    const subject = subjectMap[type] || 'Thông báo booking';

    this.mailService
      .sendBookingNotificationEmail(toEmail, toName, subject, {
        serviceName,
        bookingId: booking.id,
        status: booking.status,
        bookingType: booking.bookingType,
        address: booking.address,
        scheduledDate: booking.scheduledDate,
        scheduledTime: booking.scheduledTime,
        totalPrice: Number(booking.totalPrice),
      })
      .catch((err: Error) => {
        this.logger.error(
          `Gửi email thông báo booking thất bại: ${err.message}`,
        );
      });
  }
}
