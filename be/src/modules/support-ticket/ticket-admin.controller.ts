import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { TicketMessageAudience } from 'src/common/enums/ticket-message-audience.enum';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/jpg'];
const MAX_SIZE = 5 * 1024 * 1024;
import { UserRole } from 'src/common/enums/user-role.enum';
import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TicketAdminService } from './services/ticket-admin.service';
import { AdminQueryTicketDto } from './dto/admin-query-ticket.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { AssignTicketDto, BulkAssignTicketDto } from './dto/assign-ticket.dto';
import { StatsQueryDto, STATS_DEFAULT_DAYS } from './dto/stats-query.dto';
import { TicketStatsService } from './services/ticket-stats.service';
import { ReclassifyTicketDto } from './dto/reclassify-ticket.dto';
import { CreateTicketAdminDto } from './dto/create-ticket-admin.dto';
import {
  CreateAdminMessageDto,
  CreateInternalNoteDto,
} from './dto/create-message.dto';
import { MarkReadAdminDto } from './dto/mark-read.dto';
import { CreateResolutionDto } from './dto/create-resolution.dto';
import { TicketResolutionService } from './services/ticket-resolution.service';
import { UpdateTicketConfigDto } from './dto/update-config.dto';
import { TicketConfigService } from './services/ticket-config.service';

@Controller('admin/support-tickets')
@ApiTags('Support Tickets (Admin)')
@ApiBearerAuth('access-token')
@Auth(UserRole.ADMIN)
export class TicketAdminController {
  constructor(
    private readonly adminService: TicketAdminService,
    private readonly resolutionService: TicketResolutionService,
    private readonly configService: TicketConfigService,
    private readonly statsService: TicketStatsService,
  ) {}

  @Get('config')
  @ApiOperation({
    summary: 'Đọc cấu hình ticket (SLA/category/auto-close/window)',
  })
  getConfig() {
    return this.configService.getEffectiveConfig();
  }

  @Put('config')
  @ApiOperation({ summary: 'Cập nhật cấu hình ticket (config dịch vụ)' })
  async updateConfig(@Body() dto: UpdateTicketConfigDto) {
    await this.configService.updateConfig(dto);
    return this.configService.getEffectiveConfig();
  }

  @Post()
  @ApiOperation({ summary: 'Tạo ticket hộ (hotline)' })
  create(
    @CurrentUser('id') adminId: string,
    @Body() dto: CreateTicketAdminDto,
  ) {
    return this.adminService.createOnBehalf(dto, adminId);
  }

  @Get()
  @ApiOperation({ summary: 'Hàng đợi ticket (filter/sort/phân trang)' })
  list(
    @CurrentUser('id') adminId: string,
    @Query() query: AdminQueryTicketDto,
  ) {
    return this.adminService.list(query, adminId);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Thống kê vận hành: SLA, thời gian xử lý, CSAT (mặc định 30 ngày)',
  })
  stats(@Query() query: StatsQueryDto) {
    const to = query.to ?? new Date();
    const from =
      query.from ??
      new Date(to.getTime() - STATS_DEFAULT_DAYS * 24 * 3600 * 1000);
    return this.statsService.getStats(from, to);
  }

  @Patch('bulk/assign')
  @ApiOperation({ summary: 'Gán hàng loạt ticket đang chọn ở hàng đợi' })
  bulkAssign(
    @CurrentUser('id') adminId: string,
    @Body() dto: BulkAssignTicketDto,
  ) {
    return this.adminService.bulkAssign(dto, adminId);
  }

  @Get('unread-total')
  @ApiOperation({ summary: 'Tổng số tin chưa đọc (badge) — admin' })
  unreadTotal(@CurrentUser('id') adminId: string) {
    return this.adminService.unreadTotal(adminId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết ticket đầy đủ (gồm internal note)' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.findOne(id);
  }

  @Patch(':id/assign')
  @ApiOperation({ summary: 'Gán/đổi admin xử lý' })
  assign(
    @CurrentUser('id') adminId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignTicketDto,
  ) {
    return this.adminService.assign(id, dto, adminId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Đổi trạng thái (state machine)' })
  changeStatus(
    @CurrentUser('id') adminId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeStatusDto,
  ) {
    return this.adminService.changeStatus(id, dto, adminId);
  }

  @Post(':id/attachments')
  @ApiOperation({
    summary: 'Admin upload ảnh đính kèm (lấy attachmentId để gắn vào reply)',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  uploadAttachment(
    @CurrentUser('id') adminId: string,
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
    return this.adminService.uploadAttachment(id, adminId, file);
  }

  @Get(':id/messages')
  @ApiOperation({
    summary:
      'Tải trang tin cũ hơn 1 luồng (audience=REPORTER|COUNTERPARTY, before=id)',
  })
  messages(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('audience') audience?: string,
    @Query('before') before?: string,
  ) {
    const aud =
      audience === TicketMessageAudience.COUNTERPARTY
        ? TicketMessageAudience.COUNTERPARTY
        : TicketMessageAudience.REPORTER;
    return this.adminService.getMessagePage(id, aud, before);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Gửi public reply / internal note (+tag)' })
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  @UseGuards(ThrottlerGuard)
  addMessage(
    @CurrentUser('id') adminId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateAdminMessageDto,
  ) {
    return this.adminService.addMessage(id, dto, adminId);
  }

  @Get(':id/internal-notes')
  @ApiOperation({ summary: 'Danh sách ghi chú nội bộ (log) của ticket' })
  listInternalNotes(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.listInternalNotes(id);
  }

  @Post(':id/internal-notes')
  @ApiOperation({ summary: 'Thêm ghi chú nội bộ (log) cho ticket' })
  addInternalNote(
    @CurrentUser('id') adminId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateInternalNoteDto,
  ) {
    return this.adminService.addInternalNote(id, dto.body, adminId);
  }

  @Post(':id/read')
  @ApiOperation({
    summary: 'Đánh dấu đã đọc 1 luồng (REPORTER/COUNTERPARTY/INTERNAL)',
  })
  markRead(
    @CurrentUser('id') adminId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MarkReadAdminDto,
  ) {
    return this.adminService.markThreadRead(id, dto, adminId);
  }

  @Post(':id/resolutions')
  @ApiOperation({ summary: 'Ghi nhận kết luận xử lý (tiền: record-only)' })
  addResolution(
    @CurrentUser('id') adminId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateResolutionDto,
  ) {
    return this.resolutionService.create(id, dto, adminId);
  }

  @Patch(':id/category')
  @ApiOperation({ summary: 'Phân loại lại ticket (cho OTHER)' })
  reclassify(
    @CurrentUser('id') adminId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReclassifyTicketDto,
  ) {
    return this.adminService.reclassify(id, dto, adminId);
  }
}
