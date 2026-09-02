import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from 'src/common/enums/user-role.enum';
import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BankStatementService } from './services/bank-statement.service';
import {
  BankStatementReasonDto,
  ImportBankStatementDto,
  MatchBankStatementDto,
  QueryBankStatementDto,
} from './dto/bank-statement.dto';
import { AuditActionCode } from 'src/modules/admin/audit/audit-action-codes';
import { AuditAction } from 'src/modules/admin/audit/audit-action.decorator';
import { AuditSeverity } from 'src/common/enums/audit-severity.enum';

/**
 * Sao kê ngân hàng — đối chiếu độc lập cho các khoản bồi thường chi trả thủ công.
 *
 * Đặt ở prefix RIÊNG chứ không nhét vào `admin/incidents`: ở đó `@Get(':id')` sẽ nuốt mọi
 * route con khai báo sau nó, và đây cũng là dữ liệu của ngân hàng chứ không phải của một
 * sự cố cụ thể — nhiều dòng sao kê sẽ không thuộc về sự cố nào.
 */
@Controller('admin/bank-statement')
@ApiTags('Admin Bank Statement')
@ApiBearerAuth('access-token')
@Auth(UserRole.ADMIN)
export class BankStatementController {
  constructor(private readonly service: BankStatementService) {}

  @AuditAction({
    code: AuditActionCode.BANK_STATEMENT_IMPORT,
    severity: AuditSeverity.HIGH,
    targetType: 'BANK_STATEMENT',
    extract: ({ result }) => ({
      parsed: result?.parsed ?? null,
      inserted: result?.inserted ?? null,
      duplicated: result?.duplicated ?? null,
    }),
  })
  @Post('import')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Nhập sao kê ngân hàng (CSV)',
    description:
      'Cột bắt buộc: mã giao dịch (bank_ref/ma_gd), ngày giao dịch (txn_at/ngay_gd), số tiền (amount/so_tien). ' +
      'Tuỳ chọn: chiều tiền (direction/chieu — bỏ trống thì suy từ dấu của số tiền), tài khoản/tên đối ứng, nội dung. ' +
      'Dòng trùng mã giao dịch được bỏ qua, nên nhập lại cùng một file là thao tác an toàn.',
  })
  import(
    @CurrentUser('id') adminUserId: string,
    @Body() dto: ImportBankStatementDto,
  ) {
    return this.service.import(adminUserId, dto.csv);
  }

  @Get('entries')
  @ApiOperation({
    summary: 'Danh sách dòng sao kê (lọc theo trạng thái/từ khoá)',
  })
  list(@Query() query: QueryBankStatementDto) {
    return this.service.list(query);
  }

  @Get('incident/:incidentId')
  @ApiOperation({
    summary: 'Các dòng sao kê đang là bằng chứng cho khoản chi của một sự cố',
  })
  forIncident(@Param('incidentId', ParseUUIDPipe) incidentId: string) {
    return this.service.listForIncident(incidentId);
  }

  @Get('suggestions/:incidentId')
  @ApiOperation({
    summary: 'Gợi ý dòng sao kê khớp với khoản chi ngoài của một sự cố',
  })
  suggestions(@Param('incidentId', ParseUUIDPipe) incidentId: string) {
    return this.service.suggestForIncident(incidentId);
  }

  // Khớp/gỡ khớp là thao tác trên BẰNG CHỨNG của một khoản tiền thật đã rời ngân hàng —
  // cùng hạng nghiêm trọng với chính lệnh chi.
  @AuditAction({
    code: AuditActionCode.BANK_STATEMENT_MATCH,
    severity: AuditSeverity.CRITICAL,
    targetType: 'BANK_STATEMENT',
    extract: ({ params, body }) => ({
      entryId: params.id,
      incidentId: body.incidentId ?? null,
    }),
  })
  @Post('entries/:id/match')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Khớp dòng sao kê với một sự cố đã chi thủ công' })
  match(
    @CurrentUser('id') adminUserId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MatchBankStatementDto,
  ) {
    return this.service.match(adminUserId, id, dto.incidentId);
  }

  @AuditAction({
    code: AuditActionCode.BANK_STATEMENT_UNMATCH,
    severity: AuditSeverity.CRITICAL,
    targetType: 'BANK_STATEMENT',
    reasonField: 'reason',
    extract: ({ params }) => ({ entryId: params.id }),
  })
  @Post('entries/:id/unmatch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gỡ khớp dòng sao kê (gắn nhầm sự cố)' })
  unmatch(
    @CurrentUser('id') adminUserId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BankStatementReasonDto,
  ) {
    return this.service.unmatch(adminUserId, id, dto.reason);
  }

  @AuditAction({
    code: AuditActionCode.BANK_STATEMENT_IGNORE,
    severity: AuditSeverity.NORMAL,
    targetType: 'BANK_STATEMENT',
    reasonField: 'reason',
    extract: ({ params }) => ({ entryId: params.id }),
  })
  @Post('entries/:id/ignore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đánh dấu dòng sao kê không liên quan bồi thường',
  })
  ignore(
    @CurrentUser('id') adminUserId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BankStatementReasonDto,
  ) {
    return this.service.ignore(adminUserId, id, dto.reason);
  }
}
