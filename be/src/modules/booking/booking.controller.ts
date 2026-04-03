import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { ReviewBookingDto } from './dto/review-booking.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { BookingFilterDto } from './dto/booking-filter.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/AuthRequest';

@Controller('bookings')
@Auth()
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  // POST /bookings — Customer tạo booking mới
  @Post()
  async createBooking(
    @Body() dto: CreateBookingDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.bookingService.createBooking(currentUser.id, dto);
  }

  // GET /bookings — Danh sách bookings (tự filter theo role)
  @Get()
  async getBookings(
    @Query() filterDto: BookingFilterDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.bookingService.getBookings(
      currentUser.id,
      currentUser.role,
      filterDto,
    );
  }

  // GET /bookings/:id — Chi tiết booking
  @Get(':id')
  async getBookingById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.bookingService.getBookingById(
      id,
      currentUser.id,
      currentUser.role,
    );
  }

  // PATCH /bookings/:id/status — Worker cập nhật trạng thái
  @Patch(':id/status')
  async updateBookingStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBookingStatusDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.bookingService.updateBookingStatus(
      id,
      dto,
      currentUser.id,
      currentUser.role,
    );
  }

  // PATCH /bookings/:id/cancel — Hủy booking
  @Patch(':id/cancel')
  async cancelBooking(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelBookingDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.bookingService.cancelBooking(
      id,
      dto,
      currentUser.id,
      currentUser.role,
    );
  }

  // POST /bookings/:id/review — Customer đánh giá
  @Post(':id/review')
  async reviewBooking(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewBookingDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.bookingService.reviewBooking(id, dto, currentUser.id);
  }

  // PATCH /bookings/:id/payment — Cập nhật thanh toán (cho nhánh payment)
  @Patch(':id/payment')
  async updatePayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePaymentDto,
  ) {
    return this.bookingService.updatePayment(id, dto);
  }
}
