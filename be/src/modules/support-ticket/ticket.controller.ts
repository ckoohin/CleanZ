import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from 'src/common/enums/user-role.enum';
import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TicketSource } from 'src/common/enums/ticket-source.enum';
import { TicketService } from './services/ticket.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { QueryTicketDto } from './dto/query-ticket.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { MarkReadDto } from './dto/mark-read.dto';
import { ReopenTicketDto } from './dto/reopen-ticket.dto';
import { SubmitSurveyDto } from './dto/submit-survey.dto';
import { TicketSurveyService } from './services/ticket-survey.service';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/jpg'];
const MAX_SIZE = 5 * 1024 * 1024;

@Controller('support-tickets')
@ApiTags('Support Tickets')
@ApiBearerAuth('access-token')
@Auth(UserRole.CUSTOMER, UserRole.TASKER)
export class TicketController {
  constructor(
    private readonly ticketService: TicketService,
    private readonly surveyService: TicketSurveyService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Tạo ticket khiếu nại từ đơn của tôi' })
  // Chống spam tạo ticket hàng loạt (mỗi ticket còn kéo theo ảnh lên Cloudinary).
  @Throttle({ default: { limit: 10, ttl: 3_600_000 } })
  @UseGuards(ThrottlerGuard)
  create(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body() dto: CreateTicketDto,
  ) {
    const source =
      (role as UserRole) === UserRole.TASKER
        ? TicketSource.TASKER_APP
        : TicketSource.CUSTOMER_APP;
    return this.ticketService.create(userId, dto, source);
  }

  @Get('mine')
  @ApiOperation({ summary: 'Danh sách ticket của tôi (phân trang, lọc)' })
  listMine(@CurrentUser('id') userId: string, @Query() query: QueryTicketDto) {
    return this.ticketService.listMine(userId, query);
  }

  @Get('unread-total')
  @ApiOperation({ summary: 'Tổng số tin chưa đọc (badge)' })
  async unreadTotal(@CurrentUser('id') userId: string) {
    return { count: await this.ticketService.unreadTotal(userId, false) };
  }

  // LƯU Ý: mọi route tĩnh phải khai báo TRƯỚC `@Get(':id')` — nếu không sẽ bị
  // match vào `:id` và ParseUUIDPipe trả 400.
  @Get('eligible-bookings')
  @ApiOperation({
    summary:
      'Đơn có thể khiếu nại (select "Đơn liên quan") — dùng chung customer & tasker',
  })
  eligibleBookings(@CurrentUser('id') userId: string) {
    return this.ticketService.listEligibleBookings(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết ticket (ẩn ghi chú nội bộ)' })
  findOne(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ticketService.findOneForUser(userId, id);
  }

  @Get(':id/messages')
  @ApiOperation({
    summary: 'Tải trang tin cũ hơn (cursor: before = id tin cũ nhất đang có)',
  })
  messages(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('before') before?: string,
  ) {
    return this.ticketService.getUserMessagePage(userId, id, before);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Gửi tin nhắn công khai' })
  // Chống spam/flood: tối đa 20 tin/phút/người trên endpoint này.
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UseGuards(ThrottlerGuard)
  addMessage(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.ticketService.addUserMessage(userId, id, dto);
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Đánh dấu đã đọc luồng hội thoại của tôi' })
  markRead(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MarkReadDto,
  ) {
    return this.ticketService.markThreadRead(userId, id, dto);
  }

  @Post(':id/reopen')
  @ApiOperation({
    summary: 'Người gửi mở lại ticket đã đóng (trong hạn cho phép)',
  })
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  @UseGuards(ThrottlerGuard)
  reopen(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReopenTicketDto,
  ) {
    return this.ticketService.reopenByUser(userId, id, dto.reason);
  }

  @Post(':id/survey')
  @ApiOperation({ summary: 'Gửi đánh giá hài lòng (CSAT)' })
  submitSurvey(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitSurveyDto,
  ) {
    return this.surveyService.submit(userId, id, dto);
  }

  @Post(':id/attachments')
  @ApiOperation({ summary: 'Upload ảnh bằng chứng' })
  @ApiConsumes('multipart/form-data')
  // Ảnh đi thẳng lên Cloudinary — giới hạn để không ai đốt quota bằng vòng lặp.
  @Throttle({ default: { limit: 30, ttl: 600_000 } })
  @UseGuards(ThrottlerGuard)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  uploadAttachment(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Thiếu file ảnh');
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      throw new BadRequestException('Chỉ chấp nhận ảnh JPEG/PNG');
    }
    if (file.size > MAX_SIZE) {
      throw new BadRequestException('Ảnh vượt quá 5MB');
    }
    return this.ticketService.uploadAttachment(userId, id, file);
  }
}
