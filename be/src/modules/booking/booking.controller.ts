import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UserRole } from 'src/common/enums/user-role.enum';
import { AdminOnly } from '../auth/decorators/admin-only.decorator';
import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { QuoteBookingDto } from './dto/quote-booking.dto';
import {
  OptionalTaskerBookingLocationDto,
  TaskerBookingLocationDto,
} from './dto/tasker-booking-location.dto';
import { UpdateBookingScheduleAddressDto } from './dto/update-booking-schedule-address.dto';
import {
  CustomerActiveBookingResponse,
  CustomerBookingCreatedResponse,
  CustomerBookingDetailResponse,
  CustomerBookingQuoteResponse,
  CustomerBookingService,
} from './services/customer-booking.service';
import {
  TaskerAcceptBookingResponse,
  TaskerAssignedBookingDetailResponse,
  TaskerBookingService,
  TaskerPostedBookingDetailResponse,
  TaskerPostedBookingListResponse,
} from './services/tasker-booking.service';
import {
  BookingExpirationService,
  ExpireOverdueBookingsResponse,
} from './services/booking-expiration.service';
import {
  CUSTOMER_ACTIVE_BOOKING_SCHEMA,
  CUSTOMER_BOOKING_DETAIL_SCHEMA,
  CUSTOMER_BOOKING_QUOTE_SCHEMA,
  EXPIRE_OVERDUE_BOOKINGS_SCHEMA,
  TASKER_ACCEPT_BOOKING_SCHEMA,
  TASKER_ASSIGNED_BOOKING_SCHEMA,
  TASKER_POSTED_BOOKING_DETAIL_SCHEMA,
  TASKER_POSTED_BOOKING_LIST_SCHEMA,
} from './swagger/booking-response.schemas';

@Controller('booking')
@ApiBearerAuth('access-token')
export class BookingController {
  constructor(
    private readonly bookingExpirationService: BookingExpirationService,
    private readonly customerBookingService: CustomerBookingService,
    private readonly taskerBookingService: TaskerBookingService,
  ) {}

  @Post()
  @Auth(UserRole.CUSTOMER)
  @HttpCode(HttpStatus.CREATED)
  @ApiTags('Booking – Customer Flow')
  @ApiOperation({
    summary: 'Customer step 2 — Tạo booking',
    description:
      'Thực hiện sau bước báo giá. Booking mới có trạng thái POSTED và chờ tasker nhận. Response trả snapshot dịch vụ, lịch, giá, thanh toán và voucher tại thời điểm tạo.',
  })
  @ApiBody({
    type: CreateBookingDto,
    examples: {
      byService: {
        summary: 'Tạo booking theo gói service',
        description:
          'FE chỉ cần truyền serviceId. Thời lượng lấy từ services.base_duration_hours, giá lấy từ pricing_configs theo service_id.',
        value: {
          scheduledDate: '2026-06-17',
          scheduledTime: '14:00',
          serviceId: '6224bfaf-ed46-4770-88c0-ff1a645cc279',
          note: 'Nhà có mèo, vui lòng gọi trước khi tới.',
        },
      },
      byDefaultAddressAndCash: {
        summary: 'Dùng địa chỉ mặc định và thanh toán tiền mặt',
        value: {
          scheduledDate: '2026-06-17',
          scheduledTime: '14:00',
          serviceId: '6224bfaf-ed46-4770-88c0-ff1a645cc279',
          paymentMethod: 'CASH',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Booking được tạo với trạng thái POSTED',
    schema: CUSTOMER_BOOKING_DETAIL_SCHEMA,
  })
  @ApiUnauthorizedResponse({ description: 'Customer chưa đăng nhập' })
  create(
    @CurrentUser('id') userId: string,
    @Body() createBookingDto: CreateBookingDto,
  ): Promise<CustomerBookingCreatedResponse> {
    return this.customerBookingService.create(userId, createBookingDto);
  }

  @Post('quote')
  @Auth(UserRole.CUSTOMER)
  @HttpCode(HttpStatus.OK)
  @ApiTags('Booking – Customer Flow')
  @ApiOperation({
    summary: 'Customer step 1 — Xem báo giá',
    description:
      'Bước đầu tiên của customer. API kiểm tra địa chỉ, khu vực hỗ trợ, thời lượng service, giờ cao điểm, thú cưng và voucher; không tạo booking hay payment.',
  })
  @ApiBody({
    type: QuoteBookingDto,
    examples: {
      byService: {
        summary: 'Báo giá theo gói service',
        description:
          'Không cần truyền durationHours khi đã chọn serviceId. petFee lấy theo địa chỉ có has_pet, phụ phí giờ cao điểm lấy từ peak_day_configs.',
        value: {
          scheduledDate: '2026-06-17',
          scheduledTime: '14:00',
          serviceId: '6224bfaf-ed46-4770-88c0-ff1a645cc279',
          note: 'Nhà có mèo, vui lòng gọi trước khi tới.',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Trả lịch dự kiến và chi tiết các thành phần giá',
    schema: CUSTOMER_BOOKING_QUOTE_SCHEMA,
  })
  @ApiUnauthorizedResponse({ description: 'Customer chưa đăng nhập' })
  quote(
    @CurrentUser('id') userId: string,
    @Body() quoteBookingDto: QuoteBookingDto,
  ): Promise<CustomerBookingQuoteResponse> {
    return this.customerBookingService.quote(userId, quoteBookingDto);
  }

  @Get('tasker/posted')
  @Auth(UserRole.TASKER)
  @ApiTags('Booking – Tasker Flow')
  @ApiOperation({
    summary: 'Tasker step 1 — Xem danh sách booking đang chờ nhận',
    description:
      'Chỉ trả booking POSTED chưa có tasker. Thông tin địa chỉ được giới hạn ở khu vực công khai, chưa trả thông tin liên hệ customer.',
  })
  @ApiOkResponse({
    description: 'Danh sách booking khả dụng cho tasker',
    schema: TASKER_POSTED_BOOKING_LIST_SCHEMA,
  })
  @ApiUnauthorizedResponse({ description: 'Tasker chưa đăng nhập' })
  findPostedBookingsForTasker(
    @CurrentUser('id') userId: string,
  ): Promise<TaskerPostedBookingListResponse> {
    return this.taskerBookingService.findPostedBookings(userId);
  }

  @Get('tasker/posted/:id')
  @Auth(UserRole.TASKER)
  @ApiTags('Booking – Tasker Flow')
  @ApiOperation({
    summary: 'Tasker step 2 — Xem chi tiết booking đang chờ nhận',
    description:
      'FE gửi tọa độ hiện tại của tasker. Response trả khoảng cách, dịch vụ, giá và lịch; chưa trả địa chỉ đầy đủ hoặc thông tin liên hệ customer.',
  })
  @ApiParam({
    name: 'id',
    example: '7b9a2fe1-5a25-4f01-8e5d-54f2625df69f',
  })
  @ApiOkResponse({
    description: 'Chi tiết công khai của booking POSTED',
    schema: TASKER_POSTED_BOOKING_DETAIL_SCHEMA,
  })
  @ApiNotFoundResponse({
    description: 'Booking không tồn tại hoặc không còn ở trạng thái posted',
  })
  @ApiUnauthorizedResponse({ description: 'Tasker chưa đăng nhập' })
  findPostedBookingDetailForTasker(
    @CurrentUser('id') userId: string,
    @Param('id') bookingId: string,
    @Query() location: TaskerBookingLocationDto,
  ): Promise<TaskerPostedBookingDetailResponse> {
    return this.taskerBookingService.findPostedBookingDetail(
      userId,
      bookingId,
      location,
    );
  }

  @Post('tasker/posted/:id/accept')
  @Auth(UserRole.TASKER)
  @HttpCode(HttpStatus.OK)
  @ApiTags('Booking – Tasker Flow')
  @ApiOperation({
    summary: 'Tasker step 3 — Nhận booking',
    description:
      'Sau khi pick, booking chuyển sang CONFIRMED. Ở trạng thái này tasker vẫn chỉ xem được thông tin hạn chế, chưa thấy thông tin liên hệ customer.',
  })
  @ApiParam({
    name: 'id',
    example: '7b9a2fe1-5a25-4f01-8e5d-54f2625df69f',
  })
  @ApiOkResponse({
    description: 'Booking chuyển POSTED → CONFIRMED',
    schema: TASKER_ACCEPT_BOOKING_SCHEMA,
  })
  @ApiNotFoundResponse({ description: 'Booking không tồn tại' })
  @ApiUnauthorizedResponse({ description: 'Tasker chưa đăng nhập' })
  acceptPostedBooking(
    @CurrentUser('id') userId: string,
    @Param('id') bookingId: string,
  ): Promise<TaskerAcceptBookingResponse> {
    return this.taskerBookingService.acceptPostedBooking(userId, bookingId);
  }

  @Get('tasker/:id')
  @Auth(UserRole.TASKER)
  @ApiTags('Booking – Tasker Flow')
  @ApiOperation({
    summary: 'Tasker step 4 — Xem booking đã nhận',
    description:
      'Nếu booking mới ở CONFIRMED, response có khoảng cách nếu FE gửi tọa độ, giá trị đơn và tên customer, nhưng chưa có số điện thoại, địa chỉ đầy đủ, ghi chú. Từ TASKER_ON_THE_WAY trở đi mới trả địa chỉ đầy đủ, ghi chú và thông tin liên hệ customer.',
  })
  @ApiParam({
    name: 'id',
    example: '7b9a2fe1-5a25-4f01-8e5d-54f2625df69f',
  })
  @ApiOkResponse({
    description:
      'Chi tiết booking; trường liên hệ phụ thuộc trạng thái và canContactCustomer',
    schema: TASKER_ASSIGNED_BOOKING_SCHEMA,
  })
  @ApiNotFoundResponse({
    description: 'Booking không tồn tại hoặc không thuộc tasker hiện tại',
  })
  @ApiUnauthorizedResponse({ description: 'Tasker chưa đăng nhập' })
  findAssignedBookingDetail(
    @CurrentUser('id') userId: string,
    @Param('id') bookingId: string,
    @Query() location: OptionalTaskerBookingLocationDto,
  ): Promise<TaskerAssignedBookingDetailResponse> {
    return this.taskerBookingService.findAssignedBookingDetail(
      userId,
      bookingId,
      location,
    );
  }

  @Patch('tasker/:id/on-the-way')
  @Auth(UserRole.TASKER)
  @ApiTags('Booking – Tasker Flow')
  @ApiOperation({
    summary: 'Tasker step 5 — Bắt đầu di chuyển',
    description:
      'Chỉ booking ở CONFIRMED mới được chuyển sang TASKER_ON_THE_WAY. Sau bước này tasker mới xem được thông tin liên hệ customer và địa chỉ đầy đủ.',
  })
  @ApiParam({
    name: 'id',
    example: '7b9a2fe1-5a25-4f01-8e5d-54f2625df69f',
  })
  @ApiOkResponse({
    description:
      'Booking chuyển CONFIRMED → TASKER_ON_THE_WAY và mở thông tin liên hệ customer',
    schema: TASKER_ASSIGNED_BOOKING_SCHEMA,
  })
  @ApiNotFoundResponse({
    description: 'Booking không tồn tại hoặc không thuộc tasker hiện tại',
  })
  @ApiUnauthorizedResponse({ description: 'Tasker chưa đăng nhập' })
  markTaskerOnTheWay(
    @CurrentUser('id') userId: string,
    @Param('id') bookingId: string,
  ): Promise<TaskerAssignedBookingDetailResponse> {
    return this.taskerBookingService.markOnTheWay(userId, bookingId);
  }

  @Patch('tasker/:id/check-in')
  @Auth(UserRole.TASKER)
  @ApiTags('Booking – Tasker Flow')
  @ApiOperation({
    summary: 'Tasker step 6 — Check-in khi đến nơi',
    description:
      'Chỉ booking ở TASKER_ON_THE_WAY mới được chuyển sang CHECKED_IN. Sau bước này hệ thống emit socket tasker:arrived để FE dừng tracking realtime và chuyển sang màn hình tasker đã đến.',
  })
  @ApiParam({
    name: 'id',
    example: '7b9a2fe1-5a25-4f01-8e5d-54f2625df69f',
  })
  @ApiOkResponse({
    description: 'Booking chuyển TASKER_ON_THE_WAY → CHECKED_IN',
    schema: TASKER_ASSIGNED_BOOKING_SCHEMA,
  })
  @ApiNotFoundResponse({
    description: 'Booking không tồn tại hoặc không thuộc tasker hiện tại',
  })
  @ApiUnauthorizedResponse({ description: 'Tasker chưa đăng nhập' })
  markTaskerCheckedIn(
    @CurrentUser('id') userId: string,
    @Param('id') bookingId: string,
  ): Promise<TaskerAssignedBookingDetailResponse> {
    return this.taskerBookingService.markCheckedIn(userId, bookingId);
  }

  @Patch('tasker/:id/start')
  @Auth(UserRole.TASKER)
  @ApiTags('Booking – Tasker Flow')
  @ApiOperation({
    summary: 'Tasker step 7 — Bắt đầu làm việc',
    description:
      'Chỉ booking ở CHECKED_IN mới được chuyển sang IN_PROGRESS. FE không cần tiếp tục tracking đường đi, chỉ hiển thị thời gian làm việc và thông tin booking.',
  })
  @ApiParam({
    name: 'id',
    example: '7b9a2fe1-5a25-4f01-8e5d-54f2625df69f',
  })
  @ApiOkResponse({
    description: 'Booking chuyển CHECKED_IN → IN_PROGRESS',
    schema: TASKER_ASSIGNED_BOOKING_SCHEMA,
  })
  @ApiNotFoundResponse({
    description: 'Booking không tồn tại hoặc không thuộc tasker hiện tại',
  })
  @ApiUnauthorizedResponse({ description: 'Tasker chưa đăng nhập' })
  markTaskerInProgress(
    @CurrentUser('id') userId: string,
    @Param('id') bookingId: string,
  ): Promise<TaskerAssignedBookingDetailResponse> {
    return this.taskerBookingService.markInProgress(userId, bookingId);
  }

  @Patch('tasker/:id/complete')
  @Auth(UserRole.TASKER)
  @ApiTags('Booking – Tasker Flow')
  @ApiOperation({
    summary: 'Tasker step 8 — Hoàn thành công việc',
    description:
      'Chỉ booking ở IN_PROGRESS mới được chuyển sang COMPLETED. Với CASH, hệ thống đánh dấu PAID, không cộng ví Tasker và khấu trừ phí nền tảng từ ký quỹ. Với thanh toán online, booking phải PAID trước và Tasker nhận phần thu nhập ròng vào ví.',
  })
  @ApiParam({
    name: 'id',
    example: '7b9a2fe1-5a25-4f01-8e5d-54f2625df69f',
  })
  @ApiOkResponse({
    description:
      'Booking chuyển IN_PROGRESS → COMPLETED và thực hiện quyết toán',
    schema: TASKER_ASSIGNED_BOOKING_SCHEMA,
  })
  @ApiNotFoundResponse({
    description: 'Booking không tồn tại hoặc không thuộc tasker hiện tại',
  })
  @ApiUnauthorizedResponse({ description: 'Tasker chưa đăng nhập' })
  markTaskerCompleted(
    @CurrentUser('id') userId: string,
    @Param('id') bookingId: string,
  ): Promise<TaskerAssignedBookingDetailResponse> {
    return this.taskerBookingService.markCompleted(userId, bookingId);
  }

  @Post('admin/expire-overdue')
  @AdminOnly()
  @HttpCode(HttpStatus.OK)
  @ApiTags('Booking – System/Admin Flow')
  @ApiOperation({
    summary: 'System/Admin step 1 — Xử lý booking POSTED quá hạn',
    description:
      'API demo để test luồng hệ thống tự chuyển booking POSTED sang EXPIRED khi đã qua scheduled start mà chưa có tasker nhận. Service này cũng tự chạy nền theo interval.',
  })
  @ApiOkResponse({
    description: 'Số booking đã chuyển POSTED → EXPIRED',
    schema: EXPIRE_OVERDUE_BOOKINGS_SCHEMA,
  })
  expireOverduePostedBookings(): Promise<ExpireOverdueBookingsResponse> {
    return this.bookingExpirationService.expireOverduePostedBookings();
  }

  @Patch('/customer/:id/cancel')
  @Auth(UserRole.CUSTOMER)
  @ApiTags('Booking – Customer Flow')
  @ApiOperation({
    summary: 'Customer optional step — Hủy booking',
    description:
      'Chỉ dùng khi booking đang POSTED hoặc CONFIRMED. Response trả chi tiết booking sau khi chuyển sang CANCELLED.',
  })
  @ApiParam({
    name: 'id',
    example: '7b9a2fe1-5a25-4f01-8e5d-54f2625df69f',
  })
  @ApiBody({ type: CancelBookingDto })
  @ApiOkResponse({
    description: 'Booking sau khi hủy',
    schema: CUSTOMER_BOOKING_DETAIL_SCHEMA,
  })
  @ApiNotFoundResponse({
    description: 'Booking không tồn tại hoặc không thuộc customer hiện tại',
  })
  @ApiUnauthorizedResponse({ description: 'Customer chưa đăng nhập' })
  cancelByCustomer(
    @CurrentUser('id') userId: string,
    @Param('id') bookingId: string,
    @Body() dto: CancelBookingDto,
  ): Promise<CustomerBookingDetailResponse> {
    return this.customerBookingService.cancelByCustomer(userId, bookingId, dto);
  }

  @Get('/my-booking')
  @Auth(UserRole.CUSTOMER)
  @ApiTags('Booking – Customer Flow')
  @ApiOperation({
    summary: 'Customer step 3 — Lấy booking đang hoạt động',
    description:
      'Trả về booking active hiện tại nếu có. Active gồm các trạng thái chưa kết thúc: POSTED, CONFIRMED, TASKER_ON_THE_WAY, CHECKED_IN, IN_PROGRESS. Nếu không có booking active, response trả booking = null.',
  })
  @ApiOkResponse({
    description: 'Trả booking active gần nhất hoặc booking = null',
    schema: CUSTOMER_ACTIVE_BOOKING_SCHEMA,
  })
  @ApiUnauthorizedResponse({ description: 'Customer chưa đăng nhập' })
  findMyActiveBooking(
    @CurrentUser('id') userId: string,
  ): Promise<CustomerActiveBookingResponse> {
    return this.customerBookingService.findMyActiveBooking(userId);
  }

  @Get('/my-bookings')
  @Auth(UserRole.CUSTOMER)
  @ApiTags('Booking – Customer Flow')
  @ApiOperation({ summary: 'Danh sách booking của customer (cho select tạo ticket)' })
  findMyBookings(@CurrentUser('id') userId: string) {
    return this.customerBookingService.findMyBookings(userId);
  }

  @Get(':id')
  @Auth(UserRole.CUSTOMER)
  @ApiTags('Booking – Customer Flow')
  @ApiOperation({
    summary: 'Customer step 4 — Xem chi tiết và theo dõi booking',
    description:
      'Dùng endpoint này để refresh trạng thái, tasker, payment và statusLogs trong suốt vòng đời booking.',
  })
  @ApiParam({
    name: 'id',
    example: '7b9a2fe1-5a25-4f01-8e5d-54f2625df69f',
  })
  @ApiOkResponse({
    description: 'Chi tiết đầy đủ booking thuộc customer hiện tại',
    schema: CUSTOMER_BOOKING_DETAIL_SCHEMA,
  })
  @ApiNotFoundResponse({
    description: 'Booking không tồn tại hoặc không thuộc customer hiện tại',
  })
  @ApiUnauthorizedResponse({ description: 'Customer chưa đăng nhập' })
  findMyBookingDetail(
    @CurrentUser('id') userId: string,
    @Param('id') bookingId: string,
  ): Promise<CustomerBookingDetailResponse> {
    return this.customerBookingService.findMyBookingDetail(userId, bookingId);
  }

  @Patch(':id/schedule-address')
  @Auth(UserRole.CUSTOMER)
  @ApiTags('Booking – Customer Flow')
  @ApiOperation({
    summary: 'Customer optional step — Đổi lịch hoặc địa chỉ',
    description:
      'Chỉ cập nhật địa chỉ/lịch làm. Thời lượng vẫn giữ theo service đã chọn của booking, FE không gửi durationHours.',
  })
  @ApiParam({
    name: 'id',
    example: '7b9a2fe1-5a25-4f01-8e5d-54f2625df69f',
  })
  @ApiBody({ type: UpdateBookingScheduleAddressDto })
  @ApiOkResponse({
    description:
      'Chi tiết booking sau khi tính lại lịch và giá theo địa chỉ mới',
    schema: CUSTOMER_BOOKING_DETAIL_SCHEMA,
  })
  @ApiNotFoundResponse({
    description: 'Booking không tồn tại hoặc không thuộc customer hiện tại',
  })
  @ApiUnauthorizedResponse({ description: 'Customer chưa đăng nhập' })
  updateScheduleAndAddress(
    @CurrentUser('id') userId: string,
    @Param('id') bookingId: string,
    @Body() dto: UpdateBookingScheduleAddressDto,
  ): Promise<CustomerBookingDetailResponse> {
    return this.customerBookingService.updateScheduleAndAddress(
      userId,
      bookingId,
      dto,
    );
  }
}
