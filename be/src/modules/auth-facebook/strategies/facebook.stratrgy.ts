import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile } from 'passport';
import { Strategy } from 'passport-facebook';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.get<string>('FACEBOOK_APP_ID')!,
      clientSecret: configService.get<string>('FACEBOOK_APP_SECRET')!,
      callbackURL: configService.get<string>('FACEBOOK_CALLBACK_URL')!,
      scope: ['email', 'public_profile'],
      profileFields: ['id', 'emails', 'name', 'photos'],
    });
  }

  validate(accessToken: string, _refreshToken: string, profile: Profile) {
    const { id, name, emails, photos } = profile;
    const firstName = name?.givenName;
    const lastName = name?.familyName;
    return {
      providerId: id,
      firstName,
      lastName,
      email: emails?.[0]?.value,
      avatar: photos?.[0]?.value,
      accessToken,
    };
  }
}
