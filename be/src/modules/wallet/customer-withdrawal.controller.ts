/**
 * [TẠM TẮT] Rút tiền phía Customer.
 *
 * Toàn bộ 4 route (2 của khách, 2 của admin) được comment lại theo yêu cầu.
 * Controller cũng đã bị gỡ khỏi `WalletModule.controllers`, nên kể cả khi bỏ
 * comment ở đây, route vẫn chưa sống lại cho tới khi đăng ký lại trong module.
 *
 * KHÔNG đụng tới:
 *   - `CustomerWithdrawalRequestEntity` và bảng `customer_withdrawal_requests`
 *     (dữ liệu cũ giữ nguyên)
 *   - `PayoutReconciliationService.sumPendingPayout()` và
 *     `AdminDashboardRepository` — hai chỗ này vẫn phải cộng các đơn PENDING /
 *     APPROVED còn tồn, nếu không nghĩa vụ chi tiền thật sẽ bị đếm thiếu.
 *
 * Cách bật lại: bỏ comment khối dưới + bỏ comment 2 dòng import và 2 mục
 * `controllers` / `providers` trong `wallet.module.ts`.
 */

/*
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from 'src/common/enums/user-role.enum';
import { WithdrawalStatus } from 'src/common/enums/with-drawal-status.enum';
import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CustomerWithdrawalService } from './customer-withdrawal.service';
import {
  CreateCustomerWithdrawalDto,
  ReviewCustomerWithdrawalDto,
} from './dto/customer-withdrawal.dto';
import { AuditAction } from '../admin/audit/audit-action.decorator';
import { AuditActionCode } from '../admin/audit/audit-action-codes';
import { AuditSeverity } from 'src/common/enums/audit-severity.enum';

@ApiTags('Customer Withdrawal')
@Controller('wallet')
export class CustomerWithdrawalController {
  constructor(private readonly service: CustomerWithdrawalService) {}

  @Post('customer/me/withdrawals')
  @Auth(UserRole.CUSTOMER)
  @ApiOperation({
    summary: 'Khách tạo yêu cầu rút tiền (phần hoàn bồi thường)',
  })
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCustomerWithdrawalDto,
  ) {
    return this.service.createRequest(userId, dto);
  }

  @Get('customer/me/withdrawals')
  @Auth(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Danh sách yêu cầu rút của tôi' })
  listMine(@CurrentUser('id') userId: string) {
    return this.service.listMine(userId);
  }

  @Get('admin/customer-withdrawals')
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin: danh sách yêu cầu rút của Khách' })
  listAll(@Query('status') status?: WithdrawalStatus) {
    return this.service.listAll(status);
  }

  @AuditAction({
    code: AuditActionCode.CUSTOMER_WITHDRAWAL_REVIEW,
    severity: AuditSeverity.CRITICAL,
    targetType: 'CUSTOMER_WITHDRAWAL_REQUEST',
    reasonField: 'note',
    extract: ({ params, body, result }) => ({
      withdrawalId: params.id,
      decision: body.status,
      amount: result?.amount ?? null,
    }),
  })
  @Patch('admin/customer-withdrawals/:id/review')
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin: duyệt/từ chối yêu cầu rút của Khách' })
  review(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewCustomerWithdrawalDto,
  ) {
    return this.service.review(id, dto);
  }
}
*/

export {};
