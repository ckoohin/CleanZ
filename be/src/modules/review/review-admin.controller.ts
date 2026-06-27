import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AdminOnly } from '../auth/decorators/admin-only.decorator';
import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ReviewService } from './review.service';
import { AdminReviewQueryDto } from './dto/admin-review-query.dto';
import { SetAdminReplyDto } from './dto/set-admin-reply.dto';
import { DecideReportDto } from './dto/decide-report.dto';
import { ReviewReportStatus } from 'src/common/enums/review-report-status.enum';

@ApiTags('Admin - Reviews')
@Controller('admin/reviews')
@Auth()
@AdminOnly()
@ApiBearerAuth('access-token')
export class ReviewAdminController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard tổng quan đánh giá' })
  getDashboard(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.reviewService.getAdminDashboard(fromDate, toDate);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách tất cả đánh giá (có filter)' })
  getAdminReviews(@Query() query: AdminReviewQueryDto) {
    return this.reviewService.getAdminReviews(query);
  }

  @Get('export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @ApiOperation({ summary: 'Xuất báo cáo đánh giá CSV' })
  async exportCsv(
    @Query() query: AdminReviewQueryDto,
    @Res() res: Response,
  ) {
    const buffer = await this.reviewService.exportCsv(query);
    const filename = `reviews_${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.send(Buffer.concat([Buffer.from('﻿', 'utf8'), buffer]));
  }

  @Get('reports')
  @ApiOperation({ summary: 'Danh sách báo cáo review vi phạm' })
  getReports(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
    @Query('status') status?: ReviewReportStatus,
  ) {
    return this.reviewService.getAdminReports(page, limit, status);
  }

  @Post('reports/:reportId/decide')
  @ApiOperation({ summary: 'Duyệt hoặc từ chối báo cáo' })
  decideReport(
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @CurrentUser('id') adminUserId: string,
    @Body() dto: DecideReportDto,
  ) {
    return this.reviewService.decideReport(reportId, adminUserId, dto);
  }

  @Patch(':id/hide')
  @ApiOperation({ summary: 'Ẩn/hiện đánh giá' })
  toggleHide(@Param('id', ParseUUIDPipe) id: string) {
    return this.reviewService.toggleHide(id);
  }

  @Patch(':id/reply')
  @ApiOperation({ summary: 'Admin phản hồi đánh giá' })
  setAdminReply(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetAdminReplyDto,
  ) {
    return this.reviewService.setAdminReply(id, dto.reply);
  }
}
