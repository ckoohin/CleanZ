import { Module } from '@nestjs/common';
import { AuthFacebookController } from './auth-facebook.controller';
import { AuthFacebookService } from './auth-facebook.service';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { FacebookStrategy } from './strategies/facebook.stratrgy';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [UsersModule, AuthModule, PassportModule],
  controllers: [AuthFacebookController],
  providers: [AuthFacebookService, FacebookStrategy],
})
export class AuthFacebookModule {}
