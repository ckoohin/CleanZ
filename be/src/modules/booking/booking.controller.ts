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
  @ApiOperation({ summary: 'Customer tạo yêu cầu dịch vụ' })
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
  @ApiOperation({ summary: 'Customer xem báo giá trước khi tạo booking' })
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
  @ApiOperation({ summary: 'Tasker xem danh sách booking đang chờ nhận' })
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
      'Tasker xem chi tiết booking posted gồm khoảng cách, dịch vụ, giá, ngày giờ',
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
    summary: 'Tasker pick/nhận booking đang ở trạng thái posted',
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
    summary: 'Tasker xem chi tiết booking đã nhận',
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
    summary: 'Tasker chuyển booking sang trạng thái đang tới',
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

  @Post('admin/expire-overdue')
  @AdminOnly()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Xử lý booking quá hạn',
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
    summary: 'Customer hủy booking ở trạng thái POSTED hoặc CONFIRMED',
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

  @Get(':id')
  @Auth(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Customer xem chi tiết booking của chính mình' })
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
      'Customer đổi địa chỉ, ngày và giờ khi booking chưa có tasker nhận',
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
