import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';

import { AuthGoogleController } from './auth-google.controller';
import { AuthGoogleService } from './auth-google.service';
import { GoogleStrategy } from './strategies/google.strategy';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { CookieHelper } from 'src/common/helpers/cookie.helper';

@Module({
  imports: [PassportModule, ConfigModule, UsersModule, AuthModule],
  controllers: [AuthGoogleController],
  providers: [AuthGoogleService, GoogleStrategy, CookieHelper],
})
export class AuthGoogleModule {}
