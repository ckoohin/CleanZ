import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  Res,
  NotFoundException,
  ParseUUIDPipe,
} from '@nestjs/common';
import type { Response } from 'express';
import { AdminOnly } from 'src/modules/auth/decorators/admin-only.decorator';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import { AdminDashboardRepository } from './repositories/admin-dashboard.repository';
import { AdminCustomerRepository } from './repositories/admin-customer.repository';
import { AdminBookingRepository } from './repositories/admin-booking.repository';
import { AdminDashboardReportService } from './services/admin-dashboard-report.service';
import { UsersService } from 'src/modules/users/users.service';
import {
  DateRangeQueryDto,
  RevenueChartQueryDto,
  BookingDetailsQueryDto,
} from './dto/date-range-query.dto';
import {
  DashboardExportQueryDto,
  DashboardExportMode,
} from './dto/dashboard-export-query.dto';
import {
  vietnamStartOfDay,
  vietnamEndOfDay,
} from 'src/common/helpers/vietnam-time.helper';
import {
  buildReportWorkbookBuffer,
  buildCombinedSingleSheetBuffer,
  excelFilename,
} from 'src/common/helpers/excel-report.helper';
import { CustomerQueryDto } from './dto/customer-query.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { UpdateUserStatusDto } from 'src/modules/users/dto/update-user-status.dto';
import { BookingSearchQueryDto } from './dto/booking-search-query.dto';
import { AvailableTaskersQueryDto } from './dto/available-taskers-query.dto';
import { AssignTaskerDto } from './dto/assign-tasker.dto';
import { ChangeBookingStatusDto } from './dto/change-booking-status.dto';
import { CreateAdminBookingDto } from './dto/create-admin-booking.dto';
import { AdminActivityQueryDto } from './dto/admin-activity-query.dto';
import { AdminActivityService } from './services/admin-activity.service';
import { ReviewBookingCheckinDto } from './dto/review-booking-checkin.dto';
import { AdminCheckinOverrideDto } from './dto/admin-checkin-override.dto';
import { ReviewBookingNoShowDto } from './dto/review-booking-no-show.dto';
import { TaskerBookingService } from 'src/modules/booking/services/tasker-booking.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminAbsenceReportRepository } from './repositories/admin-absence-report.repository';
import {
  AbsenceReportQueryDto,
  BulkReviewAbsenceReportsDto,
  ReviewAbsenceReportDto,
  WriteOffCustomerDebtDto,
} from './dto/absence-report.dto';

@AdminOnly()
@Controller('admin')
@ApiTags('Admin – Booking Management')
@ApiBearerAuth('access-token')
export class AdminController {
  constructor(
    private readonly dashboardRepo: AdminDashboardRepository,
    private readonly customerRepo: AdminCustomerRepository,
    private readonly bookingRepo: AdminBookingRepository,
    private readonly usersService: UsersService,
    private readonly dashboardReport: AdminDashboardReportService,
    private readonly activityService: AdminActivityService,
    private readonly taskerBookingService: TaskerBookingService,
    private readonly absenceReportRepo: AdminAbsenceReportRepository,
  ) {}

  @Get('activities')
  @ApiOperation({
    summary: 'Tra cứu toàn bộ thao tác thay đổi do admin thực hiện',
  })
  getActivities(@Query() query: AdminActivityQueryDto) {
    return this.activityService.findAll(query);
  }

  @Get('absence-reports')
  @ApiOperation({ summary: 'Hàng chờ báo cáo khách hàng vắng mặt' })
  getAbsenceReports(@Query() query: AbsenceReportQueryDto) {
    return this.absenceReportRepo.findAll(query);
  }

  @Patch('absence-reports/bulk/review')
  @ApiOperation({
    summary: 'Duyệt hàng loạt các báo cáo không có cờ bất thường',
  })
  bulkReviewAbsenceReports(
    @CurrentUser('id') adminUserId: string,
    @Body() dto: BulkReviewAbsenceReportsDto,
  ) {
    return this.absenceReportRepo.bulkApprove(adminUserId, dto);
  }

  @Post('absence-reports/debts/:id/write-off')
  @ApiOperation({ summary: 'Admin ghi nhận xoá một khoản nợ khách hàng' })
  writeOffCustomerAbsenceDebt(
    @CurrentUser('id') adminUserId: string,
    @Param('id', ParseUUIDPipe) debtId: string,
    @Body() dto: WriteOffCustomerDebtDto,
  ) {
    return this.absenceReportRepo.writeOffDebt(debtId, adminUserId, dto.reason);
  }

  @Get('absence-reports/:id')
  @ApiOperation({ summary: 'Chi tiết báo cáo khách hàng vắng mặt' })
  getAbsenceReport(@Param('id', ParseUUIDPipe) id: string) {
    return this.absenceReportRepo.findById(id);
  }

  @Patch('absence-reports/:id/review')
  @ApiOperation({ summary: 'Duyệt hoặc từ chối báo cáo khách hàng vắng mặt' })
  reviewAbsenceReport(
    @CurrentUser('id') adminUserId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewAbsenceReportDto,
  ) {
    return this.absenceReportRepo.review(id, adminUserId, dto);
  }

  // ─── Dashboard Endpoints ───

  /**
   * Biên của kỳ lọc, tính theo giờ VN. `new Date('2026-07-31')` là nửa đêm UTC
   * = 07:00 sáng giờ VN, nên dùng thẳng làm cận trên sẽ cắt mất gần trọn ngày cuối.
   */
  private range(query: DateRangeQueryDto): [Date, Date] {
    return [
      query.fromDate ? vietnamStartOfDay(query.fromDate) : new Date(0),
      query.toDate ? vietnamEndOfDay(query.toDate) : new Date(),
    ];
  }

  @Get('dashboard/alerts')
  getAlerts() {
    return this.dashboardRepo.getAlerts();
  }

  @Get('dashboard/kpis')
  getKpis(@Query() query: DateRangeQueryDto) {
    return this.dashboardRepo.getKpis(...this.range(query));
  }

  @Get('dashboard/gmv-chart')
  getGmvChart(@Query() query: RevenueChartQueryDto) {
    const [from, to] = this.range(query);
    return this.dashboardRepo.getGmvChart(from, to, query.groupBy);
  }

  @Get('dashboard/booking-status-snapshot')
  getBookingStatusSnapshot() {
    return this.dashboardRepo.getBookingStatusSnapshot();
  }

  @Get('dashboard/booking-details')
  getBookingDetails(@Query() query: BookingDetailsQueryDto) {
    const [from, to] = this.range(query);
    return this.dashboardRepo.getBookingDetails(
      from,
      to,
      query.limit ? Math.min(query.limit, 50) : 10,
    );
  }

  @Get('dashboard/finance-breakdown')
  getFinanceBreakdown(@Query() query: DateRangeQueryDto) {
    return this.dashboardRepo.getFinanceBreakdown(...this.range(query));
  }

  @Get('dashboard/tasker-stats')
  getTaskerStats(@Query('limit') limit?: string) {
    return this.dashboardRepo.getTaskerStats(
      limit ? Math.min(parseInt(limit, 10), 20) : 5,
    );
  }

  @Get('dashboard/reviews')
  getReviews(@Query() query: DateRangeQueryDto) {
    return this.dashboardRepo.getReviews(...this.range(query));
  }

  @Get('dashboard/tasker-levels')
  getTaskerLevels() {
    return this.dashboardRepo.getTaskerLevels();
  }

  @Get('dashboard/area-performance')
  getAreaPerformance(@Query() query: DateRangeQueryDto) {
    return this.dashboardRepo.getAreaPerformance(...this.range(query));
  }

  @Get('dashboard/voucher-performance')
  getVoucherPerformance(@Query('limit') limit?: string) {
    return this.dashboardRepo.getVoucherPerformance(
      limit ? Math.min(parseInt(limit, 10), 20) : 6,
    );
  }

  /**
   * Xuất báo cáo Excel cho một danh mục dashboard. `mode=multi` → mỗi mục một
   * tab; `mode=combined` → mọi mục xếp chồng trong một trang tính.
   * Dùng `@Res()` nên bỏ qua ClassSerializerInterceptor toàn cục — cần thiết vì
   * các route còn lại của controller trả JSON.
   */
  @Get('dashboard/export')
  @ApiOperation({
    summary: 'Xuất Excel báo cáo dashboard theo danh mục',
    description:
      'Số liệu lấy từ đúng các hàm mà widget trên dashboard đang gọi, nên file khớp với những gì admin nhìn thấy.',
  })
  async exportDashboard(
    @Query() query: DashboardExportQueryDto,
    @Res() res: Response,
  ) {
    const [from, to] = this.range(query);
    const sheets = await this.dashboardReport.buildSheets(
      query.category,
      from,
      to,
    );

    const isCombined = query.mode === DashboardExportMode.COMBINED;
    const buffer = isCombined
      ? await buildCombinedSingleSheetBuffer(
          sheets,
          this.dashboardReport.getReportTitle(query.category),
          this.dashboardReport.getFilterSummary(query.category, from, to),
        )
      : await buildReportWorkbookBuffer(sheets);

    const name = `bao-cao-${query.category}${isCombined ? '-gop' : ''}`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${excelFilename(name)}"`,
    );
    res.send(buffer);
  }

  // ─── Booking Search (autocomplete) ───

  @Get('bookings')
  @ApiOperation({
    summary: 'Admin xem danh sách booking',
    description:
      'Hỗ trợ phân trang và lọc theo trạng thái booking, trạng thái thanh toán, customer, tasker, dịch vụ, khoảng ngày tạo; keyword tìm theo mã booking hoặc thông tin customer/tasker.',
  })
  searchBookings(@Query() query: BookingSearchQueryDto) {
    return this.bookingRepo.searchBookings(query);
  }

  @Get('bookings/taskers/active')
  getActiveTaskers() {
    return this.bookingRepo.getActiveTaskers();
  }

  @Post('bookings')
  @ApiOperation({
    summary: 'Admin tạo booking thủ công',
    description:
      'Tạo booking hộ customer theo bảng giá hiện hành; có thể chỉ định Tasker ngay khi tạo.',
  })
  createBooking(
    @CurrentUser('id') adminUserId: string,
    @Body() dto: CreateAdminBookingDto,
  ) {
    return this.bookingRepo.createBooking(adminUserId, dto);
  }

  @Get('bookings/:id')
  @ApiOperation({
    summary: 'Admin xem chi tiết booking',
    description:
      'Trả toàn bộ thông tin booking, timeline vận hành và thông tin thanh toán/quyết toán.',
  })
  async getBookingDetail(@Param('id', ParseUUIDPipe) id: string) {
    const detail = await this.bookingRepo.getBookingDetail(id);
    if (!detail) {
      throw new NotFoundException(`Không tìm thấy booking với id ${id}`);
    }
    return detail;
  }

  @Get('bookings/:id/available-taskers')
  @ApiOperation({
    summary: 'Admin xem Tasker khả dụng cho booking',
    description:
      'Loại Tasker chưa hoạt động, chưa duyệt hồ sơ, bị khóa, trùng lịch hoặc không đủ khả năng chi trả phí nền tảng của booking tiền mặt.',
  })
  getAvailableTaskers(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: AvailableTaskersQueryDto,
  ) {
    return this.bookingRepo.getAvailableTaskers(id, query);
  }

  @Patch('bookings/:id/tasker')
  @ApiOperation({
    summary: 'Admin gán hoặc thay Tasker thủ công (develop)',
  })
  assignTasker(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminUserId: string,
    @Body() dto: AssignTaskerDto,
  ) {
    return this.bookingRepo.assignTasker(id, adminUserId, dto);
  }

  @Patch('bookings/:id/assign')
  @ApiOperation({
    summary: 'Admin gán Tasker thủ công (dev-v1)',
  })
  async assignTaskerV1(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('taskerId') taskerId: string,
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.bookingRepo.assignTaskerToBooking(id, taskerId, adminUserId);
  }

  @Patch('bookings/:id/status')
  @ApiOperation({
    summary: 'Admin can thiệp trạng thái booking',
    description:
      'Hỗ trợ chuyển bước vận hành kế tiếp, hủy, hoàn thành và khôi phục booking. Mọi thay đổi đều được audit.',
  })
  changeBookingStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminUserId: string,
    @Body() dto: ChangeBookingStatusDto,
  ) {
    return this.bookingRepo.changeBookingStatus(id, adminUserId, dto);
  }

  @Patch('bookings/:id/checkin-review')
  @ApiOperation({
    summary: 'Admin duyệt bằng chứng check-in bất thường',
    description:
      'Chấp nhận, từ chối hoặc đánh dấu không thể xác minh. Khi từ chối, Admin có thể mở Incident để tiếp tục quy trình xác minh và bồi thường.',
  })
  reviewBookingCheckin(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminUserId: string,
    @Body() dto: ReviewBookingCheckinDto,
  ) {
    return this.bookingRepo.reviewCheckin(id, adminUserId, dto);
  }

  @Patch('bookings/:id/no-show-review')
  @ApiOperation({
    summary: 'Admin kết luận booking tự hủy do Tasker không check-in',
    description:
      'Xác nhận no-show để cộng điểm vi phạm, hoặc miễn trách nhiệm sau khi xem giải trình. Có thể mở Incident để xử lý bồi thường bổ sung; tiền booking đã được hoàn ngay khi tự hủy.',
  })
  reviewBookingNoShow(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminUserId: string,
    @Body() dto: ReviewBookingNoShowDto,
  ) {
    return this.bookingRepo.reviewNoShow(id, adminUserId, dto);
  }

  @Patch('bookings/:id/checkin-override')
  @ApiOperation({
    summary: 'Admin xác nhận check-in thủ công có audit',
    description:
      'Nhánh cứu hộ riêng cho booking đang TASKER_ON_THE_WAY; không giả lập GPS và không dùng endpoint đổi trạng thái chung.',
  })
  async overrideBookingCheckin(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminUserId: string,
    @Body() dto: AdminCheckinOverrideDto,
  ) {
    await this.taskerBookingService.adminOverrideCheckin(
      adminUserId,
      id,
      dto.reason,
    );
    return this.bookingRepo.getBookingDetail(id);
  }

  @Patch('bookings/:id/cancel')
  async cancelBooking(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.bookingRepo.cancelBookingByAdmin(id, adminUserId);
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

  @Post('customers')
  createCustomer(
    @Body() dto: CreateCustomerDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.customerRepo.createCustomer(dto, adminId);
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
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser('id') adminId: string,
  ) {
    // Get the customer to find associated userId
    const detail = await this.customerRepo.getCustomerDetail(id);
    if (!detail) {
      throw new NotFoundException(`Không tìm thấy khách hàng với id ${id}`);
    }
    const user = await this.usersService.toggleUserActiveStatus(
      detail.userId,
      dto.isActive,
    );
    // Ghi vết admin đã khóa/mở khóa.
    await this.customerRepo.markUpdatedBy(id, adminId);
    return {
      message: dto.isActive ? 'Đã mở khóa tài khoản' : 'Đã khóa tài khoản',
      isActive: user.isActive,
    };
  }

  @Patch('customers/:id')
  updateCustomer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.customerRepo.updateCustomer(id, dto, adminId);
  }

  @Delete('customers/:id')
  deleteCustomer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.customerRepo.deleteCustomer(id, adminId);
  }

  @Patch('customers/:id/restore')
  restoreCustomer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.customerRepo.restoreCustomer(id, adminId);
  }

  @Post('customers/:id/resend-temp-password')
  resendCustomerTempPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.customerRepo.resendTempPassword(id, adminId);
  }
}
