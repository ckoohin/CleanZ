import { Injectable } from '@nestjs/common';

import { UsersService } from '../users/users.service';
import { AuthTokenService } from '../auth/auth-token.service';
import { CreateGoogleUserDto } from '../users/dto/create-google-user.dto';
import { User } from '../users/entities/user.entity';
import { AuthProvider } from 'src/common/enums/auth-provider.enum';
import { Tokens } from '../auth/types/AuthResponse';

@Injectable()
export class AuthGoogleService {
  constructor(
    private readonly usersService: UsersService,
    private readonly authTokenService: AuthTokenService,
  ) {}

  async handleGoogleLogin(googleUser: CreateGoogleUserDto): Promise<{
    user: User;
    tokens: Tokens;
  }> {
    const { email, firstName, lastName } = googleUser;

    let user = await this.usersService.findByEmail(email);

    if (!user) {
      const dto: CreateGoogleUserDto = {
        email,
        fullName: `${firstName ?? ''} ${lastName ?? ''}`.trim() || email,
        provider: AuthProvider.GOOGLE,
        providerId: googleUser.providerId,
      };
      user = await this.usersService.createGoogleUser(dto);
      console.log(user);
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
