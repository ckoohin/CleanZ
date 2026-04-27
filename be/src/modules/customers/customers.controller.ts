import { Controller, Get, Patch, Body, Param } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/AuthRequest';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@Controller('customers')
@Auth()
@ApiTags('Customers')
@ApiBearerAuth('access-token')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Lấy hoặc tạo profile customer hiện tại' })
  @ApiOkResponse({ description: 'Lấy profile customer thành công' })
  @ApiUnauthorizedResponse({ description: 'Token không hợp lệ' })
  async getOrCreateProfile(@CurrentUser() currentUser: AuthUser) {
    return this.customersService.getOrCreateProfile(currentUser.id);
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Lấy profile customer theo userId' })
  @ApiParam({ name: 'userId', example: '5a829a40-1490-42b9-bf95-62f04ecf55dd' })
  @ApiOkResponse({ description: 'Lấy profile customer thành công' })
  @ApiBadRequestResponse({ description: 'userId không hợp lệ' })
  async getProfileByUserId(
    @Param('userId') userId: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.customersService.findOneByUserId(
      userId,
      currentUser.id,
      currentUser.role,
    );
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Cập nhật profile customer hiện tại' })
  @ApiBody({ type: UpdateCustomerDto })
  @ApiOkResponse({ description: 'Cập nhật profile customer thành công' })
  @ApiBadRequestResponse({ description: 'Payload không hợp lệ' })
  async updateProfile(
    @Body() updateCustomerDto: UpdateCustomerDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.customersService.updateProfile(
      currentUser.id,
      updateCustomerDto,
      currentUser.id,
      currentUser.role,
    );
  }
}
