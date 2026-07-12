import {
  Body,
  Controller,
  Get,
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
import { paginatedResponse } from 'src/common/helpers/response.helper';
import { CreateWithdrawalRequestDto } from './dto/create-withdrawal-request.dto';
import { WithdrawalRequestEntity } from '../finance/entity/withdrawal-request.entity';
import { TaskerBalanceService } from './tasker-balance.service';
import { DataSource } from 'typeorm';
import { successResponse } from 'src/common/helpers/response.helper';
import { WalletTopupService } from './wallet-topup.service';
import { CreateTopupDto } from './dto/create-topup.dto';

@Controller('wallet')
@ApiTags('Wallet')
@ApiBearerAuth('access-token')
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly taskerBalanceService: TaskerBalanceService,
    private readonly walletTopupService: WalletTopupService,
    private readonly dataSource: DataSource,
  ) {}

  @Get('customer/me/topup-config')
  @Auth(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Customer xem hạn mức & tỷ giá nạp tiền' })
  async getTopupConfig() {
    const config = await this.walletTopupService.getTopupConfig();
    return successResponse(config, 'Lấy cấu hình nạp tiền thành công');
  }

  @Post('customer/me/topups')
  @Auth(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Customer tạo đơn nạp tiền vào ví qua PayPal' })
  @ApiCreatedResponse({ description: 'Tạo đơn nạp tiền thành công' })
  async createTopup(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTopupDto,
  ) {
    const result = await this.walletTopupService.createTopup(
      userId,
      dto.amountVnd,
      dto.bookingId,
    );
    return successResponse(
      result,
      'Đã tạo đơn nạp tiền, chờ thanh toán PayPal',
    );
  }

  @Post('customer/me/topups/:id/capture')
  @Auth(UserRole.CUSTOMER)
  @ApiOperation({
    summary: 'Customer xác nhận (capture) thanh toán PayPal và cộng ví',
  })
  @ApiOkResponse({ description: 'Nạp tiền thành công' })
  async captureTopup(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const result = await this.walletTopupService.captureTopup(userId, id);
    return successResponse(result, 'Nạp tiền thành công');
  }

  @Get('customer/me/topups')
  @Auth(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Customer xem lịch sử đơn nạp tiền' })
  async listMyTopups(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.walletTopupService.listMyTopups(
      userId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
    return paginatedResponse(
      result.items,
      result.total,
      result.page,
      result.limit,
    );
  }

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

  // Ký quỹ đã bị bỏ (gộp vào ví). 2 endpoint dưới chỉ còn để TRA CỨU lịch sử cũ.
  @Get('tasker/me/deposit/transactions')
  @Auth(UserRole.TASKER)
  @ApiOperation({
    summary: 'Tasker xem lịch sử ký quỹ cũ (đã ngừng phát sinh)',
  })
  getMyDepositTransactions(@CurrentUser('id') userId: string) {
    return this.taskerBalanceService.getMyLegacyDepositTransactions(userId);
  }

  @Get('admin/taskers/:taskerId/deposit/transactions')
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin xem lịch sử ký quỹ cũ của Tasker' })
  getTaskerDepositTransactions(
    @Param('taskerId', ParseUUIDPipe) taskerId: string,
  ) {
    return this.taskerBalanceService.getLegacyDepositTransactions(taskerId);
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
  getSystemTransactions(
    @Query() query: WalletTransactionListQueryDto,
  ): Promise<WalletTransactionListResponse> {
    return this.walletService.getSystemTransactions(query);
  }
}
