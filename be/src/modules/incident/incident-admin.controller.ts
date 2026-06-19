import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from 'src/common/enums/user-role.enum';
import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IncidentAdminService } from './services/incident-admin.service';
import { IncidentDecisionService } from './services/incident-decision.service';
import { CompensationExecutorService } from './services/compensation-executor.service';
import { IncidentAutomationService } from './services/incident-automation.service';
import { IncidentConfigService } from './services/incident-config.service';
import { QueryAdminIncidentDto } from './dto/query-admin-incident.dto';
import { AcceptIncidentDto } from './dto/accept-incident.dto';
import { VerifyItemsDto } from './dto/verify-items.dto';
import { DecideIncidentDto } from './dto/decide-incident.dto';
import { CreateFromTicketDto } from './dto/create-from-ticket.dto';

@Controller('admin/incidents')
@ApiTags('Admin Incidents')
@ApiBearerAuth('access-token')
@Auth(UserRole.ADMIN)
export class IncidentAdminController {
  constructor(
    private readonly adminService: IncidentAdminService,
    private readonly decisionService: IncidentDecisionService,
    private readonly compensationExecutor: CompensationExecutorService,
    private readonly automation: IncidentAutomationService,
    private readonly config: IncidentConfigService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Hàng đợi sự cố (lọc/sắp xếp/phân trang)' })
  list(@Query() query: QueryAdminIncidentDto) {
    return this.adminService.list(query);
  }

  @Get('config')
  @ApiOperation({ summary: 'Đọc cấu hình incident (config dịch vụ)' })
  getConfig() {
    return this.config.getEffectiveConfig();
  }

  @Put('config')
  @ApiOperation({ summary: 'Cập nhật cấu hình incident (đổi runtime)' })
  async updateConfig(@Body() body: Record<string, string | number>) {
    await this.config.updateConfig(body);
    return this.config.getEffectiveConfig();
  }

  @Post('run-housekeeping')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Chạy housekeeping (EXPIRED + auto-close)' })
  runHousekeeping() {
    return this.automation.runHousekeeping();
  }

  @Post('from-ticket/:ticketId')
  @ApiOperation({
    summary: 'Nâng cấp Support Ticket PROPERTY_DAMAGE → Incident',
  })
  createFromTicket(
    @CurrentUser('id') adminUserId: string,
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Body() dto: CreateFromTicketDto,
  ) {
    return this.adminService.createFromTicket(adminUserId, ticketId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết sự cố (admin view đầy đủ)' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.findOne(id);
  }

  @Patch(':id/accept')
  @ApiOperation({
    summary: 'Tiếp nhận thẩm định (REPORTED → INVESTIGATING)',
  })
  accept(
    @CurrentUser('id') adminUserId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AcceptIncidentDto,
  ) {
    return this.adminService.accept(adminUserId, id, dto);
  }

  @Patch(':id/items/verify')
  @ApiOperation({ summary: 'Xác minh thiệt hại từng hạng mục' })
  verifyItems(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VerifyItemsDto,
  ) {
    return this.adminService.verifyItems(id, dto);
  }

  @Patch(':id/decide')
  @ApiOperation({
    summary: 'Quyết định (APPROVE: phân bổ nguồn / REJECT: lý do)',
  })
  decide(
    @CurrentUser('id') adminUserId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecideIncidentDto,
  ) {
    return this.decisionService.decide(adminUserId, id, dto);
  }

  @Patch(':id/approve-compensation')
  @ApiOperation({ summary: 'Duyệt cấp 2 (maker-checker) cho claim lớn' })
  approveCompensation(
    @CurrentUser('id') adminUserId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.decisionService.approveCompensation(adminUserId, id);
  }

  @Post(':id/compensate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Thực thi bồi thường (record-only — wallet mock Phase 1)',
  })
  compensate(
    @CurrentUser('id') adminUserId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.compensationExecutor.execute(adminUserId, id);
  }

  @Patch(':id/unlock-reporter')
  @ApiOperation({ summary: 'Gỡ khóa quyền báo cáo cho Customer (khai gian)' })
  unlockReporter(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.unlockReporter(id);
  }
}
