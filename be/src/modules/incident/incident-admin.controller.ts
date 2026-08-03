import {
  BadRequestException,
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
import { IncidentAdminService } from './services/incident-admin.service';
import { IncidentDecisionService } from './services/incident-decision.service';
import { CompensationExecutorService } from './services/compensation-executor.service';
import { IncidentAutomationService } from './services/incident-automation.service';
import { IncidentConfigService } from './services/incident-config.service';
import { QueryAdminIncidentDto } from './dto/query-admin-incident.dto';
import { AcceptIncidentDto } from './dto/accept-incident.dto';
import { CreateFromTicketDto } from './dto/create-from-ticket.dto';
import {
  SaveIncidentDecisionDto,
  SendDecisionToTaskerDto,
} from './dto/save-incident-decision.dto';
import { FinalizeIncidentDecisionDto } from './dto/finalize-incident-decision.dto';
import { WithdrawDecisionDto } from './dto/withdraw-decision.dto';
import { ReverseCompensationDto } from './dto/reverse-compensation.dto';
import { ManualCompensateDto } from './dto/manual-compensate.dto';
import { WriteOffDebtDto } from './dto/write-off-debt.dto';
import { IncidentEvidenceLifecycleService } from './services/incident-evidence-lifecycle.service';
import { IncidentReconciliationService } from './services/incident-reconciliation.service';
import { IncidentEvidencePurpose } from 'src/common/enums/incident-evidence-purpose.enum';

const PROOF_ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/jpg'];
const PROOF_MAX_SIZE = 5 * 1024 * 1024;

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
    private readonly reconciliation_: IncidentReconciliationService,
    private readonly evidenceLifecycle: IncidentEvidenceLifecycleService,
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

  @Get('reconciliation')
  @ApiOperation({
    summary: 'P2 — Đối soát allocation ↔ bút toán ví (audit tiền bồi thường)',
  })
  reconciliation() {
    return this.reconciliation_.reconcile();
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
  @ApiOperation({ summary: 'Tiếp nhận thẩm định (REPORTED → REVIEWING)' })
  accept(
    @CurrentUser('id') adminUserId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AcceptIncidentDto,
  ) {
    return this.adminService.accept(adminUserId, id, dto);
  }

  @Put(':id/decision')
  @ApiOperation({
    summary:
      'Soạn/sửa quyết định (gộp thẩm định hạng mục + duyệt tiền + phân bổ)',
  })
  saveDecision(
    @CurrentUser('id') adminUserId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaveIncidentDecisionDto,
  ) {
    return this.decisionService.saveDecision(adminUserId, id, dto);
  }

  @Post(':id/decision/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Gửi quyết định dự kiến cho Tasker phản biện (khi Tasker chịu tiền)',
  })
  sendDecisionToTasker(
    @CurrentUser('id') adminUserId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendDecisionToTaskerDto,
  ) {
    return this.decisionService.sendToTasker(adminUserId, id, dto);
  }

  @Post(':id/decision/finalize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Chốt quyết định (một Admin, không duyệt cấp 2)' })
  finalizeDecision(
    @CurrentUser('id') adminUserId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: FinalizeIncidentDecisionDto,
  ) {
    return this.decisionService.finalizeDecision(adminUserId, id, dto);
  }

  @Post(':id/decision/withdraw')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Thu hồi quyết định đã chốt nhưng CHƯA chi trả, mở lại để soạn/chốt lại',
  })
  withdrawDecision(
    @CurrentUser('id') adminUserId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: WithdrawDecisionDto,
  ) {
    return this.decisionService.withdrawDecision(adminUserId, id, dto);
  }

  @Post(':id/compensate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Chi trả bồi thường (chuyển tiền thật qua ví)' })
  compensate(
    @CurrentUser('id') adminUserId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.compensationExecutor.execute(adminUserId, id);
  }

  @Post(':id/compensation/reverse')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Thu hồi/đảo bồi thường đã chi (trong 72h), mở lại để soạn quyết định mới',
  })
  reverseCompensation(
    @CurrentUser('id') adminUserId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReverseCompensationDto,
  ) {
    return this.compensationExecutor.reverse(
      adminUserId,
      id,
      dto.reason,
      dto.expectedDecisionVersion,
    );
  }

  @Post(':id/debt/write-off')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Xoá nợ bồi thường không thu hồi được (nền tảng chịu mất) — mở lối đóng hồ sơ',
  })
  writeOffDebt(
    @CurrentUser('id') adminUserId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: WriteOffDebtDto,
  ) {
    return this.adminService.writeOffDebt(adminUserId, id, dto.reason);
  }

  @Post('evidences/transfer-proof')
  @ApiOperation({
    summary: 'P0.4 — Upload ảnh minh chứng chuyển khoản (chi trả thủ công)',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: PROOF_MAX_SIZE },
    }),
  )
  uploadTransferProof(
    @CurrentUser('id') adminUserId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Thiếu ảnh minh chứng');
    if (!PROOF_ALLOWED_MIME.includes(file.mimetype)) {
      throw new BadRequestException('Chỉ chấp nhận ảnh (jpg/png)');
    }
    return this.evidenceLifecycle.uploadDetachedEvidence(adminUserId, file, {
      purpose: IncidentEvidencePurpose.COMPENSATION_TRANSFER_PROOF,
      visibility: 'ADMIN_ONLY',
    });
  }

  @Post(':id/compensate/manual')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'P0.4 — Chi trả thủ công (chuyển khoản ngoài + ảnh minh chứng) khi quỹ SYSTEM không đủ',
  })
  compensateManual(
    @CurrentUser('id') adminUserId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ManualCompensateDto,
  ) {
    return this.compensationExecutor.executeManual(
      adminUserId,
      id,
      dto.proofEvidenceId,
      dto.note,
    );
  }

  @Patch(':id/unlock-reporter')
  @ApiOperation({ summary: 'Gỡ khóa quyền báo cáo cho Customer (khai gian)' })
  unlockReporter(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.unlockReporter(id);
  }
}
