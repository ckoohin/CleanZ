export type AllConfigType = {
  DB_HOST: string;
  DB_PORT: number;
  DB_USERNAME: string;
  DB_PASSWORD?: string;
  DB_DATABASE: string;
  /** Bật TLS khi kết nối Postgres — bắt buộc với Supabase và mọi DB quản lý. */
  DB_SSL?: string;
  /**
   * Chứng chỉ CA (dạng PEM) để xác thực server. Bỏ trống thì vẫn mã hoá nhưng
   * KHÔNG xác thực danh tính server (`rejectUnauthorized: false`).
   */
  DB_SSL_CA?: string;

  NODE_ENV: 'development' | 'production';

  FRONTEND_URL: string;
  BACKEND_URL?: string;
  COOKIE_DOMAIN?: string;

  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD?: string;
  /** Không gian tên khoá BullMQ. Bỏ trống = `bull`; đặt riêng để cô lập test khỏi dev. */
  BULL_PREFIX?: string;

  MAIL_HOST: string;
  MAIL_PORT: number;
  MAIL_USER: string;
  MAIL_PASSWORD: string;
  MAIL_FROM_NAME: string;

  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_ACCESS_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;

  JWT_VERIFY_EMAIL_SECRET: string;
  JWT_VERIFY_EMAIL_EXPIRES_IN: string;

  JWT_RESET_PASSWORD_SECRET: string;
  JWT_RESET_PASSWORD_EXPIRES_IN: string;

  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_CALLBACK_URL: string;

  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;

  GOONG_MAPS_API_KEY?: string;

  // PayPal — legacy, không còn dùng cho topup mới.
  PAYPAL_MODE?: 'sandbox' | 'live';
  PAYPAL_ENV?: 'sandbox' | 'live';
  PAYPAL_API_BASE?: string;
  PAYPAL_CLIENT_ID?: string;
  PAYPAL_SECRET?: string;
  PAYPAL_CLIENT_SECRET?: string;

  // PayOS (nạp ví customer). Min/max nạp lưu DB `system_configs`.
  PAYOS_CLIENT_ID?: string;
  PAYOS_API_KEY?: string;
  PAYOS_CHECKSUM_KEY?: string;

  // PayOS Payout (rút tiền tasker).
  PAYOS_PAYOUT_CLIENT_ID?: string;
  PAYOS_PAYOUT_API_KEY?: string;
  PAYOS_PAYOUT_CHECKSUM_KEY?: string;
};
