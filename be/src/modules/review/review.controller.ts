import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReportReviewDto } from './dto/report-review.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Auth()
  @Post('booking/:bookingId')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Tạo đánh giá cho booking đã hoàn thành' })
  createReview(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewService.createReview(bookingId, userId, dto);
  }

  @Auth()
  @Get('booking/:bookingId')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Lấy đánh giá của tôi cho booking' })
  getMyReview(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.reviewService.getReviewByBooking(bookingId, userId);
  }

  @Public()
  @Get('package/:packageId')
  @ApiOperation({ summary: 'Lấy danh sách đánh giá theo gói dịch vụ (public)' })
  getPackageReviews(
    @Param('packageId', ParseUUIDPipe) packageId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reviewService.getPackageReviews(
      packageId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
    );
  }

  @Auth()
  @Post(':id/report')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Báo cáo đánh giá vi phạm' })
  reportReview(
    @Param('id', ParseUUIDPipe) reviewId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ReportReviewDto,
  ) {
    return this.reviewService.reportReview(reviewId, userId, dto);
  }
}
