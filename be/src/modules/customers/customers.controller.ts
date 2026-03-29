import { Controller, Get, Patch, Body, Param } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/AuthRequest';
import { UserRole } from '../../common/enums/user-role.enum';

@Controller('customers')
@Auth()
export class CustomersController {
  constructor(private readonly customersService: CustomersService) { }

  @Get('profile')
  async getOrCreateProfile(@CurrentUser() currentUser: AuthUser) {
    return this.customersService.getOrCreateProfile(currentUser.id);
  }

  @Get(':userId')
  async getProfileByUserId(
    @Param('userId') userId: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.customersService.findOneByUserId(userId, currentUser.id, currentUser.role);
  }

  @Patch('profile')
  async updateProfile(
    @Body() updateCustomerDto: UpdateCustomerDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.customersService.updateProfile(currentUser.id, updateCustomerDto, currentUser.id, currentUser.role);
  }
}
