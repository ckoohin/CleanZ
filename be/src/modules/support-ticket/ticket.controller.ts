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
  UseInterceptors,
} from '@nestjs/common';
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

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết ticket (ẩn ghi chú nội bộ)' })
  findOne(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ticketService.findOneForUser(userId, id);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Gửi tin nhắn công khai' })
  addMessage(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.ticketService.addUserMessage(userId, id, dto);
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
