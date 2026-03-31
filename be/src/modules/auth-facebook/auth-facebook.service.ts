import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { AuthTokenService } from '../auth/auth-token.service';
import { CreateFacebookUserDto } from '../users/dto/create-facebook-user.dto';
import { User } from '../users/entities/user.entity';
import { AuthProvider } from 'src/common/enums/auth-provider.enum';
import { Tokens } from '../auth/types/AuthResponse';

@Injectable()
export class AuthFacebookService {
  constructor(
    private readonly usersService: UsersService,
    private readonly authTokenService: AuthTokenService,
  ) {}

  async handleFacebookLogin(facebookUser: CreateFacebookUserDto): Promise<{
    user: User;
    tokens: Tokens;
  }> {
    const { email, firstName, lastName } = facebookUser;

    let user = await this.usersService.findByEmail(email);

    if (!user) {
      const dto: CreateFacebookUserDto = {
        email,
        fullName: `${firstName ?? ''} ${lastName ?? ''}`.trim() || email,
        provider: AuthProvider.FACEBOOK,
        providerId: facebookUser.providerId,
        avatar: facebookUser.avatar,
      };
      user = await this.usersService.createFacebookUser(dto);
      console.log(user);
      console.log('User created', user);
    } else {
      if (!user.provider) {
        console.log('User provider', user.provider);
        await this.usersService.updateProvider(
          user.id,
          AuthProvider.FACEBOOK,
          facebookUser.providerId,
        );
      }
    }

    await this.usersService.updateLastLogin(user.id);

    const tokens = await this.authTokenService.generateAndSaveTokens(user);

    return { user, tokens };
  }
}
