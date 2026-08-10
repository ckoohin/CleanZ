import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiCreatedResponse } from '@nestjs/swagger';
import { AdminOnly } from 'src/modules/auth/decorators/admin-only.decorator';
import { VouchersService } from './services/vouchers.service';
import {
  successResponse,
  paginatedResponse,
} from '../../common/helpers/response.helper';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { VoucherListQueryDto } from './dto/list-query-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { IssueVoucherToCustomersDto } from './dto/issue-voucher-to-customer.dto';
import { AuditAction } from '../admin/audit/audit-action.decorator';
import { AuditActionCode } from '../admin/audit/audit-action-codes';
import { AuditSeverity } from 'src/common/enums/audit-severity.enum';

@AdminOnly()
@ApiTags('Admin – Vouchers')
@Controller('admin/vouchers')
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @AuditAction({
    code: AuditActionCode.VOUCHER_CREATE,
    severity: AuditSeverity.HIGH,
    targetType: 'VOUCHER',
  })
  @Post()
  @ApiOperation({ summary: 'Create a voucher' })
  @ApiCreatedResponse()
  async create(@Body() dto: CreateVoucherDto) {
    const voucher = await this.vouchersService.create(dto);
    return successResponse(voucher, 'Voucher created');
  }

  @Get()
  @ApiOperation({ summary: 'List vouchers with search & filtering' })
  async findAll(@Query() query: VoucherListQueryDto) {
    const result = await this.vouchersService.findAll(query);
    return paginatedResponse(
      result.items,
      result.total,
      result.page,
      result.limit,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get voucher by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const voucher = await this.vouchersService.findOne(id);
    return successResponse(voucher);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get voucher usage statistics' })
  async getStats(@Param('id', ParseUUIDPipe) id: string) {
    const stats = await this.vouchersService.getVoucherStats(id);
    return successResponse(stats);
  }

  @AuditAction({
    code: AuditActionCode.VOUCHER_UPDATE,
    severity: AuditSeverity.HIGH,
    targetType: 'VOUCHER',
  })
  @Patch(':id')
  @ApiOperation({ summary: 'Update a voucher' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVoucherDto,
  ) {
    const voucher = await this.vouchersService.update(id, dto);
    return successResponse(voucher, 'Voucher updated');
  }

  /**
   * Phát voucher là phát GIÁ TRỊ cho một danh sách khách cụ thể, và route không
   * mang id khách nào — danh sách trong body là manh mối duy nhất về việc ai đã
   * được nhận.
   */
  @AuditAction({
    code: AuditActionCode.VOUCHER_ISSUE,
    severity: AuditSeverity.HIGH,
    targetType: 'VOUCHER',
    affectedIdsField: 'customerIds',
    extract: ({ params, body }) => ({
      voucherId: params.id,
      recipientCount: Array.isArray(body.customerIds)
        ? body.customerIds.length
        : 0,
    }),
  })
  @Post(':id/issue')
  @ApiOperation({ summary: 'Issue voucher to a list of customers' })
  async issueToCustomers(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: IssueVoucherToCustomersDto,
  ) {
    const result = await this.vouchersService.issueToCustomers(id, dto);
    return successResponse(
      result,
      `Issued to ${result.issued} customers, skipped ${result.skipped}`,
    );
  }

  @AuditAction({
    code: AuditActionCode.VOUCHER_DELETE,
    severity: AuditSeverity.HIGH,
    targetType: 'VOUCHER',
    extract: ({ params }) => ({ voucherId: params.id }),
  })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a voucher' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.vouchersService.remove(id);
  }
}
