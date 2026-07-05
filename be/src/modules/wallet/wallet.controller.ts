import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiCreatedResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UserRole } from 'src/common/enums/user-role.enum';
import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  WalletResponse,
  WalletService,
  WalletTransactionListResponse,
} from './wallet.service';
import { WalletTransactionListQueryDto } from './dto/wallet-transaction-list-query.dto';
import { WalletListQueryDto } from './dto/wallet-list-query.dto';
import {
  paginatedResponse,
  successResponse,
} from 'src/common/helpers/response.helper';
import { CreateWithdrawalRequestDto } from './dto/create-withdrawal-request.dto';
import { WithdrawalRequestEntity } from '../finance/entity/withdrawal-request.entity';
import { WalletTopupService } from './wallet-topup.service';
import { CreateTopupDto } from './dto/create-topup.dto';
import { TopupListQueryDto } from './dto/topup-list-query.dto';
import { AdminCreditWalletDto } from './dto/admin-credit-wallet.dto';
import type { User } from '../users/entities/user.entity';

@Controller('wallet')
@ApiTags('Wallet')
@ApiBearerAuth('access-token')
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly walletTopupService: WalletTopupService,
  ) {}

  @Get('admin')
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin xem danh sách ví trong hệ thống' })
  async findAllWallets(@Query() query: WalletListQueryDto) {
    const result = await this.walletService.findAllWallets(query);
    return paginatedResponse(
      result.items,
      result.total,
      result.page,
      result.limit,
    );
  }

  @Post('admin/tasker/:taskerId/credit')
  @Auth(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Admin ghi nhận tasker nộp tiền mặt tại trụ sở (cộng thẳng vào ví)',
  })
  @ApiCreatedResponse({ description: 'Cộng tiền vào ví tasker thành công' })
  async adminCreditTaskerWallet(
    @CurrentUser() admin: User,
    @Param('taskerId', ParseUUIDPipe) taskerId: string,
    @Body() dto: AdminCreditWalletDto,
  ) {
    const wallet = await this.walletService.adminCreditTaskerWallet(
      { id: admin.id, email: admin.email },
      taskerId,
      dto,
    );
    return successResponse(wallet, 'Đã cộng tiền vào ví tasker');
  }

  @Get('admin/tasker/:taskerId/transactions')
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin xem lịch sử giao dịch ví của tasker' })
  @ApiOkResponse({ description: 'Lấy lịch sử giao dịch ví tasker thành công' })
  getTaskerTransactions(
    @Param('taskerId', ParseUUIDPipe) taskerId: string,
  ): Promise<WalletTransactionListResponse> {
    return this.walletService.getTaskerTransactions(taskerId);
  }

  @Get('tasker/me')
  @Auth(UserRole.TASKER)
  @ApiOperation({ summary: 'Tasker xem ví của chính mình' })
  @ApiOkResponse({ description: 'Lấy ví tasker thành công' })
  @ApiUnauthorizedResponse({ description: 'Tasker chưa đăng nhập' })
  getMyTaskerWallet(
    @CurrentUser('id') userId: string,
  ): Promise<WalletResponse> {
    return this.walletService.getMyTaskerWallet(userId);
  }

  @Get('customer/me')
  @Auth(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Customer xem ví của chính mình' })
  @ApiOkResponse({
    description: 'Lấy ví customer thành công',
  })
  @ApiUnauthorizedResponse({ description: 'Customer chưa đăng nhập' })
  getMyCustomerWallet(
    @CurrentUser('id') userId: string,
  ): Promise<WalletResponse> {
    return this.walletService.getMyCustomerWallet(userId);
  }

  @Post('tasker/me/withdrawals')
  @Auth(UserRole.TASKER)
  @ApiOperation({ summary: 'Tasker gửi yêu cầu rút tiền' })
  @ApiCreatedResponse({ description: 'Tạo yêu cầu rút tiền thành công' })
  createWithdrawalRequest(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateWithdrawalRequestDto,
  ): Promise<WithdrawalRequestEntity> {
    return this.walletService.createTaskerWithdrawalRequest(userId, dto);
  }

  @Get('tasker/me/transactions')
  @Auth(UserRole.TASKER)
  @ApiOperation({ summary: 'Tasker xem lịch sử giao dịch ví của chính mình' })
  @ApiOkResponse({ description: 'Lấy lịch sử giao dịch ví tasker thành công' })
  @ApiUnauthorizedResponse({ description: 'Tasker chưa đăng nhập' })
  getMyTaskerTransactions(
    @CurrentUser('id') userId: string,
    @Query() query: WalletTransactionListQueryDto,
  ): Promise<WalletTransactionListResponse> {
    return this.walletService.getMyTaskerTransactions(userId, query);
  }

  @Get('customer/me/transactions')
  @Auth(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Customer xem lịch sử giao dịch ví của chính mình' })
  @ApiOkResponse({
    description: 'Lấy lịch sử giao dịch ví customer thành công',
  })
  @ApiUnauthorizedResponse({ description: 'Customer chưa đăng nhập' })
  getMyCustomerTransactions(
    @CurrentUser('id') userId: string,
    @Query() query: WalletTransactionListQueryDto,
  ): Promise<WalletTransactionListResponse> {
    return this.walletService.getMyCustomerTransactions(userId, query);
  }

  @Get('system')
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin xem ví hệ thống của nền tảng' })
  @ApiOkResponse({ description: 'Lấy ví hệ thống thành công' })
  @ApiUnauthorizedResponse({ description: 'Admin chưa đăng nhập' })
  getSystemWallet(): Promise<WalletResponse> {
    return this.walletService.getSystemWallet();
  }

  @Get('system/transactions')
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin xem lịch sử thu chi ví hệ thống' })
  @ApiOkResponse({
    description: 'Lấy lịch sử giao dịch ví hệ thống thành công',
  })
  @ApiUnauthorizedResponse({ description: 'Admin chưa đăng nhập' })
  getSystemTransactions(): Promise<WalletTransactionListResponse> {
    return this.walletService.getSystemTransactions();
  }

  // ── Nạp tiền vào ví (PayPal) ───────────────────────────────────────────────

  @Post('tasker/me/topups')
  @Auth(UserRole.TASKER)
  @ApiOperation({ summary: 'Tasker tạo đơn nạp tiền, trả link thanh toán' })
  @ApiCreatedResponse({ description: 'Tạo đơn nạp thành công' })
  async createTopup(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTopupDto,
  ) {
    const result = await this.walletTopupService.createTopup(userId, dto);
    return successResponse(result, 'Đã tạo đơn nạp tiền');
  }

  @Get('tasker/me/topups')
  @Auth(UserRole.TASKER)
  @ApiOperation({ summary: 'Tasker xem lịch sử đơn nạp tiền' })
  async getMyTopups(
    @CurrentUser('id') userId: string,
    @Query() query: TopupListQueryDto,
  ) {
    const result = await this.walletTopupService.listMyTopups(userId, query);
    return paginatedResponse(
      result.items,
      result.total,
      result.page,
      result.limit,
    );
  }

  @Get('tasker/me/topups/:id')
  @Auth(UserRole.TASKER)
  @ApiOperation({
    summary: 'Tasker xem chi tiết 1 đơn nạp (tự verify với cổng)',
  })
  async getMyTopup(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const result = await this.walletTopupService.getTopupForUser(userId, id);
    return successResponse(result, 'Lấy đơn nạp tiền thành công');
  }

  // Webhook công khai (không @Auth): bảo mật bằng verify chữ ký, không tin body.
  @Post('topups/webhook/paypal')
  @ApiOperation({ summary: 'Webhook PayPal — cộng ví (idempotent)' })
  handlePayPalWebhook(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() body: Record<string, unknown>,
  ) {
    return this.walletTopupService.handlePayPalWebhook(headers, body);
  }

  @Get('admin/topups')
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin xem/đối soát toàn bộ đơn nạp' })
  async getAllTopups(@Query() query: TopupListQueryDto) {
    const result = await this.walletTopupService.listAllTopups(query);
    return paginatedResponse(
      result.items,
      result.total,
      result.page,
      result.limit,
    );
  }
}
