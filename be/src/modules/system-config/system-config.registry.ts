import { SYSTEM_CONFIG_KEYS } from './system-config.keys';

/**
 * Khai báo các cấu hình admin được phép chỉnh runtime.
 * Thêm setting mới = thêm 1 dòng ở đây (controller/validate/FE tự ăn theo).
 * Key không nằm trong registry sẽ bị từ chối khi admin cập nhật.
 */
export type SystemConfigGroup = 'TOPUP' | 'WITHDRAWAL' | 'TASKER' | 'DISPATCH';

export interface SystemConfigDefinition {
  key: string;
  group: SystemConfigGroup;
  label: string;
  description: string;
  /** Đơn vị hiển thị cho FE (VND, %, giờ...) */
  unit?: string;
  defaultValue: number;
  min: number;
  max: number;
}

export const SYSTEM_CONFIG_GROUP_LABELS: Record<SystemConfigGroup, string> = {
  TOPUP: 'Nạp tiền vào ví',
  WITHDRAWAL: 'Rút tiền khỏi ví',
  TASKER: 'Điều kiện nhận đơn của Tasker',
  DISPATCH: 'Ghép đơn cho Tasker',
};

export const SYSTEM_CONFIG_DEFINITIONS: SystemConfigDefinition[] = [
  {
    key: SYSTEM_CONFIG_KEYS.TOPUP_MIN_VND,
    group: 'TOPUP',
    label: 'Số tiền nạp tối thiểu',
    description: 'Khách hàng không thể tạo đơn nạp thấp hơn mức này.',
    unit: 'VND',
    defaultValue: 10_000,
    min: 1_000,
    max: 100_000_000,
  },
  {
    key: SYSTEM_CONFIG_KEYS.TOPUP_MAX_VND,
    group: 'TOPUP',
    label: 'Số tiền nạp tối đa',
    description: 'Giới hạn trần cho mỗi đơn nạp tiền.',
    unit: 'VND',
    defaultValue: 50_000_000,
    min: 10_000,
    max: 1_000_000_000,
  },
  {
    key: SYSTEM_CONFIG_KEYS.WITHDRAWAL_MIN_VND,
    group: 'WITHDRAWAL',
    label: 'Số tiền rút tối thiểu',
    description:
      'Áp dụng cho cả yêu cầu rút của Tasker và Khách hàng (mỗi lần rút).',
    unit: 'VND',
    defaultValue: 10_000,
    min: 1_000,
    max: 100_000_000,
  },
  {
    key: SYSTEM_CONFIG_KEYS.WITHDRAWAL_MAX_VND,
    group: 'WITHDRAWAL',
    label: 'Số tiền rút tối đa',
    description: 'Trần cho mỗi yêu cầu rút tiền (không giới hạn tổng số dư).',
    unit: 'VND',
    defaultValue: 20_000_000,
    min: 10_000,
    max: 1_000_000_000,
  },
  {
    key: SYSTEM_CONFIG_KEYS.WITHDRAWAL_MAX_PER_WEEK,
    group: 'WITHDRAWAL',
    label: 'Số lần rút tối đa mỗi tuần',
    description:
      'Đếm các yêu cầu PENDING/APPROVED/PROCESSED trong tuần hiện tại.',
    unit: 'lần',
    defaultValue: 5,
    min: 1,
    max: 50,
  },
  {
    key: SYSTEM_CONFIG_KEYS.TASKER_MIN_ACCEPT_BALANCE_VND,
    group: 'TASKER',
    label: 'Số dư ví tối thiểu để nhận đơn',
    description:
      'Tasker phải giữ ít nhất mức này trong ví mới được nhận đơn mới, và không được rút xuống dưới mức này (trừ khi đã nghỉ việc). Đặt 0 để tắt giới hạn.',
    unit: 'VND',
    defaultValue: 50_000,
    min: 0,
    max: 50_000_000,
  },
  {
    key: SYSTEM_CONFIG_KEYS.DISPATCH_URGENT_RADIUS_METERS,
    group: 'DISPATCH',
    label: 'Bán kính tìm Tasker khi gấp',
    description:
      'Áp dụng khi giờ hẹn còn dưới ngưỡng khẩn cấp — thu hẹp bán kính để đảm bảo Tasker kịp tới.',
    unit: 'mét',
    defaultValue: 5_000,
    min: 500,
    max: 20_000,
  },
  {
    key: SYSTEM_CONFIG_KEYS.DISPATCH_NORMAL_RADIUS_METERS,
    group: 'DISPATCH',
    label: 'Bán kính tìm Tasker bình thường',
    description:
      'Áp dụng khi giờ hẹn còn nhiều thời gian — mở rộng bán kính để có nhiều lựa chọn Tasker hơn.',
    unit: 'mét',
    defaultValue: 10_000,
    min: 1_000,
    max: 50_000,
  },
  {
    key: SYSTEM_CONFIG_KEYS.DISPATCH_URGENCY_THRESHOLD_MINUTES,
    group: 'DISPATCH',
    label: 'Ngưỡng coi là đơn gấp',
    description:
      'Nếu giờ hẹn còn ít hơn hoặc bằng ngưỡng này (phút) thì dùng bán kính "khi gấp" thay vì bán kính bình thường.',
    unit: 'phút',
    defaultValue: 60,
    min: 5,
    max: 720,
  },
];

const DEFINITION_BY_KEY = new Map(
  SYSTEM_CONFIG_DEFINITIONS.map((item) => [item.key, item]),
);

export function findSystemConfigDefinition(
  key: string,
): SystemConfigDefinition | undefined {
  return DEFINITION_BY_KEY.get(key);
}
