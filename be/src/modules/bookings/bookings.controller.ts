import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
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
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  @Auth(UserRole.ADMIN, UserRole.STAFF, UserRole.CUSTOMER)
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

  @Get(':id')
  @Auth(UserRole.ADMIN, UserRole.STAFF, UserRole.CUSTOMER)
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
    return this.bookingsService.create(currentUser.id, createBookingDto);
  }
}
