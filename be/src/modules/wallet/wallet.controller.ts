import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
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

@Controller('wallet')
@ApiTags('Wallet')
@ApiBearerAuth('access-token')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

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
