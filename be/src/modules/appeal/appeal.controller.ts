import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { AppealService } from './appeal.service';
import { SubmitAppealDto } from './dto/submit-appeal.dto';

/**
 * Cổng public cho tasker bị khóa vĩnh viễn gửi kháng cáo — KHÔNG yêu cầu đăng
 * nhập (tasker bị ban không login được). Xác thực bằng token trong link email.
 */
@Controller('appeals')
@ApiTags('Appeals')
@Public()
@UseGuards(ThrottlerGuard)
export class AppealController {
  constructor(private readonly appealService: AppealService) {}

  @Get('verify')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Xác thực token kháng cáo & lấy thông tin hiển thị' })
  verify(@Query('token') token: string) {
    return this.appealService.getContext(token ?? '');
  }

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Gửi nội dung kháng cáo (tạo ticket APPEAL)' })
  submit(@Body() dto: SubmitAppealDto) {
    return this.appealService.submit(dto);
  }
}
