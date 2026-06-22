import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Query,
  Body,
  NotFoundException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AdminOnly } from 'src/modules/auth/decorators/admin-only.decorator';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import { AdminDashboardRepository } from './repositories/admin-dashboard.repository';
import { AdminCustomerRepository } from './repositories/admin-customer.repository';
import { AdminBookingRepository } from './repositories/admin-booking.repository';
import { UsersService } from 'src/modules/users/users.service';
import {
  DateRangeQueryDto,
  RevenueChartQueryDto,
  BookingDetailsQueryDto,
} from './dto/date-range-query.dto';
import { CustomerQueryDto } from './dto/customer-query.dto';
import { BookingSearchQueryDto } from './dto/booking-search-query.dto';


@AdminOnly()
@Controller('admin')
export class AdminController {
  constructor(
    private readonly dashboardRepo: AdminDashboardRepository,
    private readonly customerRepo: AdminCustomerRepository,
    private readonly bookingRepo: AdminBookingRepository,
    private readonly usersService: UsersService,
  ) {}

  // ─── Dashboard Endpoints ───

  @Get('dashboard/alerts')
  getAlerts() {
    return this.dashboardRepo.getAlerts();
  }

  @Get('dashboard/kpis')
  getKpis(@Query() query: DateRangeQueryDto) {
    return this.dashboardRepo.getKpis(
      new Date(query.fromDate),
      new Date(query.toDate),
    );
  }

  @Get('dashboard/gmv-chart')
  getGmvChart(@Query() query: RevenueChartQueryDto) {
    return this.dashboardRepo.getGmvChart(
      new Date(query.fromDate),
      new Date(query.toDate),
      query.groupBy,
    );
  }

  @Get('dashboard/booking-status-snapshot')
  getBookingStatusSnapshot() {
    return this.dashboardRepo.getBookingStatusSnapshot();
  }

  @Get('dashboard/booking-details')
  getBookingDetails(@Query() query: BookingDetailsQueryDto) {
    return this.dashboardRepo.getBookingDetails(
      new Date(query.fromDate),
      new Date(query.toDate),
      query.limit ? Math.min(query.limit, 50) : 10,
    );
  }

  @Get('dashboard/finance-breakdown')
  getFinanceBreakdown(@Query() query: DateRangeQueryDto) {
    return this.dashboardRepo.getFinanceBreakdown(
      new Date(query.fromDate),
      new Date(query.toDate),
    );
  }

  @Get('dashboard/tasker-stats')
  getTaskerStats(@Query('limit') limit?: string) {
    return this.dashboardRepo.getTaskerStats(
      limit ? Math.min(parseInt(limit, 10), 20) : 5,
    );
  }

  @Get('dashboard/reviews')
  getReviews(@Query() query: DateRangeQueryDto) {
    return this.dashboardRepo.getReviews(
      new Date(query.fromDate),
      new Date(query.toDate),
    );
  }

  @Get('dashboard/tasker-levels')
  getTaskerLevels() {
    return this.dashboardRepo.getTaskerLevels();
  }

  @Get('dashboard/area-performance')
  getAreaPerformance(@Query() query: DateRangeQueryDto) {
    return this.dashboardRepo.getAreaPerformance(
      new Date(query.fromDate),
      new Date(query.toDate),
    );
  }

  @Get('dashboard/voucher-performance')
  getVoucherPerformance(@Query('limit') limit?: string) {
    return this.dashboardRepo.getVoucherPerformance(
      limit ? Math.min(parseInt(limit, 10), 20) : 6,
    );
  }

  // ─── Booking Search (autocomplete) ───

  @Get('bookings')
  searchBookings(@Query() query: BookingSearchQueryDto) {
    return this.bookingRepo.searchBookings(query);
  }

  @Get('bookings/taskers/active')
  getActiveTaskers() {
    return this.bookingRepo.getActiveTaskers();
  }

  @Get('bookings/:id')
  async getBookingDetail(@Param('id', ParseUUIDPipe) id: string) {
    const detail = await this.bookingRepo.getBookingDetail(id);
    if (!detail) {
      throw new NotFoundException(`Không tìm thấy booking với id ${id}`);
    }
    return detail;
  }

  @Patch('bookings/:id/cancel')
  async cancelBooking(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.bookingRepo.cancelBookingByAdmin(id, adminUserId);
  }

  @Patch('bookings/:id/assign')
  async assignTasker(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('taskerId') taskerId: string,
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.bookingRepo.assignTaskerToBooking(id, taskerId, adminUserId);
  }

  @Post('bookings/expire-overdue')
  expireOverdueBookings() {
    return this.bookingRepo.expireOverdueBookings();
  }


  // ─── Customer Management Endpoints ───

  @Get('customers')
  getCustomers(@Query() query: CustomerQueryDto) {
    return this.customerRepo.getCustomers(query);
  }

  @Get('customers/:id')
  async getCustomerDetail(@Param('id', ParseUUIDPipe) id: string) {
    const detail = await this.customerRepo.getCustomerDetail(id);
    if (!detail) {
      throw new NotFoundException(`Không tìm thấy khách hàng với id ${id}`);
    }
    return detail;
  }

  @Get('customers/:id/bookings')
  getCustomerBookings(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.customerRepo.getCustomerBookings(
      id,
      page ? Math.max(1, parseInt(page, 10)) : 1,
      limit ? Math.min(Math.max(1, parseInt(limit, 10)), 50) : 10,
    );
  }

  @Patch('customers/:id/status')
  async updateCustomerStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('isActive') isActive: boolean,
  ) {
    // Get the customer to find associated userId
    const detail = await this.customerRepo.getCustomerDetail(id);
    if (!detail) {
      throw new NotFoundException(`Không tìm thấy khách hàng với id ${id}`);
    }
    const user = await this.usersService.toggleUserActiveStatus(
      detail.userId,
      isActive,
    );
    return {
      message: isActive ? 'Đã mở khóa tài khoản' : 'Đã khóa tài khoản',
      isActive: user.isActive,
    };
  }
}
