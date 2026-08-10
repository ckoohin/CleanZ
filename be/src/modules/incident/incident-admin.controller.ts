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
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
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
import {
  ExportIncidentListDto,
  ExportIncidentReportDto,
} from './dto/export-incident.dto';
import { IncidentReportService } from './services/incident-report.service';
import {
  buildReportWorkbookBuffer,
  excelFilename,
} from 'src/common/helpers/excel-report.helper';
import { AdminActivityService } from 'src/modules/admin/services/admin-activity.service';
import { AdminActivityStatus } from 'src/modules/admin/entities/admin-activity-log.entity';
import { AuditActionCode } from 'src/modules/admin/audit/audit-action-codes';
import { AuditAction } from 'src/modules/admin/audit/audit-action.decorator';
import { AuditSeverity } from 'src/common/enums/audit-severity.enum';
import { sanitizeAuditValue } from 'src/modules/admin/utils/admin-activity-sanitizer';
import type { AuthUser } from 'src/modules/auth/types/AuthRequest';

const PROOF_ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/jpg'];
const PROOF_MAX_SIZE = 5 * 1024 * 1024;

/**
 * Số lần xuất Excel tối đa mỗi phút cho một admin. Dựng workbook là việc nặng
 * và ĐỒNG BỘ (đo ở module phiếu hỗ trợ: ~1,1 giây CPU + ~210MB RSS cho 5.000
 * dòng), trong quãng đó event loop đứng và mọi request khác phải chờ.
 */
const EXPORT_RATE_LIMIT = 5;

@Controller('admin/incidents')
@ApiTags('Admin Incidents')
@ApiBearerAuth('access-token')
@Auth(UserRole.ADMIN)
export class IncidentAdminController {
  private readonly logger = new Logger(IncidentAdminController.name);

  constructor(
    private readonly adminService: IncidentAdminService,
    private readonly reportService: IncidentReportService,
    private readonly activityService: AdminActivityService,
    private readonly decisionService: IncidentDecisionService,
    private readonly compensationExecutor: CompensationExecutorService,
    private readonly automation: IncidentAutomationService,
    private readonly config: IncidentConfigService,
    private readonly reconciliation_: IncidentReconciliationService,
    private readonly evidenceLifecycle: IncidentEvidenceLifecycleService,
  ) {}

  // ─── Xuất Excel ───────────────────────────────────────────────────────────
  // Khai báo TRƯỚC `@Get(':id')`: Nest match route theo thứ tự khai báo.

  /**
   * Ghi nhật ký cho một lần xuất file.
   *
   * `AdminActivityInterceptor` chỉ tự ghi log các method GHI, mà xuất Excel là
   * `GET` — nên phải ghi tay. Đây là hành động đưa dữ liệu bồi thường và thông
   * tin cá nhân ra khỏi hệ thống, cần trả lời được "ai lấy, lấy gì, lúc nào".
   */
  private async auditExport(
    admin: AuthUser,
    action: string,
    path: string,
    handler: string,
    filters: Record<string, unknown>,
    durationMs: number,
  ) {
    const safeFilters = sanitizeAuditValue(filters) as Record<string, unknown>;
    try {
      await this.activityService.record({
        actorUserId: admin.id,
        actorEmail: admin.email,
        action,
        actionCode: AuditActionCode.EXPORT_INCIDENTS,
        severity: AuditSeverity.READ_SENSITIVE,
        resource: 'sự cố',
        method: 'GET',
        path,
        handler,
        targetId: null,
        targetType: 'INCIDENT',
        changes: { filters: safeFilters },
        status: AdminActivityStatus.SUCCESS,
        statusCode: 200,
        errorMessage: null,
        durationMs,
      });
    } catch (error) {
      // File đã gửi đi rồi mới ghi log — ném lỗi ở đây thì Nest cố trả response
      // lần hai trên một request đã kết thúc, ồn ào mà không cứu được gì.
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
    summary: 'Xuất Excel: danh sách sự cố theo đúng bộ lọc hàng đợi',
    description:
      'Bỏ phân trang, trả toàn bộ tập khớp bộ lọc (tối đa 5.000 dòng). Không kèm bằng chứng, giải trình hay ghi chú nội bộ.',
  })
  async exportList(
    @CurrentUser() admin: AuthUser,
    @Query() query: ExportIncidentListDto,
    @Res() res: Response,
  ) {
    const startedAt = Date.now();
    const sheet = await this.reportService.buildIncidentListSheet(query);
    const buffer = await buildReportWorkbookBuffer([sheet]);
    this.sendWorkbook(res, buffer, 'danh-sach-su-co');
    await this.auditExport(
      admin,
      'Xuất Excel danh sách sự cố',
      '/api/v1/admin/incidents/export/list',
      'IncidentAdminController.exportList',
      { ...query, rowCount: sheet.rows.length },
      Date.now() - startedAt,
    );
  }

  @Get('export/report')
  @Throttle({ default: { limit: EXPORT_RATE_LIMIT, ttl: 60_000 } })
  @UseGuards(ThrottlerGuard)
  @ApiOperation({
    summary: 'Xuất Excel: báo cáo sự cố (thẩm định, trách nhiệm, dòng tiền)',
  })
  async exportReport(
    @CurrentUser() admin: AuthUser,
    @Query() query: ExportIncidentReportDto,
    @Res() res: Response,
  ) {
    const startedAt = Date.now();
    const sheets = await this.reportService.buildReportSheets(query);
    const buffer = await buildReportWorkbookBuffer(sheets);
    this.sendWorkbook(res, buffer, 'bao-cao-su-co');
    await this.auditExport(
      admin,
      'Xuất Excel báo cáo sự cố',
      '/api/v1/admin/incidents/export/report',
      'IncidentAdminController.exportReport',
      query as unknown as Record<string, unknown>,
      Date.now() - startedAt,
    );
  }

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

  @AuditAction({
    code: AuditActionCode.INCIDENT_CONFIG_UPDATE,
    severity: AuditSeverity.HIGH,
    targetType: 'INCIDENT_CONFIG',
  })
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

  @AuditAction({
    code: AuditActionCode.INCIDENT_RUN_HOUSEKEEPING,
    severity: AuditSeverity.NORMAL,
    targetType: 'INCIDENT',
  })
  @Post('run-housekeeping')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Chạy housekeeping (EXPIRED + auto-close)' })
  runHousekeeping() {
    return this.automation.runHousekeeping();
  }

  @AuditAction({
    code: AuditActionCode.INCIDENT_CREATE_FROM_TICKET,
    severity: AuditSeverity.HIGH,
    targetType: 'INCIDENT',
    extract: ({ params, body, result }) => ({
      ticketId: params.ticketId,
      claimedAmount: body.claimedAmount ?? null,
      incidentId: result?.id ?? null,
    }),
  })
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

  @AuditAction({
    code: AuditActionCode.INCIDENT_ACCEPT,
    severity: AuditSeverity.NORMAL,
    targetType: 'INCIDENT',
    reasonField: 'note',
    extract: ({ params }) => ({ incidentId: params.id }),
  })
  @Patch(':id/accept')
  @ApiOperation({ summary: 'Tiếp nhận thẩm định (REPORTED → REVIEWING)' })
  accept(
    @CurrentUser('id') adminUserId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AcceptIncidentDto,
  ) {
    return this.adminService.accept(adminUserId, id, dto);
  }

  /**
   * Soạn quyết định: nơi chốt AI CHỊU BAO NHIÊU. Diff `IncidentEntity` bắt được
   * các cột phân bổ, nhưng khai báo tường minh mới cho phép lọc nhanh những hồ sơ
   * bị sửa phân bổ trách nhiệm nhiều lần — dấu hiệu đáng xem lại.
   */
  @AuditAction({
    code: AuditActionCode.INCIDENT_DECISION_DRAFT,
    severity: AuditSeverity.CRITICAL,
    targetType: 'INCIDENT',
    reasonField: 'responsibilityReason',
    // Tên field phải khớp `SaveIncidentDecisionDto`: `responsibilityParty` (không
    // phải `responsibleParty`), và DTO này KHÔNG nhận `approvedCompensationAmount`
    // — số tiền duyệt được suy ra từ các hạng mục, nên phải đọc ở kết quả trả về.
    extract: ({ params, body, result }) => ({
      incidentId: params.id,
      responsibilityParty: body.responsibilityParty ?? null,
      taskerBorneAmount: body.taskerBorneAmount ?? null,
      platformBorneAmount: body.platformBorneAmount ?? null,
      allocationReason: body.allocationReason ?? null,
      approvedAmount: result?.approvedCompensationAmount ?? null,
    }),
  })
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

  @AuditAction({
    code: AuditActionCode.INCIDENT_DECISION_SEND,
    severity: AuditSeverity.HIGH,
    targetType: 'INCIDENT',
    extract: ({ params }) => ({ incidentId: params.id }),
  })
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

  @AuditAction({
    code: AuditActionCode.INCIDENT_DECISION_FINALIZE,
    severity: AuditSeverity.CRITICAL,
    targetType: 'INCIDENT',
    extract: ({ params, result }) => ({
      incidentId: params.id,
      finalStatus: result?.status ?? null,
      approvedAmount: result?.approvedCompensationAmount ?? null,
    }),
  })
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

  @AuditAction({
    code: AuditActionCode.INCIDENT_DECISION_WITHDRAW,
    severity: AuditSeverity.CRITICAL,
    targetType: 'INCIDENT',
    reasonField: 'reason',
    extract: ({ params }) => ({ incidentId: params.id }),
  })
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

  /**
   * Chuyển tiền thật. Diff `IncidentEntity` KHÔNG nhìn thấy các bút toán ví và
   * khoản nợ Tasker do lệnh này sinh ra — chúng nằm ở `wallet_transactions` và
   * `tasker_debts`. `correlationId` là thứ nối chúng lại với dòng nhật ký này.
   */
  @AuditAction({
    code: AuditActionCode.INCIDENT_COMPENSATE,
    severity: AuditSeverity.CRITICAL,
    targetType: 'INCIDENT',
    extract: ({ params, result }) => ({
      incidentId: params.id,
      approvedAmount: result?.approvedCompensationAmount ?? null,
      compensationSource: result?.compensationSource ?? null,
    }),
  })
  @Post(':id/compensate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Chi trả bồi thường (chuyển tiền thật qua ví)' })
  compensate(
    @CurrentUser('id') adminUserId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.compensationExecutor.execute(adminUserId, id);
  }

  @AuditAction({
    code: AuditActionCode.INCIDENT_COMPENSATION_REVERSE,
    severity: AuditSeverity.CRITICAL,
    targetType: 'INCIDENT',
    reasonField: 'reason',
    extract: ({ params, body }) => ({
      incidentId: params.id,
      expectedDecisionVersion: body.expectedDecisionVersion ?? null,
    }),
  })
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

  /**
   * Nền tảng chấp nhận mất tiền. Không đảo ngược được và không bên nào ở ngoài
   * phản đối được, nên đây là loại quyết định mà nhật ký là đối trọng duy nhất.
   */
  @AuditAction({
    code: AuditActionCode.INCIDENT_DEBT_WRITE_OFF,
    severity: AuditSeverity.CRITICAL,
    targetType: 'INCIDENT',
    reasonField: 'reason',
    extract: ({ params }) => ({ incidentId: params.id }),
  })
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

  // Ảnh minh chứng chuyển khoản là bằng chứng DUY NHẤT cho một khoản chi trả
  // thủ công — bản thân việc tải nó lên cần có vết.
  @AuditAction({
    code: AuditActionCode.INCIDENT_TRANSFER_PROOF_UPLOAD,
    severity: AuditSeverity.HIGH,
    targetType: 'INCIDENT_EVIDENCE',
    extract: ({ result }) => ({ evidenceId: result?.id ?? null }),
  })
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

  @AuditAction({
    code: AuditActionCode.INCIDENT_COMPENSATE_MANUAL,
    severity: AuditSeverity.CRITICAL,
    targetType: 'INCIDENT',
    reasonField: 'note',
    extract: ({ params, body, result }) => ({
      incidentId: params.id,
      proofEvidenceId: body.proofEvidenceId ?? null,
      approvedAmount: result?.approvedCompensationAmount ?? null,
    }),
  })
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

  @AuditAction({
    code: AuditActionCode.INCIDENT_UNLOCK_REPORTER,
    severity: AuditSeverity.HIGH,
    targetType: 'INCIDENT',
    extract: ({ params }) => ({ incidentId: params.id }),
  })
  @Patch(':id/unlock-reporter')
  @ApiOperation({ summary: 'Gỡ khóa quyền báo cáo cho Customer (khai gian)' })
  unlockReporter(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.unlockReporter(id);
  }
}
