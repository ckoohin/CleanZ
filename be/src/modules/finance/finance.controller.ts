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
import { WalletTransactionListQueryDto } from '../wallet/dto/wallet-transaction-list-query.dto';
import { ManualAdjustmentDto } from './dto/manual-adjustment.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { WithdrawalListQueryDto } from './dto/with-drawal-list-query.dto';
import { ReviewWithdrawalDto } from './dto/review-with-drawal.dto';
import { TransactionFlowSummaryQueryDto } from './dto/transaction-flow-summary-query.dto';
import { CustomerSpendingQueryDto } from './dto/customer-spending-query.dto';
import type { JwtPayload } from '../auth/types/JwtPayLoad';
import { WalletTopupService } from '../wallet/wallet-topup.service';
import { TopupStatus } from '../../common/enums/topup-status.enum';

@ApiTags('Admin – Finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Auth(UserRole.ADMIN)
@Controller('admin/finance')
export class FinanceController {
  constructor(
    private readonly financeService: FinanceService,
    private readonly walletTopupService: WalletTopupService,
  ) {}

  @Get('topups')
  @ApiOperation({ summary: 'List wallet topup orders (PayPal/Adyen)' })
  async findTopups(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('provider') provider?: string,
    @Query('status') status?: TopupStatus,
  ) {
    const result = await this.walletTopupService.listAllTopups({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      provider,
      status,
    });
    return paginatedResponse(
      result.items,
      result.total,
      result.page,
      result.limit,
    );
  }

  @Post('topups/:id/refund')
  @ApiOperation({
    summary:
      'Refund a completed Adyen topup back to the original payment method',
  })
  async refundTopup(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: JwtPayload,
  ) {
    const result = await this.walletTopupService.refundTopup(id, admin.sub);
    return successResponse(result, 'Đã khởi tạo hoàn tiền đơn nạp');
  }

  @Get('overview')
  @ApiOperation({
    summary: 'Financial overview: balances, pending withdrawals',
  })
  @ApiOkResponse()
  async getOverview() {
    return successResponse(await this.financeService.getFinancialOverview());
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

  @Patch('withdrawals/:id/review')
  @ApiOperation({ summary: 'Approve or reject a withdrawal request' })
  async reviewWithdrawal(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewWithdrawalDto,
  ) {
    const data = await this.financeService.reviewWithdrawal(id, dto);
    return successResponse(data, `Withdrawal ${dto.status.toLowerCase()}`);
  }
}
