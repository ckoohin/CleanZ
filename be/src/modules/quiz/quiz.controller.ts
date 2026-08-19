import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth } from 'src/modules/auth/decorators/auth.decorator';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import type { AuthUser } from 'src/modules/auth/types/AuthRequest';
import { QuizService } from './quiz.service';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';

@Auth()
@Controller('quiz')
@ApiTags('Quiz – Tasker')
@ApiBearerAuth('access-token')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @Get('active')
  @ApiOperation({
    summary: 'Lấy bài kiểm tra đang hoạt động (không có đáp án)',
  })
  getActiveQuiz(@CurrentUser() user: AuthUser) {
    return this.quizService.getActiveQuiz(user.id);
  }

  @Get('my-status')
  @ApiOperation({
    summary: 'Trạng thái thi của tasker: đã pass, số lần đã thi, điểm gần nhất',
  })
  getMyStatus(@CurrentUser() user: AuthUser) {
    return this.quizService.getMyStatus(user.id);
  }

  @Post('start')
  @ApiOperation({ summary: 'Bắt đầu một lượt thi mới' })
  startAttempt(@CurrentUser() user: AuthUser) {
    return this.quizService.startAttempt(user.id);
  }

  @Post('attempts/:id/submit')
  @ApiOperation({ summary: 'Nộp bài và nhận kết quả' })
  submitAttempt(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) attemptId: string,
    @Body() dto: SubmitAttemptDto,
  ) {
    return this.quizService.submitAttempt(user.id, attemptId, dto);
  }

  @Get('attempts/:id')
  @ApiOperation({ summary: 'Xem kết quả chi tiết một lượt thi' })
  getAttemptResult(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) attemptId: string,
  ) {
    return this.quizService.getAttemptResult(user.id, attemptId);
  }
}
