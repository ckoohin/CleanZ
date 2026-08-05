import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Logger,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
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

/**
 * Số lần xuất Excel tối đa mỗi phút cho một admin.
 *
 * Đo thực tế với đúng kích thước trần (5.000 dòng × 23 cột): một lần dựng file
 * chiếm ~1,1 GIÂY CPU và ~210MB RSS. ExcelJS ghi buffer đồng bộ nên trong quãng
 * đó event loop đứng — mọi request khác của cả hệ thống, kể cả chat realtime
 * của chính ticket, phải chờ. Đây là hai endpoint nặng nhất module mà lại là
 * hai endpoint duy nhất không có giới hạn, nên chặn tay ở đây.
 *
 * Đây vẫn chỉ là băng dán: cách đúng là ghi theo luồng bằng
 * `ExcelJS.stream.xlsx.WorkbookWriter` để không giữ cả workbook trong RAM.
 */
const EXPORT_RATE_LIMIT = 5;
import { UserRole } from 'src/common/enums/user-role.enum';
import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TicketAdminService } from './services/ticket-admin.service';
import { AdminQueryTicketDto } from './dto/admin-query-ticket.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { AssignTicketDto, BulkAssignTicketDto } from './dto/assign-ticket.dto';
import { StatsQueryDto, resolveStatsRange } from './dto/stats-query.dto';
import { TicketStatsService } from './services/ticket-stats.service';
import { ExportTicketListDto } from './dto/export-ticket.dto';
import { TicketReportService } from './services/ticket-report.service';
import {
  buildReportWorkbookBuffer,
  excelFilename,
} from 'src/common/helpers/excel-report.helper';
import { AdminActivityService } from 'src/modules/admin/services/admin-activity.service';
import { AdminActivityStatus } from 'src/modules/admin/entities/admin-activity-log.entity';
import { sanitizeAuditValue } from 'src/modules/admin/utils/admin-activity-sanitizer';
import type { AuthUser } from 'src/modules/auth/types/AuthRequest';
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
  private readonly logger = new Logger(TicketAdminController.name);

  constructor(
    private readonly adminService: TicketAdminService,
    private readonly resolutionService: TicketResolutionService,
    private readonly configService: TicketConfigService,
    private readonly statsService: TicketStatsService,
    private readonly reportService: TicketReportService,
    private readonly activityService: AdminActivityService,
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
    return this.statsService.getStats(...resolveStatsRange(query));
  }

  // ─── Xuất Excel ───────────────────────────────────────────────────────────
  // PHẢI khai báo trước `@Get(':id')`: Nest match route theo thứ tự khai báo.

  /**
   * Ghi nhật ký thao tác cho một lần xuất file.
   *
   * `AdminActivityInterceptor` chỉ tự ghi log các method GHI, mà xuất Excel là
   * `GET` — nên phải ghi tay. Đây là hành động đưa dữ liệu cá nhân của khách ra
   * khỏi hệ thống, cần trả lời được "ai lấy, lấy gì, lúc nào" khi có sự cố.
   */
  private async auditExport(
    admin: AuthUser,
    action: string,
    path: string,
    handler: string,
    filters: Record<string, unknown>,
    durationMs: number,
  ) {
    // Chạy qua đúng bộ lọc mà `AdminActivityInterceptor` dùng — ghi tay thì
    // không được bỏ qua bước này. Riêng `keyword` phải tự cắt: nó là ô tìm kiếm
    // tự do, admin hay dán thẳng số điện thoại hay email của khách vào, mà
    // sanitizer chỉ nhận ra qua TÊN khoá nên sẽ cho lọt. Ghi dữ liệu cá nhân
    // vào chính cái nhật ký lập ra để bảo vệ dữ liệu cá nhân thì thành vô nghĩa.
    const keyword =
      typeof filters.keyword === 'string' ? filters.keyword : undefined;
    const safeFilters = sanitizeAuditValue({
      ...filters,
      keyword: keyword ? `[đã ẩn, ${keyword.length} ký tự]` : undefined,
    }) as Record<string, unknown>;

    try {
      await this.activityService.record({
        actorUserId: admin.id,
        actorEmail: admin.email,
        action,
        resource: 'phiếu hỗ trợ',
        method: 'GET',
        path,
        handler,
        targetId: null,
        changes: { filters: safeFilters },
        status: AdminActivityStatus.SUCCESS,
        statusCode: 200,
        errorMessage: null,
        durationMs,
      });
    } catch (error) {
      // File đã gửi đi rồi mới ghi log. Ném lỗi ở đây thì Nest cố trả response
      // lần hai trên một request đã kết thúc — ồn ào mà không cứu được gì.
      this.logger.error(
        `Không ghi được nhật ký xuất file: ${(error as Error).message}`,
      );
    }
  }

  private sendWorkbook(res: Response, buffer: Buffer, reportName: string) {
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

  @Get('export/list')
  @Throttle({ default: { limit: EXPORT_RATE_LIMIT, ttl: 60_000 } })
  @UseGuards(ThrottlerGuard)
  @ApiOperation({
    summary: 'Xuất Excel: danh sách ticket theo đúng bộ lọc hàng đợi',
    description:
      'Bỏ phân trang, trả toàn bộ tập khớp bộ lọc (tối đa 5.000 dòng). Không kèm nội dung hội thoại.',
  })
  async exportList(
    @CurrentUser() admin: AuthUser,
    @Query() query: ExportTicketListDto,
    @Res() res: Response,
  ) {
    const startedAt = Date.now();
    const sheet = await this.reportService.buildTicketListSheet(query);
    const buffer = await buildReportWorkbookBuffer([sheet]);
    this.sendWorkbook(res, buffer, 'danh-sach-ticket');
    await this.auditExport(
      admin,
      'Xuất Excel danh sách phiếu hỗ trợ',
      '/api/v1/admin/support-tickets/export/list',
      'TicketAdminController.exportList',
      { ...query, rowCount: sheet.rows.length },
      Date.now() - startedAt,
    );
  }

  @Get('export/report')
  @Throttle({ default: { limit: EXPORT_RATE_LIMIT, ttl: 60_000 } })
  @UseGuards(ThrottlerGuard)
  @ApiOperation({
    summary: 'Xuất Excel: báo cáo vận hành (SLA, xử lý, CSAT, bồi hoàn)',
    description:
      'Số liệu lấy từ đúng các hàm mà dải chỉ số vận hành đang gọi, nên file khớp với những gì admin nhìn thấy.',
  })
  async exportReport(
    @CurrentUser() admin: AuthUser,
    @Query() query: StatsQueryDto,
    @Res() res: Response,
  ) {
    const startedAt = Date.now();
    const sheets = await this.reportService.buildReportSheets(query);
    const buffer = await buildReportWorkbookBuffer(sheets);

    this.sendWorkbook(res, buffer, 'bao-cao-ho-tro-khach-hang');
    await this.auditExport(
      admin,
      'Xuất Excel báo cáo vận hành phiếu hỗ trợ',
      '/api/v1/admin/support-tickets/export/report',
      'TicketAdminController.exportReport',
      query as unknown as Record<string, unknown>,
      Date.now() - startedAt,
    );
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
