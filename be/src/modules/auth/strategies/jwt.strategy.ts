import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../types/JwtPayLoad';
// import { ExtractJwt, Strategy } from 'passport-jwt';
// import { ConfigService } from '@nestjs/config';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { User } from '../../users/entities/user.entity';
// import { JwtPayload } from '../types/JwtPayLoad';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          return (request.cookies['accessToken'] as string) ?? null;
        },
      ]),
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  validate(payload: JwtPayload) {
    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}
// constructor(
//   configService: ConfigService,
//   @InjectRepository(User)
//   private readonly userRepository: Repository<User>,
// ) {
//   const secret = configService.get<string>('JWT_ACCESS_SECRET');
//   if (!secret) {
//     throw new Error('JWT_ACCESS_SECRET is not defined');
//   }
//   super({
//     jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
//     ignoreExpiration: false,
//     secretOrKey: secret,
//   });
// }
// async validate(payload: JwtPayload): Promise<User> {
//   const user = await this.userRepository.findOne({
//     where: { id: payload.sub, isActive: true },
//   });
//   if (!user) {
//     throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
//   }
//   return user;
// }
