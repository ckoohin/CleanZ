import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

@Injectable()
export class CustomerBookingService {
  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookingRepository: Repository<BookingEntity>,
  ) {}

  async create(
    userId: string,
    createBookingDto: CreateBookingDto,
  ): Promise<BookingResponseDto> {
    return this.bookingRepository.manager.transaction(async (manager) => {
      const txCustomerRepository = manager.getRepository(CustomerEntity);
      const txServiceRepository = manager.getRepository(ServiceEntity);
      const txBookingRepository = manager.getRepository(BookingEntity);

      const customer = await txCustomerRepository.findOne({
        where: { user: { id: userId } },
        relations: ['user'],
      });

      if (!customer) {
        throw new NotFoundException('Customer profile không tồn tại');
      }
      const activeBooking = await txBookingRepository
        .createQueryBuilder('booking')
        .where('booking.customer_id = :customerId', { customerId: customer.id })
        .andWhere('booking.status IN (:...statuses)', {
          statuses: [
            BookingStatus.PENDING,
            BookingStatus.CONFIRMED,
            BookingStatus.IN_PROGRESS,
          ],
        })
        .setLock('pessimistic_write')
        .getOne();

      if (activeBooking) {
        throw new ConflictException(
          'Bạn đã có booking đang hoạt động. Vui lòng hoàn thành hoặc hủy booking hiện tại trước khi tạo booking mới.',
        );
      }

      // check service (Chỉ lấy dv đang active, dv hỗ trợ thep locationType)
      const service = await txServiceRepository.findOne({
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

      if (bookingDateTime < now) {
        throw new BadRequestException(
          'Ngày và giờ đặt lịch phải lớn hơn thời điểm hiện tại',
        );
      }

      if (!createBookingDto.estimatedHours) {
        throw new BadRequestException(
          'Số giờ ước tính là bắt buộc để tính giá dịch vụ',
        );
      }

      const hourlyRate = Number(service.basePrice);
      const basePrice = hourlyRate * createBookingDto.estimatedHours;

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
      const booking = txBookingRepository.create({
        orderCode,
        customer,
        service,
        locationType: createBookingDto.locationType,
        address: createBookingDto.address,
        bookingDate: new Date(createBookingDto.bookingDate),
        bookingTime: createBookingDto.bookingTime,
        estimatedHours: createBookingDto.estimatedHours,
        hourlyRate: hourlyRate,
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
      const savedBooking = await txBookingRepository.save(booking);
      const bookingWithRelations = await txBookingRepository.findOne({
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
    });
  }
}
