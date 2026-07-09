import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { BookingSource } from 'src/common/enums/booking-source.enum';
import { BookingStatus } from 'src/common/enums/booking-status.enum';
import { NotificationType } from 'src/common/enums/notification-type.enum';
import { NotificationRefType } from 'src/common/enums/notification-ref-type.enum';
import { PaymentMethod } from 'src/common/enums/payment-method.enum';
import { PaymentStatus } from 'src/common/enums/payment-status.enum';
import { generateOrderCode } from 'src/common/helpers/generate-code';
import { toNumber } from 'src/common/helpers/number.helper';
import {
  formatVietnamDate,
  formatVietnamTime,
} from 'src/common/helpers/vietnam-time.helper';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { CustomerAddressEntity } from 'src/modules/customer/entity/customer-address.entity';
import { CustomerEntity } from 'src/modules/customer/entity/customer.entity';
import { TaskerEntity } from 'src/modules/tasker/entity/tasker.entity';
import { UserEntity } from 'src/modules/users/entities/user.entity';
import { NotificationService } from 'src/modules/notification/notification.service';
import { PaymentService } from 'src/modules/payment/payment.service';
import {
  AvailableVoucherItem,
  VouchersService,
} from 'src/modules/voucher/services/vouchers.service';
import { TaskerDepositService } from 'src/modules/wallet/tasker-deposit.service';
import { CreateBookingForCustomerDto } from '../dto/create-booking-for-customer.dto';
import { BookingStatusLogEntity } from '../entity/booking-status-log.entity';
import { BookingSubServiceEntity } from '../entity/booking-sub-service.entity';
import { BookingEntity } from '../entity/booking.entity';
import { saveBookingAddons } from '../helpers/save-booking-addons.helper';
import { BookingLocationPolicyService } from './booking-location-policy.service';
import { BookingPolicyService } from './booking-policy.service';
import { PricingService } from 'src/modules/pricing/services/pricing.service';

const CONFIRMATION_DEADLINE_MINUTES = 15;
const DEFAULT_PAYMENT_METHOD = PaymentMethod.CASH;
const DEFAULT_PLATFORM_COMMISSION_RATE = 20;

export interface TaskerCreatedBookingResponse {
  id: string;
  bookingCode: string;
  status: BookingStatus;
  source: BookingSource;
  // null cho đơn offline/vãng lai (guest) — vào thẳng CONFIRMED, không chờ xác nhận.
  confirmationDeadline: Date | null;
  customer: {
    // null khi là khách vãng lai chưa có tài khoản.
    id: string | null;
    fullName: string;
  };
  tasker: {
    id: string;
    fullName: string | null;
  };
  service: {
    id: string;
    name: string;
  };
  address: {
    fullAddress: string;
    hasPet: boolean;
  };
  schedule: {
    scheduledStartDate: string | null | undefined;
    scheduledStartTime: string | null | undefined;
    scheduledEndDate: string | null | undefined;
    scheduledEndTime: string | null | undefined;
    durationHours: number;
  };
  price: {
    basePrice: number;
    addonPrice: number;
    peakFee: number;
    petFee: number;
    discountAmount: number;
    totalPrice: number;
  };
  payment: {
    method: PaymentMethod;
    status: PaymentStatus;
  };
  voucher: {
    id: string;
    code: string;
    name: string;
  } | null;
  note: string | null;
  createdAt: Date;
}

@Injectable()
export class TaskerCreateBookingService {
  private readonly logger = new Logger(TaskerCreateBookingService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly bookingPolicyService: BookingPolicyService,
    private readonly bookingLocationPolicyService: BookingLocationPolicyService,
    private readonly pricingService: PricingService,
    private readonly paymentService: PaymentService,
    private readonly notificationService: NotificationService,
    private readonly vouchersService: VouchersService,
    private readonly taskerDepositService: TaskerDepositService,
  ) {}

  async createForCustomer(
    taskerUserId: string,
    dto: CreateBookingForCustomerDto,
  ): Promise<TaskerCreatedBookingResponse> {
    return asyncHandleOperation(async () => {
      // 1. Validate tasker
      const tasker = await this.findAndValidateTasker(taskerUserId);

      // 2. Tra cứu customer theo SĐT. Nếu chưa có tài khoản mà tasker nhập tên
      //    khách → tạo đơn offline/vãng lai (guest), không gắn customer.
      const { customer, customerUser, isGuest, guestName, guestPhone } =
        await this.resolveBookingCustomer(dto);

      // 3. Resolve địa chỉ (guest không có địa chỉ đã lưu → dùng free-text)
      const { addressRef, bookingAddress } = await this.resolveAddress(
        dto,
        customer?.id ?? null,
      );

      // 4. Validate coverage area
      const locationDraft = {
        packageId: dto.packageId,
        addressId: dto.addressId,
        address: dto.address,
        hasPet: dto.hasPet,
      };
      await this.bookingLocationPolicyService.assertSupportedBookingArea(
        this.dataSource.manager,
        locationDraft,
        bookingAddress,
        addressRef,
      );

      // 5. Tính schedule — cho phép now() nếu không truyền giờ
      const { scheduledStart, scheduledStartDate, scheduledStartTime } =
        this.resolveSchedule(dto);
      // 6. Tính giá
      const hasPet = dto.hasPet ?? addressRef?.hasPet ?? false;
      const price = await this.pricingService.calculateBookingPrice(
        this.dataSource.manager,
        {
          packageId: dto.packageId,
          addonIds: dto.addonIds,
          durationHours: dto.durationHours,
          areaM2: dto.areaM2,
          pricingTierId: dto.pricingTierId,
          scheduledStart,
          scheduledStartTime,
          hasPet,
          // Guest không áp voucher (voucher gắn theo tài khoản khách).
          voucherCode: isGuest ? undefined : dto.voucherCode,
          customerId: customer?.id,
        },
      );
      const durationHours = price.durationHours;
      // Recalculate end if pricing changed duration
      const finalScheduledEnd = new Date(
        scheduledStart.getTime() + durationHours * 60 * 60 * 1000,
      );
      const finalScheduledEndDate = formatVietnamDate(finalScheduledEnd);
      const finalScheduledEndTime = formatVietnamTime(finalScheduledEnd);

      const paymentMethod = dto.paymentMethod ?? DEFAULT_PAYMENT_METHOD;
      const confirmationDeadline = new Date(
        Date.now() + CONFIRMATION_DEADLINE_MINUTES * 60 * 1000,
      );

      // 7. Transaction: tạo booking
      let createdBookingId: string | undefined;
      const customerUserId: string | undefined = customerUser?.id;

      const result = await this.dataSource.transaction(async (manager) => {
        const bookingRepository = manager.getRepository(BookingEntity);

        // Cùng ràng buộc như luồng customer tự đặt: mỗi khách chỉ được có 1 đơn
        // chưa kết thúc tại một thời điểm — chặn ngay lúc tasker tạo hộ.
        // Guest chưa có tài khoản nên không áp ràng buộc này.
        if (!isGuest && customer) {
          await this.bookingPolicyService.assertCustomerCanCreateBooking(
            manager,
            customer.id,
          );
        }

        const bookingCode =
          await this.generateUniqueBookingCode(bookingRepository);

        const booking = bookingRepository.create({
          bookingCode,
          // Guest: không gắn customer, lưu tên+SĐT khách trực tiếp trên đơn.
          customer: customer ?? null,
          guestName: isGuest ? (guestName ?? null) : null,
          guestPhone: isGuest ? (guestPhone ?? null) : null,
          tasker,
          packageId: price.package.id,
          address: bookingAddress,
          addressRef: addressRef ?? undefined,
          // Giữ toạ độ đích trực tiếp trên đơn để tracking hoạt động cả khi
          // không có addressRef (đơn guest dùng địa chỉ free-text từ Goong).
          latitude: addressRef?.latitude ?? dto.latitude ?? null,
          longitude: addressRef?.longitude ?? dto.longitude ?? null,
          note: dto.note,
          scheduledStart,
          scheduledEnd: finalScheduledEnd,
          scheduledStartDate,
          scheduledStartTime,
          scheduledEndDate: finalScheduledEndDate,
          scheduledEndTime: finalScheduledEndTime,
          durationHours,
          areaM2: dto.areaM2,
          pricingTierId: price.pricingTierId,
          addonIds: price.addons.map((addon) => addon.id),
          // Guest vào thẳng CONFIRMED (offline, không cần khách xác nhận);
          // đơn cho khách có tài khoản vẫn chờ khách xác nhận như cũ.
          status: isGuest
            ? BookingStatus.CONFIRMED
            : BookingStatus.PENDING_CUSTOMER_CONFIRMATION,
          source: BookingSource.TASKER_CREATED,
          confirmationDeadline: isGuest ? null : confirmationDeadline,
          basePrice: price.basePrice,
          addonPrice: price.addonPrice,
          peakFee: price.peakFee,
          petFee: price.petFee,
          waitingFee: price.waitingFee,
          discountAmount: price.discountAmount,
          totalPrice: price.totalPrice,
          paymentMethod,
          paymentStatus: PaymentStatus.PENDING,
          voucherId: isGuest ? null : (price.voucher?.id ?? null),
          isRecurring: false,
        });

        // Đồng bộ hasPet về địa chỉ đã lưu khi tasker tích tay khác với cấu hình
        // hiện tại — giống luồng customer tự đặt.
        if (
          addressRef &&
          typeof dto.hasPet === 'boolean' &&
          addressRef.hasPet !== dto.hasPet
        ) {
          addressRef.hasPet = dto.hasPet;
          await manager.getRepository(CustomerAddressEntity).save(addressRef);
        }

        // Guest vào thẳng CONFIRMED (không có bước khách xác nhận) nên phải
        // chạy đúng các guard mà luồng customer-confirm chạy: chống tasker trùng
        // lịch và (CASH) kiểm tra tasker đủ cọc trả hoa hồng nền tảng.
        if (isGuest) {
          await this.bookingPolicyService.assertTaskerConcurrentAndOverlapConstraints(
            manager,
            tasker.id,
            booking,
          );
          if (paymentMethod === PaymentMethod.CASH) {
            const subServiceId = price.subServices[0]?.id;
            let commissionRate = DEFAULT_PLATFORM_COMMISSION_RATE;
            if (subServiceId) {
              try {
                commissionRate =
                  await this.pricingService.getPlatformCommissionRateByServiceId(
                    manager,
                    subServiceId,
                  );
              } catch {
                commissionRate = DEFAULT_PLATFORM_COMMISSION_RATE;
              }
            }
            const subtotal =
              toNumber(price.totalPrice) + toNumber(price.discountAmount);
            const platformFee = Math.round((subtotal * commissionRate) / 100);
            await this.taskerDepositService.assertCanCoverCashCommission(
              manager,
              tasker.id,
              platformFee,
            );
          }
        }

        const savedBooking = await bookingRepository.save(booking);
        // Voucher gắn theo tài khoản khách → chỉ reserve cho đơn có customer.
        if (!isGuest && customer) {
          await this.vouchersService.reserveForBooking(manager, {
            bookingId: savedBooking.id,
            customerId: customer.id,
            voucherId: savedBooking.voucherId,
          });
        }

        // Snapshot sub-services
        const bookingSubServiceRepository = manager.getRepository(
          BookingSubServiceEntity,
        );
        const bookingSubServices = price.subServices.map((sub) =>
          bookingSubServiceRepository.create({
            booking: savedBooking,
            subServiceId: sub.id,
            price: sub.pricingConfig?.basePrice || 0,
            durationHours: sub.durationHours || 0,
            quantity: 1,
          }),
        );
        if (bookingSubServices.length) {
          await bookingSubServiceRepository.save(bookingSubServices);
        }
        await saveBookingAddons(manager, savedBooking, price.addons);

        // Payment (guest: customer = null)
        await this.paymentService.createPendingPayment(
          manager,
          savedBooking,
          customer ?? null,
          paymentMethod,
          price.totalPrice,
        );

        // Status log
        const statusLog = manager.getRepository(BookingStatusLogEntity).create({
          booking: savedBooking,
          oldStatus: null,
          newStatus: isGuest
            ? BookingStatus.CONFIRMED
            : BookingStatus.PENDING_CUSTOMER_CONFIRMATION,
          changedByUser: { id: taskerUserId } as UserEntity,
          note: isGuest
            ? 'Tasker tạo đơn offline cho khách vãng lai'
            : 'Tasker tạo đơn cho khách',
          cancellationFee: 0,
          refundAmount: 0,
        });
        await manager.getRepository(BookingStatusLogEntity).save(statusLog);

        createdBookingId = savedBooking.id;
        return savedBooking;
      });

      // 8. Notify customer — guest không có tài khoản để nhận thông báo.
      if (createdBookingId && !isGuest && customerUserId) {
        void this.notificationService
          .notify({
            userId: customerUserId,
            type: NotificationType.BOOKING_PENDING_CONFIRMATION,
            title: 'Tasker muốn tạo đơn cho bạn',
            content: `Tasker ${tasker.user?.fullName ?? ''} đã tạo đơn ${result.bookingCode} cho bạn. Xác nhận trong ${CONFIRMATION_DEADLINE_MINUTES} phút.`,
            referenceType: NotificationRefType.BOOKING,
            referenceId: createdBookingId,
            dedupeKey: `booking:${createdBookingId}:${NotificationType.BOOKING_PENDING_CONFIRMATION}`,
          })
          .catch((err) =>
            this.logger.error(
              `Không thể gửi thông báo cho customer booking=${createdBookingId}: ${err}`,
            ),
          );
      }

      return {
        id: result.id,
        bookingCode: result.bookingCode,
        status: result.status,
        source: result.source,
        confirmationDeadline: result.confirmationDeadline ?? null,
        customer: {
          id: customer?.id ?? null,
          fullName: customerUser?.fullName ?? guestName ?? '',
        },
        tasker: {
          id: tasker.id,
          fullName: tasker.user?.fullName ?? null,
        },
        service: {
          id: price.package.id,
          name: price.package.name,
        },
        address: {
          fullAddress: bookingAddress,
          hasPet,
        },
        schedule: {
          scheduledStartDate,
          scheduledStartTime,
          scheduledEndDate: finalScheduledEndDate,
          scheduledEndTime: finalScheduledEndTime,
          durationHours,
        },
        price: {
          basePrice: price.basePrice,
          addonPrice: price.addonPrice,
          peakFee: price.peakFee,
          petFee: price.petFee,
          discountAmount: price.discountAmount,
          totalPrice: price.totalPrice,
        },
        payment: {
          method: paymentMethod,
          status: PaymentStatus.PENDING,
        },
        voucher: price.voucher
          ? {
              id: price.voucher.id,
              code: price.voucher.code,
              name: price.voucher.name,
            }
          : null,
        note: dto.note ?? null,
        createdAt: result.createdAt,
      };
    }, 'Không thể tạo đơn cho khách hàng');
  }

  async findAvailableVouchersForCustomer(
    taskerUserId: string,
    customerPhone: string,
    packageId?: string,
  ): Promise<AvailableVoucherItem[]> {
    return asyncHandleOperation(async () => {
      await this.findAndValidateTasker(taskerUserId);
      const { customer } = await this.findCustomerByPhone(customerPhone);

      return this.vouchersService.findAvailableForCustomerId(
        customer.id,
        packageId,
      );
    }, 'Không thể lấy voucher khả dụng của khách hàng');
  }

  private async findAndValidateTasker(userId: string): Promise<TaskerEntity> {
    const tasker = await this.dataSource
      .getRepository(TaskerEntity)
      .findOne({ where: { user: { id: userId } }, relations: ['user'] });

    if (!tasker) {
      throw new NotFoundException('Không tìm thấy hồ sơ tasker');
    }

    this.bookingPolicyService.assertTaskerCanCreateBookingForCustomer(tasker);
    return tasker;
  }

  private async findCustomerByPhone(
    phone: string,
  ): Promise<{ customer: CustomerEntity; customerUser: UserEntity }> {
    const user = await this.dataSource
      .getRepository(UserEntity)
      .findOne({ where: { phone } });

    if (!user || !user.isActive) {
      throw new NotFoundException(
        'Không tìm thấy khách hàng với số điện thoại này',
      );
    }

    const customer = await this.dataSource
      .getRepository(CustomerEntity)
      .findOne({ where: { user: { id: user.id } } });

    if (!customer) {
      throw new NotFoundException(
        'Số điện thoại này chưa đăng ký tài khoản khách hàng',
      );
    }

    return { customer, customerUser: user };
  }

  /**
   * Phân giải khách cho đơn tasker tạo hộ.
   * - Có tài khoản khách hợp lệ → luồng thường (isGuest=false).
   * - Chưa có tài khoản mà tasker nhập tên khách → đơn offline/vãng lai
   *   (isGuest=true, customer=null, lưu guestName/guestPhone trên đơn).
   * - Chưa có tài khoản và không có tên khách → ném NotFound như cũ.
   */
  private async resolveBookingCustomer(
    dto: CreateBookingForCustomerDto,
  ): Promise<{
    customer: CustomerEntity | null;
    customerUser: UserEntity | null;
    isGuest: boolean;
    guestName?: string;
    guestPhone?: string;
  }> {
    const phone = dto.customerPhone;
    const user = await this.dataSource
      .getRepository(UserEntity)
      .findOne({ where: { phone } });

    const customer =
      user && user.isActive
        ? await this.dataSource
            .getRepository(CustomerEntity)
            .findOne({ where: { user: { id: user.id } } })
        : null;

    if (user && user.isActive && customer) {
      return { customer, customerUser: user, isGuest: false };
    }

    const guestName = dto.customerName?.trim();
    if (guestName) {
      return {
        customer: null,
        customerUser: null,
        isGuest: true,
        guestName,
        guestPhone: phone,
      };
    }

    throw new NotFoundException(
      'Không tìm thấy khách hàng với số điện thoại này. Nhập tên khách để tạo đơn cho khách vãng lai.',
    );
  }

  private async resolveAddress(
    dto: CreateBookingForCustomerDto,
    customerId: string | null,
  ): Promise<{
    addressRef: CustomerAddressEntity | null;
    bookingAddress: string;
  }> {
    const addressRepository = this.dataSource.getRepository(
      CustomerAddressEntity,
    );

    if (dto.addressId && customerId) {
      const addressRef = await addressRepository.findOne({
        where: { id: dto.addressId, customer: { id: customerId } },
      });
      if (!addressRef) {
        throw new NotFoundException(
          'Địa chỉ không tồn tại hoặc không thuộc khách hàng này',
        );
      }
      return { addressRef, bookingAddress: addressRef.fullAddress };
    }

    if (dto.address) {
      // Chỉ lưu vào sổ địa chỉ khi có customer (guest không có sổ địa chỉ).
      if (
        customerId &&
        typeof dto.latitude === 'number' &&
        typeof dto.longitude === 'number'
      ) {
        const addressRef = await addressRepository.save(
          addressRepository.create({
            customer: { id: customerId } as CustomerEntity,
            label: 'Địa chỉ đặt hộ',
            fullAddress: dto.address,
            latitude: dto.latitude,
            longitude: dto.longitude,
            hasPet: dto.hasPet ?? false,
            isDefault: false,
          }),
        );
        return { addressRef, bookingAddress: addressRef.fullAddress };
      }

      return { addressRef: null, bookingAddress: dto.address };
    }

    // Guest bắt buộc nhập địa chỉ (không có sổ địa chỉ mặc định).
    if (!customerId) {
      throw new BadRequestException(
        'Khách vãng lai chưa có địa chỉ. Vui lòng nhập địa chỉ.',
      );
    }

    // Dùng địa chỉ mặc định của customer
    const defaultAddress = await addressRepository.findOne({
      where: { customer: { id: customerId }, isDefault: true },
      order: { createdAt: 'DESC' },
    });

    if (!defaultAddress) {
      throw new BadRequestException(
        'Khách hàng chưa có địa chỉ mặc định. Vui lòng nhập địa chỉ.',
      );
    }

    return {
      addressRef: defaultAddress,
      bookingAddress: defaultAddress.fullAddress,
    };
  }

  private resolveSchedule(dto: CreateBookingForCustomerDto): {
    scheduledStart: Date;
    scheduledEnd: Date;
    scheduledStartDate: string;
    scheduledStartTime: string;
    scheduledEndDate: string;
    scheduledEndTime: string;
  } {
    let scheduledStart: Date;

    if (dto.scheduledDate && dto.scheduledTime) {
      const parsed = new Date(
        `${dto.scheduledDate}T${dto.scheduledTime}:00+07:00`,
      );
      if (Number.isNaN(parsed.getTime())) {
        throw new BadRequestException('Thời gian bắt đầu không hợp lệ');
      }
      if (parsed <= new Date()) {
        throw new BadRequestException('Thời gian đặt lịch phải ở tương lai');
      }
      scheduledStart = parsed;
    } else if (dto.scheduledStart) {
      const parsed = new Date(dto.scheduledStart);
      if (Number.isNaN(parsed.getTime())) {
        throw new BadRequestException('Thời gian bắt đầu không hợp lệ');
      }
      if (parsed <= new Date()) {
        throw new BadRequestException('Thời gian đặt lịch phải ở tương lai');
      }
      scheduledStart = parsed;
    } else {
      // Không truyền giờ → đặt ngay bây giờ
      scheduledStart = new Date();
    }

    // Placeholder end; will be recalculated after pricing resolves durationHours
    const scheduledEnd = scheduledStart;

    return {
      scheduledStart,
      scheduledEnd,
      scheduledStartDate: formatVietnamDate(scheduledStart),
      scheduledStartTime: formatVietnamTime(scheduledStart),
      scheduledEndDate: formatVietnamDate(scheduledEnd),
      scheduledEndTime: formatVietnamTime(scheduledEnd),
    };
  }

  private async generateUniqueBookingCode(
    bookingRepository: Repository<BookingEntity>,
  ): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const bookingCode = generateOrderCode();
      const existing = await bookingRepository.findOne({
        where: { bookingCode },
      });
      if (!existing) return bookingCode;
    }
    throw new BadRequestException('Không thể tạo mã booking, vui lòng thử lại');
  }
}
