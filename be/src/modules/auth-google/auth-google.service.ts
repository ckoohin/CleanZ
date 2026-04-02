import { Injectable } from '@nestjs/common';

import { UsersService } from '../users/users.service';
import { AuthTokenService } from '../auth/auth-token.service';
import { User } from '../users/entities/user.entity';
import { AuthProvider } from 'src/common/enums/auth-provider.enum';
import { Tokens } from '../auth/types/AuthResponse';
import { CreateOAuthUserDto } from '../users/dto/create-oauth-user.dto';

@Injectable()
export class AuthGoogleService {
  constructor(
    private readonly usersService: UsersService,
    private readonly authTokenService: AuthTokenService,
  ) {}

  async handleGoogleLogin(googleUser: CreateOAuthUserDto): Promise<{
    user: User;
    tokens: Tokens;
  }> {
    const { email, firstName, lastName, avatar } = googleUser;

    let user = await this.usersService.findByEmail(email);

    if (!user) {
      const dto: CreateOAuthUserDto = {
        email,
        fullName: `${firstName ?? ''} ${lastName ?? ''}`.trim() || email,
        provider: AuthProvider.GOOGLE,
        providerId: googleUser.providerId,
        avatar,
      };
      user = await this.usersService.createOAuthUser(dto);
    } else {
      if (!user.provider) {
        await this.usersService.updateProvider(
          user.id,
          AuthProvider.GOOGLE,
          googleUser.providerId,
        );
      }
    }

    await this.usersService.updateLastLogin(user.id);

    const tokens = await this.authTokenService.generateAndSaveTokens(user);

    return { user, tokens };
  }
}
