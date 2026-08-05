import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AdminOnly } from 'src/modules/auth/decorators/admin-only.decorator';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import {
  paginatedResponse,
  successResponse,
} from 'src/common/helpers/response.helper';
import {
  parseLocalAnchor,
  previousPeriodStart,
  vietnamLocalDay,
} from 'src/common/helpers/earnings-period.helper';
import { PERIOD_FILE_LABEL } from './earnings-report.constants';
import {
  DTO_TO_PERIOD,
  EarningsReportPreviewQueryDto,
  EarningsReportRunDetailQueryDto,
  EarningsReportRunQueryDto,
  SendEarningsReportDto,
} from './dto/earnings-report.dto';
import { EarningsReportAdminService } from './services/earnings-report-admin.service';
import { EarningsReportDataService } from './services/earnings-report-data.service';
import { EarningsReportPdfService } from './services/earnings-report-pdf.service';

@ApiTags('Admin – Earnings Report')
@Controller('admin/earnings-reports')
@AdminOnly()
export class EarningsReportAdminController {
  constructor(
    private readonly adminService: EarningsReportAdminService,
    private readonly dataService: EarningsReportDataService,
    private readonly pdfService: EarningsReportPdfService,
  ) {}

  @Post('send')
  @ApiOperation({
    summary: 'Gửi bảng kê thu nhập cho Tasker (thủ công)',
    description:
      'Không truyền `taskerIds` sẽ gửi cho mọi Tasker có đơn hoàn thành trong kỳ. ' +
      'Gửi lại cùng tham số không tạo email trùng nhờ jobId cố định theo (kỳ, tasker).',
  })
  async send(
    @CurrentUser('id') adminUserId: string,
    @Body() dto: SendEarningsReportDto,
  ) {
    return successResponse(
      await this.adminService.sendManually(adminUserId, dto),
    );
  }

  @Get('runs')
  @ApiOperation({ summary: 'Danh sách các lượt gửi bảng kê' })
  async listRuns(@Query() query: EarningsReportRunQueryDto) {
    const { items, total, page, limit } =
      await this.adminService.listRuns(query);
    return paginatedResponse(items, total, page, limit);
  }

  // Route tĩnh phải đứng trước route có tham số để không bị `runs/:id` nuốt.
  @Get('preview')
  @ApiOperation({
    summary: 'Xem trước bảng kê dưới dạng PDF mà không gửi email',
  })
  async preview(
    @Query() query: EarningsReportPreviewQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const period = DTO_TO_PERIOD[query.period];
    const anchorLocalMs = query.anchor
      ? parseLocalAnchor(query.anchor, vietnamLocalDay())
      : previousPeriodStart(period, vietnamLocalDay());

    const report = await this.dataService.build(
      query.taskerId,
      period,
      anchorLocalMs,
    );
    const pdf = await this.pdfService.buildPdf(report);
    const filename = this.pdfService.buildFileName(
      PERIOD_FILE_LABEL[period],
      report.period.periodStartKey,
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.send(pdf);
  }

  @Get('runs/:id')
  @ApiOperation({ summary: 'Chi tiết một lượt gửi kèm trạng thái từng Tasker' })
  @ApiParam({ name: 'id', description: 'UUID của lượt gửi' })
  async getRun(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: EarningsReportRunDetailQueryDto,
  ) {
    return successResponse(await this.adminService.getRunDetail(id, query));
  }
}
