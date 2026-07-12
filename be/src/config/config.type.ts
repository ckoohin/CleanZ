export type AllConfigType = {
  DB_HOST: string;
  DB_PORT: number;
  DB_USERNAME: string;
  DB_PASSWORD?: string;
  DB_DATABASE: string;

  NODE_ENV: 'development' | 'production';

  FRONTEND_URL: string;
  BACKEND_URL?: string;
  COOKIE_DOMAIN?: string;

  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD?: string;

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

  // PayPal (nạp ví customer). Tỷ giá & min/max nạp lưu DB `system_configs`
  // (admin chỉnh runtime), không phải env — xem TopupConfigService.
  PAYPAL_MODE?: 'sandbox' | 'live';
  PAYPAL_ENV?: 'sandbox' | 'live';
  PAYPAL_API_BASE?: string;
  PAYPAL_CLIENT_ID?: string;
  PAYPAL_SECRET?: string;
  PAYPAL_CLIENT_SECRET?: string;
};
