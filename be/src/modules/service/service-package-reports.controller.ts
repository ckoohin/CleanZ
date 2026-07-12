import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ServicePackageReportsService } from './services/service-package-reports.service';
import {
  RevenueTrendQueryDto,
  ServicePackageReportsQueryDto,
  TopTaskersReportQueryDto,
} from './dto/service-package-reports-query.dto';
import { UserRole } from 'src/common/enums/user-role.enum';
import { Auth } from '../auth/decorators/auth.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { successResponse } from 'src/common/helpers/response.helper';
import {
  buildReportWorkbookBuffer,
  buildCombinedSingleSheetBuffer,
  excelFilename,
  ExcelSheetSpec,
} from 'src/common/helpers/excel-report.helper';

@ApiTags('Admin – Service Package Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/service-packages/reports')
export class ServicePackageReportsController {
  constructor(
    private readonly reportsService: ServicePackageReportsService,
  ) {}

  @Get('overview')
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Tổng quan booking/doanh thu toàn bộ gói dịch vụ' })
  async getOverview(@Query() query: ServicePackageReportsQueryDto) {
    const data = await this.reportsService.getOverview(query);
    return successResponse(data);
  }

  @Get('revenue-trend')
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Xu hướng doanh thu theo thời gian' })
  async getRevenueTrend(@Query() query: RevenueTrendQueryDto) {
    const data = await this.reportsService.getRevenueTrend(query);
    return successResponse(data);
  }

  @Get('by-package')
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Doanh thu/booking theo từng gói dịch vụ' })
  async getByPackage(@Query() query: ServicePackageReportsQueryDto) {
    const data = await this.reportsService.getRevenueByPackage(query);
    return successResponse(data);
  }

  @Get('booking-status')
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Phân bố booking theo trạng thái' })
  async getBookingStatus(@Query() query: ServicePackageReportsQueryDto) {
    const data = await this.reportsService.getBookingStatusBreakdown(query);
    return successResponse(data);
  }

  @Get('hourly-distribution')
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Phân bố booking thực tế theo giờ trong ngày' })
  async getHourlyDistribution(@Query() query: ServicePackageReportsQueryDto) {
    const data = await this.reportsService.getHourlyDistribution(query);
    return successResponse(data);
  }

  @Get('addon-popularity')
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Xếp hạng dịch vụ thêm (addon) theo số lần dùng và doanh thu' })
  async getAddonPopularity(@Query() query: ServicePackageReportsQueryDto) {
    const data = await this.reportsService.getAddonPopularity(query);
    return successResponse(data);
  }

  @Get('duration-popularity')
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Mốc thời lượng phổ biến theo từng gói' })
  async getDurationPopularity(@Query() query: ServicePackageReportsQueryDto) {
    const data = await this.reportsService.getDurationPopularity(query);
    return successResponse(data);
  }

  @Get('top-taskers')
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Bảng xếp hạng tasker theo số việc hoàn thành' })
  async getTopTaskers(@Query() query: TopTaskersReportQueryDto) {
    const data = await this.reportsService.getTopTaskers(query);
    return successResponse(data);
  }

  // ─── Xuất Excel — mỗi route trả về 1 file .xlsx, dùng lại đúng filter đang
  // áp dụng trên từng mục báo cáo. ───

  private async sendWorkbook(
    res: Response,
    sheets: ExcelSheetSpec[],
    reportName: string,
  ) {
    const buffer = await buildReportWorkbookBuffer(sheets);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${excelFilename(reportName)}"`,
    );
    res.send(buffer);
  }

  @Get('export/revenue-trend')
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Xuất Excel: Xu hướng doanh thu' })
  async exportRevenueTrend(
    @Query() query: RevenueTrendQueryDto,
    @Res() res: Response,
  ) {
    const sheet = await this.reportsService.buildRevenueTrendSheet(query);
    await this.sendWorkbook(res, [sheet], 'xu-huong-doanh-thu');
  }

  @Get('export/by-package')
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Xuất Excel: Doanh thu theo gói dịch vụ' })
  async exportByPackage(
    @Query() query: ServicePackageReportsQueryDto,
    @Res() res: Response,
  ) {
    const sheet = await this.reportsService.buildRevenueByPackageSheet(query);
    await this.sendWorkbook(res, [sheet], 'doanh-thu-theo-goi');
  }

  @Get('export/booking-status')
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Xuất Excel: Phân bổ trạng thái booking' })
  async exportBookingStatus(
    @Query() query: ServicePackageReportsQueryDto,
    @Res() res: Response,
  ) {
    const sheet = await this.reportsService.buildBookingStatusSheet(query);
    await this.sendWorkbook(res, [sheet], 'trang-thai-booking');
  }

  @Get('export/hourly-distribution')
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Xuất Excel: Phân bố booking theo giờ' })
  async exportHourlyDistribution(
    @Query() query: ServicePackageReportsQueryDto,
    @Res() res: Response,
  ) {
    const sheet = await this.reportsService.buildHourlyDistributionSheet(query);
    await this.sendWorkbook(res, [sheet], 'phan-bo-theo-gio');
  }

  @Get('export/addon-popularity')
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Xuất Excel: Dịch vụ thêm phổ biến' })
  async exportAddonPopularity(
    @Query() query: ServicePackageReportsQueryDto,
    @Res() res: Response,
  ) {
    const sheet = await this.reportsService.buildAddonPopularitySheet(query);
    await this.sendWorkbook(res, [sheet], 'dich-vu-them-pho-bien');
  }

  @Get('export/duration-popularity')
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Xuất Excel: Mốc thời lượng phổ biến' })
  async exportDurationPopularity(
    @Query() query: ServicePackageReportsQueryDto,
    @Res() res: Response,
  ) {
    const sheet = await this.reportsService.buildDurationPopularitySheet(query);
    await this.sendWorkbook(res, [sheet], 'moc-thoi-luong-pho-bien');
  }

  @Get('export/top-taskers')
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Xuất Excel: Bảng xếp hạng Tasker' })
  async exportTopTaskers(
    @Query() query: TopTaskersReportQueryDto,
    @Res() res: Response,
  ) {
    const sheet = await this.reportsService.buildTopTaskersSheet(query);
    await this.sendWorkbook(res, [sheet], 'bang-xep-hang-tasker');
  }

  @Get('export/all')
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Xuất Excel: Báo cáo tổng hợp toàn bộ (gộp 1 sheet duy nhất)' })
  async exportAll(@Query() query: TopTaskersReportQueryDto, @Res() res: Response) {
    const [sections, filterSummary] = await Promise.all([
      Promise.all([
        this.reportsService.buildOverviewSheet(query),
        this.reportsService.buildRevenueTrendSheet(query),
        this.reportsService.buildRevenueByPackageSheet(query),
        this.reportsService.buildBookingStatusSheet(query),
        this.reportsService.buildHourlyDistributionSheet(query),
        this.reportsService.buildAddonPopularitySheet(query),
        this.reportsService.buildDurationPopularitySheet(query),
        this.reportsService.buildTopTaskersSheet(query),
      ]),
      this.reportsService.getExportFilterSummary(query),
    ]);

    const buffer = await buildCombinedSingleSheetBuffer(
      sections,
      'BÁO CÁO TỔNG HỢP GÓI DỊCH VỤ',
      filterSummary,
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${excelFilename('bao-cao-tong-hop-goi-dich-vu')}"`,
    );
    res.send(buffer);
  }
}
