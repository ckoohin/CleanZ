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

@Controller('booking')
@ApiTags('Booking')
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
  @ApiOperation({ summary: '02. Customer tạo yêu cầu dịch vụ' })
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
  @ApiCreatedResponse({ description: 'Tạo booking thành công' })
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
  @ApiOperation({ summary: '01. Customer xem báo giá trước khi tạo booking' })
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
  @ApiOkResponse({ description: 'Báo giá booking thành công' })
  @ApiUnauthorizedResponse({ description: 'Customer chưa đăng nhập' })
  quote(
    @CurrentUser('id') userId: string,
    @Body() quoteBookingDto: QuoteBookingDto,
  ): Promise<CustomerBookingQuoteResponse> {
    return this.customerBookingService.quote(userId, quoteBookingDto);
  }

  @Get('tasker/posted')
  @Auth(UserRole.TASKER)
  @ApiOperation({ summary: '04. Tasker xem danh sách booking đang chờ nhận' })
  @ApiOkResponse({ description: 'Lấy danh sách booking posted thành công' })
  @ApiUnauthorizedResponse({ description: 'Tasker chưa đăng nhập' })
  findPostedBookingsForTasker(
    @CurrentUser('id') userId: string,
  ): Promise<TaskerPostedBookingListResponse> {
    return this.taskerBookingService.findPostedBookings(userId);
  }

  @Get('tasker/posted/:id')
  @Auth(UserRole.TASKER)
  @ApiOperation({
    summary:
      '05. Tasker xem chi tiết booking posted gồm khoảng cách, dịch vụ, giá, ngày giờ',
  })
  @ApiParam({
    name: 'id',
    example: '7b9a2fe1-5a25-4f01-8e5d-54f2625df69f',
  })
  @ApiOkResponse({ description: 'Lấy chi tiết booking posted thành công' })
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
  @ApiOperation({
    summary: '06. Tasker pick/nhận booking đang ở trạng thái posted',
    description:
      'Sau khi pick, booking chuyển sang CONFIRMED. Ở trạng thái này tasker vẫn chỉ xem được thông tin hạn chế, chưa thấy thông tin liên hệ customer.',
  })
  @ApiParam({
    name: 'id',
    example: '7b9a2fe1-5a25-4f01-8e5d-54f2625df69f',
  })
  @ApiOkResponse({ description: 'Tasker nhận booking thành công' })
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
  @ApiOperation({
    summary: '07. Tasker xem chi tiết booking đã nhận',
    description:
      'Nếu booking mới ở CONFIRMED, response có khoảng cách nếu FE gửi tọa độ, giá trị đơn và tên customer, nhưng chưa có số điện thoại, địa chỉ đầy đủ, ghi chú. Từ TASKER_ON_THE_WAY trở đi mới trả địa chỉ đầy đủ, ghi chú và thông tin liên hệ customer.',
  })
  @ApiParam({
    name: 'id',
    example: '7b9a2fe1-5a25-4f01-8e5d-54f2625df69f',
  })
  @ApiOkResponse({ description: 'Lấy chi tiết booking của tasker thành công' })
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
  @ApiOperation({
    summary: '08. Tasker chuyển booking sang trạng thái đang tới',
    description:
      'Chỉ booking ở CONFIRMED mới được chuyển sang TASKER_ON_THE_WAY. Sau bước này tasker mới xem được thông tin liên hệ customer và địa chỉ đầy đủ.',
  })
  @ApiParam({
    name: 'id',
    example: '7b9a2fe1-5a25-4f01-8e5d-54f2625df69f',
  })
  @ApiOkResponse({ description: 'Cập nhật trạng thái thành công' })
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
  @ApiOperation({
    summary: '09. Tasker check-in khi đã đến nơi',
    description:
      'Chỉ booking ở TASKER_ON_THE_WAY mới được chuyển sang CHECKED_IN. Sau bước này hệ thống emit socket tasker:arrived để FE dừng tracking realtime và chuyển sang màn hình tasker đã đến.',
  })
  @ApiParam({
    name: 'id',
    example: '7b9a2fe1-5a25-4f01-8e5d-54f2625df69f',
  })
  @ApiOkResponse({ description: 'Check-in booking thành công' })
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
  @ApiOperation({
    summary: '10. Tasker bắt đầu làm việc',
    description:
      'Chỉ booking ở CHECKED_IN mới được chuyển sang IN_PROGRESS. FE không cần tiếp tục tracking đường đi, chỉ hiển thị thời gian làm việc và thông tin booking.',
  })
  @ApiParam({
    name: 'id',
    example: '7b9a2fe1-5a25-4f01-8e5d-54f2625df69f',
  })
  @ApiOkResponse({ description: 'Bắt đầu booking thành công' })
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
  @ApiOperation({
    summary: '11. Tasker hoàn thành booking',
    description:
      'Chỉ booking ở IN_PROGRESS mới được chuyển sang COMPLETED. Với CASH, hệ thống demo mark payment PAID, cộng ví tasker và ghi phí nền tảng. Với thanh toán online, booking phải PAID trước.',
  })
  @ApiParam({
    name: 'id',
    example: '7b9a2fe1-5a25-4f01-8e5d-54f2625df69f',
  })
  @ApiOkResponse({ description: 'Hoàn thành booking thành công' })
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
  @ApiOperation({
    summary: '03B. Hệ thống xử lý booking quá hạn',
    description:
      'API demo để test luồng hệ thống tự chuyển booking POSTED sang EXPIRED khi đã qua scheduled start mà chưa có tasker nhận. Service này cũng tự chạy nền theo interval.',
  })
  @ApiOkResponse({ description: 'Xử lý booking quá hạn thành công' })
  expireOverduePostedBookings(): Promise<ExpireOverdueBookingsResponse> {
    return this.bookingExpirationService.expireOverduePostedBookings();
  }

  @Patch('/customer/:id/cancel')
  @Auth(UserRole.CUSTOMER)
  @ApiOperation({
    summary: '03C. Customer hủy booking ở trạng thái POSTED hoặc CONFIRMED',
  })
  @ApiParam({
    name: 'id',
    example: '7b9a2fe1-5a25-4f01-8e5d-54f2625df69f',
  })
  @ApiBody({ type: CancelBookingDto })
  @ApiOkResponse({ description: 'Hủy booking thành công' })
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
  @ApiOperation({
    summary: '03D. Customer lấy booking đang hoạt động của chính mình',
    description:
      'Trả về booking active hiện tại nếu có. Active gồm các trạng thái chưa kết thúc: POSTED, CONFIRMED, TASKER_ON_THE_WAY, CHECKED_IN, IN_PROGRESS. Nếu không có booking active, response trả booking = null.',
  })
  @ApiOkResponse({ description: 'Lấy booking đang hoạt động thành công' })
  @ApiUnauthorizedResponse({ description: 'Customer chưa đăng nhập' })
  findMyActiveBooking(
    @CurrentUser('id') userId: string,
  ): Promise<CustomerActiveBookingResponse> {
    return this.customerBookingService.findMyActiveBooking(userId);
  }

  @Get(':id')
  @Auth(UserRole.CUSTOMER)
  @ApiOperation({ summary: '03. Customer xem chi tiết booking của chính mình' })
  @ApiParam({
    name: 'id',
    example: '7b9a2fe1-5a25-4f01-8e5d-54f2625df69f',
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
  @ApiOperation({
    summary:
      '03A. Customer đổi địa chỉ, ngày và giờ khi booking chưa có tasker nhận',
    description:
      'Chỉ cập nhật địa chỉ/lịch làm. Thời lượng vẫn giữ theo service đã chọn của booking, FE không gửi durationHours.',
  })
  @ApiParam({
    name: 'id',
    example: '7b9a2fe1-5a25-4f01-8e5d-54f2625df69f',
  })
  @ApiBody({ type: UpdateBookingScheduleAddressDto })
  @ApiOkResponse({ description: 'Cập nhật booking thành công' })
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
