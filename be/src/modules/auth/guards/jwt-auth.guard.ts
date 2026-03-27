import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthGuard } from '@nestjs/passport';

const JwtBaseGuard = AuthGuard('jwt');
const JwtRefreshBaseGuard = AuthGuard('jwt-refresh');

@Injectable()
export class JwtAuthGuard extends JwtBaseGuard {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    return super.canActivate(context);
  }

  handleRequest<TUser = any>(err: unknown, user: TUser): TUser {
    if (err) {
      if (err instanceof Error) {
        throw err;
      }
      throw new UnauthorizedException();
    }

    if (!user) {
      throw new UnauthorizedException('Bạn cần đăng nhập để tiếp tục');
    }

    return user;
  }
}

@Injectable()
export class JwtRefreshGuard extends JwtRefreshBaseGuard {
  handleRequest<TUser = any>(err: unknown, user: TUser): TUser {
    if (err) {
      if (err instanceof Error) {
        throw err;
      }
      throw new UnauthorizedException();
    }

    if (!user) {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }

    return user;
  }
}
