import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AppealTokenService } from './appeal-token.service';

/**
 * Module tối giản chỉ chứa AppealTokenService (Jwt + Config). Được cả
 * TaskerModule (sinh link kháng cáo lúc ban) và AppealModule (verify + submit)
 * import lại — tách riêng để không kéo theo phụ thuộc nặng → tránh vòng lặp DI.
 */
@Module({
  imports: [JwtModule.register({})],
  providers: [AppealTokenService],
  exports: [AppealTokenService],
})
export class AppealTokenModule {}
