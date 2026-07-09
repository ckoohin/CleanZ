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
