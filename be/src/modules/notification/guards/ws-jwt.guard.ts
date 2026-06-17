import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Socket } from 'socket.io';
import { JwtPayload } from 'src/modules/auth/types/JwtPayLoad';

function parseCookieHeader(header: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(val);
  }
  return out;
}

@Injectable()
export class WsJwtGuard {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  verifyFromHandshake(client: Socket): string | null {
    const rawCookie = client.handshake.headers.cookie ?? '';
    const cookies = parseCookieHeader(rawCookie);
    let token: string | undefined = cookies['access_token'];
    if (!token) {
      const authToken = client.handshake.auth?.token as unknown;
      if (typeof authToken === 'string') token = authToken;
    }

    if (!token) return null;

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
      return payload.sub ?? null;
    } catch {
      this.logger.debug('WS handshake: invalid/expired token');
      return null;
    }
  }
}
