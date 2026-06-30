import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { UserRole } from 'src/common/enums/user-role.enum';
import { Auth } from 'src/modules/auth/decorators/auth.decorator';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import { successResponse } from 'src/common/helpers/response.helper';
import { VouchersService } from './services/vouchers.service';

@Controller('customer/vouchers')
@ApiTags('Customer – Vouchers')
export class CustomerVouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Get('available')
  @Auth(UserRole.CUSTOMER)
  @ApiOperation({
    summary: 'Lấy danh sách voucher khả dụng cho customer',
    description:
      'Trả về vouchers được phát riêng + public, kèm canUse & disabledReason. packageId để lọc đúng gói.',
  })
  @ApiQuery({ name: 'packageId', required: false })
  async getAvailable(
    @CurrentUser('id') userId: string,
    @Query('packageId') packageId?: string,
  ) {
    const items = await this.vouchersService.findAvailableForCustomer(
      userId,
      packageId,
    );
    return successResponse(items);
  }
}
