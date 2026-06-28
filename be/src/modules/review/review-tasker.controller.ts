import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from 'src/common/enums/user-role.enum';
import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ReviewService } from './review.service';
import { ReportReviewDto } from './dto/report-review.dto';
import { TaskerReplyDto } from './dto/tasker-reply.dto';

@ApiTags('Tasker - Reviews')
@Controller('tasker/reviews')
@Auth(UserRole.TASKER)
@ApiBearerAuth('access-token')
export class ReviewTaskerController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get()
  @ApiOperation({ summary: 'Tasker xem danh sách đánh giá của mình' })
  getMyReviews(
    @CurrentUser('id') userId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
    @Query('minRating', new ParseIntPipe({ optional: true }))
    minRating?: number,
    @Query('maxRating', new ParseIntPipe({ optional: true }))
    maxRating?: number,
  ) {
    return this.reviewService.taskerGetMyReviews(
      userId,
      page,
      limit,
      minRating,
      maxRating,
    );
  }

  @Post(':id/reply')
  @ApiOperation({ summary: 'Tasker phản hồi đánh giá (1 lần duy nhất)' })
  replyReview(
    @Param('id', ParseUUIDPipe) reviewId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: TaskerReplyDto,
  ) {
    return this.reviewService.taskerReplyReview(reviewId, userId, dto);
  }

  @Post(':id/report')
  @ApiOperation({ summary: 'Tasker báo cáo đánh giá vi phạm' })
  reportReview(
    @Param('id', ParseUUIDPipe) reviewId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ReportReviewDto,
  ) {
    return this.reviewService.taskerReportReview(reviewId, userId, dto);
  }
}
