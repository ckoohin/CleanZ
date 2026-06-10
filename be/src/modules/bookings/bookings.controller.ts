import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CustomerBookingService } from './customer-booking.service';
import { StaffBookingService } from './staff-booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { AssignStaffDto } from './dto/assign-staff.dto';
import { BookingResponseDto } from './dto/booking-response.dto';
import { GetBookingHistoryQueryDto } from './dto/get-booking-history-query.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import type { AuthUser } from '../auth/types/AuthRequest';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

@ApiTags('Bookings')
@Controller('bookings')
@ApiBearerAuth('access-token')
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly customerBookingService: CustomerBookingService,
    private readonly staffBookingService: StaffBookingService,
  ) {}

  @Get()
  @Auth(UserRole.ADMIN, UserRole.TASKER, UserRole.CUSTOMER)
  @ApiOperation({
    summary: 'Lấy lịch sử booking',
    description:
      'Admin xem toàn bộ. Customer xem booking của mình. Staff xem booking được gán cho mình. Hỗ trợ filter status, khoảng ngày và phân trang.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách booking thành công',
  })
  async getBookingHistory(
    @CurrentUser() currentUser: AuthUser,
    @Query() query: GetBookingHistoryQueryDto,
  ): Promise<PaginatedResponseDto<BookingResponseDto>> {
    return this.bookingsService.getBookingHistory(currentUser, query);
  }

  @Get('available')
  @Auth(UserRole.TASKER)
  @ApiOperation({
    summary: 'Lấy danh sách booking chưa có ai nhận',
    description:
      'Staff xem các booking chưa gán (status=PENDING, staffService=null) và theo service mà staff cung cấp.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách booking thành công',
  })
  async getAvailableBookings(
    @CurrentUser() currentUser: AuthUser,
  ): Promise<BookingResponseDto[]> {
    return this.staffBookingService.getAvailableBookings(currentUser.id);
  }

  @Get(':id')
  @Auth(UserRole.ADMIN, UserRole.TASKER, UserRole.CUSTOMER)
  @ApiOperation({
    summary: 'Lấy chi tiết booking',
    description:
      'Admin có thể xem mọi booking. Customer chỉ xem booking của mình. Staff chỉ xem booking được gán cho mình.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết booking thành công',
    type: BookingResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền xem booking này',
  })
  @ApiResponse({
    status: 404,
    description: 'Booking không tồn tại',
  })
  async getDetailBooking(
    @CurrentUser() currentUser: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<BookingResponseDto> {
    return this.bookingsService.getDetailBooking(id, currentUser);
  }

  @Post()
  @Auth(UserRole.CUSTOMER)
  @ApiOperation({
    summary: 'Tạo booking mới',
    description:
      'Customer tạo booking mới. Booking sẽ ở trạng thái PENDING và chưa có staff được gán.',
  })
  @ApiResponse({
    status: 201,
    description: 'Booking được tạo thành công',
    type: BookingResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ',
  })
  @ApiResponse({
    status: 404,
    description: 'Service không tồn tại',
  })
  @ApiResponse({
    status: 409,
    description: 'Customer đã có booking đang hoạt động',
  })
  async create(
    @CurrentUser() currentUser: AuthUser,
    @Body() createBookingDto: CreateBookingDto,
  ): Promise<BookingResponseDto> {
    return this.customerBookingService.create(currentUser.id, createBookingDto);
  }

  @Patch(':id/cancel')
  @Auth(UserRole.ADMIN, UserRole.CUSTOMER)
  @ApiOperation({
    summary: 'Hủy booking',
    description:
      'Customer chỉ có thể hủy booking ở trạng thái PENDING. Admin có thể hủy booking ở bất kỳ trạng thái nào (trừ COMPLETED và CANCELLED).',
  })
  @ApiResponse({
    status: 200,
    description: 'Hủy booking thành công',
    type: BookingResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Không thể hủy booking ở trạng thái này',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền hủy booking này',
  })
  @ApiResponse({
    status: 404,
    description: 'Booking không tồn tại',
  })
  async cancelBooking(
    @CurrentUser() currentUser: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() cancelBookingDto: CancelBookingDto,
  ): Promise<BookingResponseDto> {
    return this.bookingsService.cancelBooking(
      id,
      currentUser,
      cancelBookingDto,
    );
  }

  @Patch(':id/accept')
  @Auth(UserRole.TASKER)
  @ApiOperation({
    summary: 'Nhận booking',
    description:
      'Staff nhận booking chưa có ai gán. Sau khi nhận, booking chuyển sang trạng thái CONFIRMED và gán staff hiện tại. Các staff khác không thể nhận booking đã có người xác nhận.',
  })
  @ApiResponse({
    status: 200,
    description: 'Nhận booking thành công',
    type: BookingResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Booking không thể nhận (đã có người nhận hoặc đã hủy)',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền nhận booking này (không phục vụ service này)',
  })
  @ApiResponse({
    status: 404,
    description: 'Booking không tồn tại',
  })
  @ApiResponse({
    status: 409,
    description: 'Booking đã có người nhận',
  })
  async acceptBooking(
    @CurrentUser() currentUser: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<BookingResponseDto> {
    return this.staffBookingService.acceptBooking(id, currentUser.id);
  }

  @Patch(':id/assign-staff')
  @Auth(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Gán staff cho booking (Admin)',
    description:
      'Admin gán nhân viên cho booking. Nếu staff chưa đăng ký dịch vụ, lần đầu trả về cảnh báo. Gửi lại với forceAssign=true để bỏ qua cảnh báo và gán luôn.',
  })
  @ApiResponse({
    status: 200,
    description: 'Gán staff thành công',
    type: BookingResponseDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Cảnh báo: staff chưa đăng ký dịch vụ, cần xác nhận lại',
    schema: {
      type: 'object',
      properties: {
        warning: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Booking không tồn tại',
  })
  async assignStaff(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() assignStaffDto: AssignStaffDto,
  ): Promise<BookingResponseDto | { warning: string }> {
    return this.bookingsService.assignStaff(id, assignStaffDto);
  }
}
