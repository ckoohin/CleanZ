import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
} from '@nestjs/swagger';
import { FinanceService } from './services/finance.service';
import { UserRole } from '../../common/enums/user-role.enum';
import {
  successResponse,
  paginatedResponse,
} from '../../common/helpers/response.helper';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Auth } from '../auth/decorators/auth.decorator';
import { RevenueQueryDto } from './dto/revenue-query.dto';
import { RevenuePayrollQueryDto } from './dto/revenue-payroll-query.dto';
import { WalletTransactionListQueryDto } from '../wallet/dto/wallet-transaction-list-query.dto';
import { ManualAdjustmentDto } from './dto/manual-adjustment.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { WithdrawalListQueryDto } from './dto/with-drawal-list-query.dto';
import { ReviewWithdrawalDto } from './dto/review-with-drawal.dto';
import { TransactionFlowSummaryQueryDto } from './dto/transaction-flow-summary-query.dto';
import { CustomerSpendingQueryDto } from './dto/customer-spending-query.dto';
import type { JwtPayload } from '../auth/types/JwtPayLoad';
import { AuditAction } from '../admin/audit/audit-action.decorator';
import { AuditActionCode } from '../admin/audit/audit-action-codes';
import { AuditSeverity } from '../../common/enums/audit-severity.enum';

@ApiTags('Admin – Finance')
@ApiBearerAuth()
// Finance Admin Controller
@UseGuards(JwtAuthGuard, RolesGuard)
@Auth(UserRole.ADMIN)
@Controller('admin/finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Financial overview: balances, pending withdrawals',
  })
  @ApiOkResponse()
  async getOverview() {
    return successResponse(await this.financeService.getFinancialOverview());
  }

  @Get('revenue-payroll')
  @ApiOperation({ summary: 'Itemized revenue payroll breakdown table' })
  async getRevenuePayroll(@Query() query: RevenuePayrollQueryDto) {
    const result = await this.financeService.getRevenuePayroll(query);
    return paginatedResponse(
      result.items,
      result.total,
      result.page,
      result.limit,
    );
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Revenue summary grouped by day/week/month' })
  async getRevenue(@Query() query: RevenueQueryDto) {
    return successResponse(await this.financeService.getRevenueSummary(query));
  }

  @Get('transactions')
  @ApiOperation({
    summary: 'List wallet transactions with filtering & pagination',
  })
  async findTransactions(@Query() query: WalletTransactionListQueryDto) {
    const result = await this.financeService.findAllTransactions(query);
    return paginatedResponse(
      result.items,
      result.total,
      result.page,
      result.limit,
    );
  }

  @Get('transactions/summary')
  @ApiOperation({
    summary: 'Totals of deposit/payment/refund/withdraw flows by date range',
  })
  async getTransactionSummary(@Query() query: TransactionFlowSummaryQueryDto) {
    return successResponse(
      await this.financeService.getTransactionFlowSummary(query),
    );
  }

  @Get('customers/spending')
  @ApiOperation({
    summary: 'Customers ranked by total spending on completed bookings',
  })
  async getCustomerSpending(@Query() query: CustomerSpendingQueryDto) {
    const result = await this.financeService.getCustomerSpending(query);
    return paginatedResponse(
      result.items,
      result.total,
      result.page,
      result.limit,
    );
  }

  @AuditAction({
    code: AuditActionCode.CUSTOMER_FINANCE_VIEW,
    severity: AuditSeverity.READ_SENSITIVE,
    targetType: 'CUSTOMER',
    extract: ({ params }) => ({ customerId: params.customerId }),
  })
  @Get('customers/:customerId/wallet-overview')
  @ApiOperation({
    summary:
      'Get 360-degree wallet and financial overview for a specific customer',
  })
  async getCustomerWalletOverview(
    @Param('customerId', ParseUUIDPipe) customerId: string,
  ) {
    const data =
      await this.financeService.getCustomerWalletOverview(customerId);
    return successResponse(data);
  }

  @AuditAction({
    code: AuditActionCode.CUSTOMER_FINANCE_VIEW,
    severity: AuditSeverity.READ_SENSITIVE,
    targetType: 'CUSTOMER',
    extract: ({ params }) => ({ customerId: params.customerId }),
  })
  @Get('customers/:customerId/transactions')
  @ApiOperation({ summary: 'Get wallet transactions for a specific customer' })
  async getCustomerWalletTransactions(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query() query: WalletTransactionListQueryDto,
  ) {
    const result = await this.financeService.getCustomerWalletTransactions(
      customerId,
      query,
    );
    return paginatedResponse(
      result.items,
      result.total,
      result.page,
      result.limit,
    );
  }

  @AuditAction({
    code: AuditActionCode.CUSTOMER_FINANCE_VIEW,
    severity: AuditSeverity.READ_SENSITIVE,
    targetType: 'CUSTOMER',
    extract: ({ params }) => ({ customerId: params.customerId }),
  })
  @Get('customers/:customerId/topups')
  @ApiOperation({
    summary:
      'Lịch sử đơn nạp ví của một khách hàng (PayOS, kèm đơn cũ PayPal/Adyen)',
  })
  async getCustomerTopups(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const result = await this.financeService.getCustomerTopups(customerId, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
      search,
      status,
      fromDate,
      toDate,
    });
    return paginatedResponse(
      result.items,
      result.total,
      result.page,
      result.limit,
    );
  }

  // [TẠM TẮT] Rút tiền phía Customer — route xem lịch sử rút của một khách.
  // Xem ghi chú ở đầu `wallet/customer-withdrawal.controller.ts`.
  // @AuditAction({
  //   code: AuditActionCode.CUSTOMER_FINANCE_VIEW,
  //   severity: AuditSeverity.READ_SENSITIVE,
  //   targetType: 'CUSTOMER',
  //   extract: ({ params }) => ({ customerId: params.customerId }),
  // })
  // @Get('customers/:customerId/withdrawals')
  // @ApiOperation({
  //   summary: 'Get customer withdrawal requests for a specific customer',
  // })
  // async getCustomerWithdrawals(
  //   @Param('customerId', ParseUUIDPipe) customerId: string,
  //   @Query('page') page?: string,
  //   @Query('limit') limit?: string,
  // ) {
  //   const result = await this.financeService.getCustomerWithdrawals(
  //     customerId,
  //     page ? Number(page) : 1,
  //     limit ? Number(limit) : 10,
  //   );
  //   return paginatedResponse(
  //     result.items,
  //     result.total,
  //     result.page,
  //     result.limit,
  //   );
  // }

  @Get('customers/:customerId/service-breakdown')
  @ApiOperation({ summary: 'Get spending breakdown by service for a customer' })
  async getCustomerServiceBreakdown(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const data = await this.financeService.getCustomerServiceBreakdown(
      customerId,
      from,
      to,
    );
    return successResponse(data);
  }

  /**
   * Đường duy nhất cho phép admin đổi số dư ví bằng tay, nên là thao tác đáng ghi
   * nhất trong toàn hệ thống. Diff theo-row không mô tả được nó: bút toán là bản
   * ghi MỚI (không có "trước"), còn thứ thực sự thay đổi — `wallets.balance` —
   * lại nằm ở bảng khác. Vì thế phải rút tay `balanceBefore/After`.
   */
  @AuditAction({
    code: AuditActionCode.WALLET_MANUAL_ADJUSTMENT,
    severity: AuditSeverity.CRITICAL,
    targetType: 'WALLET',
    reasonField: 'description',
    extract: ({ body, result }) => ({
      walletId: body.walletId,
      requestedAmount: body.amount,
      transactionType: body.type,
      transactionId: result?.id ?? null,
      balanceBefore: result?.balanceBefore ?? null,
      balanceAfter: result?.balanceAfter ?? null,
    }),
  })
  @Post('transactions/adjustment')
  @ApiOperation({
    summary:
      'Create a manual wallet adjustment (compensation, correction, etc.)',
  })
  async createAdjustment(
    @Body() dto: ManualAdjustmentDto,
    @CurrentUser() admin: JwtPayload,
  ) {
    const data = await this.financeService.createManualAdjustment(
      dto,
      admin.sub,
    );
    return successResponse(data, 'Adjustment recorded');
  }

  @AuditAction({
    code: AuditActionCode.WALLET_VIEW,
    severity: AuditSeverity.READ_SENSITIVE,
    targetType: 'WALLET',
    extract: ({ params }) => ({ walletId: params.id }),
  })
  @Get('wallets/:id')
  @ApiOperation({ summary: 'Get wallet details by ID' })
  async getWallet(@Param('id', ParseUUIDPipe) id: string) {
    return successResponse(await this.financeService.getWalletById(id));
  }

  @Get('withdrawals')
  @ApiOperation({ summary: 'List tasker withdrawal requests' })
  async findWithdrawals(@Query() query: WithdrawalListQueryDto) {
    const result = await this.financeService.findAllWithdrawals(query);
    return paginatedResponse(
      result.items,
      result.total,
      result.page,
      result.limit,
    );
  }

  @Get('withdrawals/:id')
  @ApiOperation({ summary: 'Get withdrawal request detail' })
  async findOneWithdrawal(@Param('id', ParseUUIDPipe) id: string) {
    return successResponse(await this.financeService.findOneWithdrawal(id));
  }

  /**
   * Snapshot đã diff được `WithdrawalRequestEntity`, nhưng diff chỉ nói trạng thái
   * đổi từ PENDING sang APPROVED. Số tiền và tài khoản nhận — hai dữ kiện đầu tiên
   * người điều tra một khiếu nại "tiền không về" cần — thì phải rút ra riêng.
   */
  @AuditAction({
    code: AuditActionCode.TASKER_WITHDRAWAL_REVIEW,
    severity: AuditSeverity.CRITICAL,
    targetType: 'WITHDRAWAL_REQUEST',
    reasonField: 'note',
    extract: ({ params, body, result }) => ({
      withdrawalId: params.id,
      decision: body.status,
      amount: result?.amount ?? null,
      bankName: result?.bankName ?? null,
      hasTransferProof: Boolean(body.proofImageUrl),
    }),
  })
  @Patch('withdrawals/:id/review')
  @ApiOperation({ summary: 'Approve or reject a withdrawal request' })
  async reviewWithdrawal(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewWithdrawalDto,
  ) {
    const data = await this.financeService.reviewWithdrawal(id, dto);
    return successResponse(data, `Withdrawal ${dto.status.toLowerCase()}`);
  }

  // Ghép chéo toàn bộ bảng liên quan: khách, booking, địa chỉ phục vụ, đơn nạp.
  // Một bút toán mở ra gần như toàn bộ hồ sơ của một người.
  @AuditAction({
    code: AuditActionCode.WALLET_TRANSACTION_VIEW,
    severity: AuditSeverity.READ_SENSITIVE,
    targetType: 'WALLET_TRANSACTION',
    extract: ({ params }) => ({ transactionId: params.id }),
  })
  @Get('transactions/:id/detail')
  @ApiOperation({
    summary: 'Get full transaction detail joined across all related tables',
  })
  async getTransactionDetail(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.financeService.getTransactionDetail(id);
    return successResponse(data);
  }
}
