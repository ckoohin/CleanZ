import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

/**
 * Danh sách origin được phép cho WebSocket — KHỚP với CORS HTTP ở main.ts.
 * Trước đây các gateway hardcode 1 origin (`FRONTEND_URL || localhost:3020`),
 * nên khi mở FE bằng origin khác (127.0.0.1 / IP LAN / cổng khác) thì handshake
 * socket bị CORS chặn → mất realtime. Dùng chung danh sách + callback để đồng nhất.
 */
export function wsAllowedOrigins(): string[] {
  return [
    process.env.FRONTEND_URL,
    'http://localhost:3020',
    'http://127.0.0.1:3020',
    'http://172.22.64.1:3020',
  ].filter(Boolean) as string[];
}

export function wsCorsOptions(): CorsOptions {
  const allowed = wsAllowedOrigins();
  return {
    credentials: true,
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Không có origin (server-to-server / công cụ) → cho phép.
      if (!origin || allowed.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Not allowed by CORS: ${origin}`), false);
    },
  };
}
