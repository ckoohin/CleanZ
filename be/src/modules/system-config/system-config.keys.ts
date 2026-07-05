export const SYSTEM_CONFIG_KEYS = {
  SUPPORTED_AREA_NAME: 'SUPPORTED_AREA_NAME',
  SUPPORTED_PROVINCE_CODES: 'SUPPORTED_PROVINCE_CODES',
  SUPPORTED_AREA_KEYWORDS: 'SUPPORTED_AREA_KEYWORDS',
  // Số dư ví tối thiểu (VND) tasker phải giữ để được nhận đơn tiền mặt.
  TASKER_MIN_WALLET_BALANCE: 'TASKER_MIN_WALLET_BALANCE',
} as const;

// Giá trị mặc định khi chưa cấu hình trong DB (fallback an toàn).
export const TASKER_MIN_WALLET_BALANCE_DEFAULT = 50000;
