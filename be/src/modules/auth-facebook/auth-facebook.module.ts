import { Module } from '@nestjs/common';
import { AuthFacebookController } from './auth-facebook.controller';
import { AuthFacebookService } from './auth-facebook.service';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { FacebookStrategy } from './strategies/facebook.stratrgy';
import { PassportModule } from '@nestjs/passport';
import { CookieHelper } from 'src/common/helpers/cookie.helper';
import { CustomerModule } from '../customer/customer.module';
import { FacebookAuthGuard } from './guards/facebook-auth.guard';

@Module({
  imports: [UsersModule, AuthModule, PassportModule, CustomerModule],
  controllers: [AuthFacebookController],
  providers: [
    AuthFacebookService,
    FacebookStrategy,
    FacebookAuthGuard,
    CookieHelper,
  ],
})
export class AuthFacebookModule {}
