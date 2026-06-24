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
import { WalletListQueryDto } from './dto/wallet-list-query.dto';
import { paginatedResponse } from 'src/common/helpers/response.helper';
import { CreateWithdrawalRequestDto } from './dto/create-withdrawal-request.dto';
import { WithdrawalRequestEntity } from '../finance/entity/withdrawal-request.entity';
import { TaskerDepositService } from './tasker-deposit.service';
import { DataSource } from 'typeorm';
import { successResponse } from 'src/common/helpers/response.helper';

@Controller('wallet')
@ApiTags('Wallet')
@ApiBearerAuth('access-token')
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly taskerDepositService: TaskerDepositService,
    private readonly dataSource: DataSource,
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

  @Get('tasker/me/deposit/transactions')
  @Auth(UserRole.TASKER)
  @ApiOperation({ summary: 'Tasker xem lịch sử biến động ký quỹ' })
  getMyDepositTransactions(@CurrentUser('id') userId: string) {
    return this.taskerDepositService.getMyTransactions(userId);
  }

  @Get('admin/taskers/:taskerId/deposit/transactions')
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin xem lịch sử ký quỹ của Tasker' })
  getTaskerDepositTransactions(
    @Param('taskerId', ParseUUIDPipe) taskerId: string,
  ) {
    return this.taskerDepositService.getTaskerTransactions(taskerId);
  }

  @Post('admin/taskers/:taskerId/deposit/refund')
  @Auth(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Admin hoàn ký quỹ cho Tasker đã nghỉ việc',
  })
  async refundTerminatedTaskerDeposit(
    @Param('taskerId', ParseUUIDPipe) taskerId: string,
  ) {
    const amount = await this.dataSource.transaction((manager) =>
      this.taskerDepositService.refundForTerminatedTasker(manager, taskerId),
    );
    return successResponse({ amount }, 'Đã hoàn ký quỹ vào ví Tasker');
  }

  @Get('tasker/me/transactions')
  @Auth(UserRole.TASKER)
  @ApiOperation({ summary: 'Tasker xem lịch sử giao dịch ví của chính mình' })
  @ApiOkResponse({ description: 'Lấy lịch sử giao dịch ví tasker thành công' })
  @ApiUnauthorizedResponse({ description: 'Tasker chưa đăng nhập' })
  getMyTaskerTransactions(
    @CurrentUser('id') userId: string,
  ): Promise<WalletTransactionListResponse> {
    return this.walletService.getMyTaskerTransactions(userId);
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
  ): Promise<WalletTransactionListResponse> {
    return this.walletService.getMyCustomerTransactions(userId);
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
}
