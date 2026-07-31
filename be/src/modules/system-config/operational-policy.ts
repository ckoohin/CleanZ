export const OPERATIONAL_POLICY_KEYS = {
  TASKER_CANCELLATION: 'TASKER_CANCEL_TIME_PENALTY_RULES',
  CHECKIN: 'CHECKIN_OPERATION_POLICY',
  CUSTOMER_SCHEDULING: 'CUSTOMER_SCHEDULING_POLICY',
} as const;

export type OperationalPolicyKey =
  (typeof OPERATIONAL_POLICY_KEYS)[keyof typeof OPERATIONAL_POLICY_KEYS];

export interface VersionedPolicy {
  version: number;
  effectiveFrom: string | null;
}

export interface TaskerCancelPenaltyRule {
  hoursBeforeStart: number;
  penaltyPercent: number;
}

export interface TaskerCancellationPolicy extends VersionedPolicy {
  rules: TaskerCancelPenaltyRule[];
}

export interface CheckinOperationPolicy extends VersionedPolicy {
  openBeforeMinutes: number;
  autoApproveRadiusMeters: number;
}

export interface CustomerSchedulingPolicy extends VersionedPolicy {
  minAdvanceMinutes: number;
  maxAdvanceDays: number;
}

export interface OperationalPolicies {
  taskerCancellation: TaskerCancellationPolicy;
  checkin: CheckinOperationPolicy;
  customerScheduling: CustomerSchedulingPolicy;
}

export interface TaskerCancelPenaltyPreview {
  amount: number;
  penaltyPercent: number;
  hoursBeforeStart: number;
  matchedRule: TaskerCancelPenaltyRule;
  policyVersion: number;
  effectiveFrom: string | null;
}

export const DEFAULT_TASKER_CANCELLATION_POLICY: TaskerCancellationPolicy = {
  version: 1,
  effectiveFrom: null,
  rules: [
    { hoursBeforeStart: 24, penaltyPercent: 0 },
    { hoursBeforeStart: 8, penaltyPercent: 50 },
    { hoursBeforeStart: 0, penaltyPercent: 100 },
  ],
};

export const DEFAULT_CHECKIN_OPERATION_POLICY: CheckinOperationPolicy = {
  version: 1,
  effectiveFrom: null,
  openBeforeMinutes: 30,
  autoApproveRadiusMeters: 50,
};

export const DEFAULT_CUSTOMER_SCHEDULING_POLICY: CustomerSchedulingPolicy = {
  version: 1,
  effectiveFrom: null,
  minAdvanceMinutes: 60,
  maxAdvanceDays: 30,
};

const TASKER_CANCEL_MAX_RULES = 8;
const TASKER_CANCEL_MAX_HOURS = 24 * 30;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeVersionedPolicy(
  value: Record<string, unknown>,
): VersionedPolicy {
  const version = Number(value.version);
  const effectiveFrom = value.effectiveFrom;
  if (!Number.isInteger(version) || version < 1) {
    throw new Error('Phiên bản policy phải là số nguyên dương');
  }
  if (
    effectiveFrom !== null &&
    (typeof effectiveFrom !== 'string' ||
      Number.isNaN(new Date(effectiveFrom).getTime()))
  ) {
    throw new Error('Thời điểm hiệu lực của policy không hợp lệ');
  }
  return { version, effectiveFrom };
}

export function normalizeTaskerCancelPenaltyRules(
  rules: unknown,
): TaskerCancelPenaltyRule[] {
  if (
    !Array.isArray(rules) ||
    rules.length < 1 ||
    rules.length > TASKER_CANCEL_MAX_RULES
  ) {
    throw new Error(
      `Chính sách phí hủy phải có từ 1 đến ${TASKER_CANCEL_MAX_RULES} mốc`,
    );
  }

  const normalized = rules.map((rawRule) => {
    if (!isRecord(rawRule)) {
      throw new Error('Mốc phí hủy không hợp lệ');
    }
    const hoursBeforeStart = Number(rawRule.hoursBeforeStart);
    const penaltyPercent = Number(rawRule.penaltyPercent);
    if (
      !Number.isInteger(hoursBeforeStart) ||
      hoursBeforeStart < 0 ||
      hoursBeforeStart > TASKER_CANCEL_MAX_HOURS
    ) {
      throw new Error(
        `Số giờ trước ca phải là số nguyên từ 0 đến ${TASKER_CANCEL_MAX_HOURS}`,
      );
    }
    if (
      !Number.isInteger(penaltyPercent) ||
      penaltyPercent < 0 ||
      penaltyPercent > 100
    ) {
      throw new Error('Phần trăm phí hủy phải là số nguyên từ 0 đến 100');
    }
    return { hoursBeforeStart, penaltyPercent };
  });

  const thresholds = new Set(normalized.map((rule) => rule.hoursBeforeStart));
  if (thresholds.size !== normalized.length) {
    throw new Error('Các mốc giờ của phí hủy không được trùng nhau');
  }
  if (!thresholds.has(0)) {
    throw new Error('Chính sách phí hủy phải có mốc 0 giờ');
  }

  normalized.sort(
    (left, right) => right.hoursBeforeStart - left.hoursBeforeStart,
  );
  for (let index = 1; index < normalized.length; index += 1) {
    if (
      normalized[index].penaltyPercent < normalized[index - 1].penaltyPercent
    ) {
      throw new Error('Mức phí hủy không được giảm khi gần giờ làm hơn');
    }
  }

  return normalized;
}

export function normalizeTaskerCancellationPolicy(
  value: unknown,
): TaskerCancellationPolicy {
  if (!isRecord(value)) {
    throw new Error('Chính sách phí hủy Tasker không hợp lệ');
  }
  return {
    ...normalizeVersionedPolicy(value),
    rules: normalizeTaskerCancelPenaltyRules(value.rules),
  };
}

export function normalizeCheckinOperationPolicy(
  value: unknown,
): CheckinOperationPolicy {
  if (!isRecord(value)) {
    throw new Error('Chính sách check-in không hợp lệ');
  }
  const openBeforeMinutes = Number(value.openBeforeMinutes);
  const autoApproveRadiusMeters = Number(value.autoApproveRadiusMeters);
  if (
    !Number.isInteger(openBeforeMinutes) ||
    openBeforeMinutes < 0 ||
    openBeforeMinutes > 1440
  ) {
    throw new Error('Thời gian mở check-in phải từ 0 đến 1.440 phút');
  }
  if (
    !Number.isInteger(autoApproveRadiusMeters) ||
    autoApproveRadiusMeters < 10 ||
    autoApproveRadiusMeters > 1000
  ) {
    throw new Error('Bán kính tự duyệt check-in phải từ 10 đến 1.000 mét');
  }
  return {
    ...normalizeVersionedPolicy(value),
    openBeforeMinutes,
    autoApproveRadiusMeters,
  };
}

export function normalizeCustomerSchedulingPolicy(
  value: unknown,
): CustomerSchedulingPolicy {
  if (!isRecord(value)) {
    throw new Error('Quy tắc đặt lịch khách hàng không hợp lệ');
  }
  const minAdvanceMinutes = Number(value.minAdvanceMinutes);
  const maxAdvanceDays = Number(value.maxAdvanceDays);
  if (
    !Number.isInteger(minAdvanceMinutes) ||
    minAdvanceMinutes < 0 ||
    minAdvanceMinutes > 7 * 24 * 60
  ) {
    throw new Error('Thời gian đặt trước phải từ 0 đến 10.080 phút');
  }
  if (
    !Number.isInteger(maxAdvanceDays) ||
    maxAdvanceDays < 1 ||
    maxAdvanceDays > 365
  ) {
    throw new Error('Thời gian đặt xa tối đa phải từ 1 đến 365 ngày');
  }
  if (minAdvanceMinutes > maxAdvanceDays * 24 * 60) {
    throw new Error(
      'Thời gian đặt trước tối thiểu phải nhỏ hơn giới hạn đặt xa',
    );
  }
  return {
    ...normalizeVersionedPolicy(value),
    minAdvanceMinutes,
    maxAdvanceDays,
  };
}

function parseJson(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function fallback<T>(value: T): T {
  return structuredClone(value);
}

export function parseTaskerCancellationPolicy(
  raw: string | null,
  legacyEffectiveFrom?: Date | string | null,
): TaskerCancellationPolicy {
  const parsed = parseJson(raw);
  try {
    return normalizeTaskerCancellationPolicy(parsed);
  } catch {
    // Bản rollout cũ từng lưu trực tiếp một mảng rule với tên field
    // `minHoursBeforeStart`. Đọc tương thích để không âm thầm thay policy đang
    // chạy bằng default; lần lưu kế tiếp sẽ ghi lại schema versioned hiện tại.
    if (Array.isArray(parsed)) {
      try {
        const rules = parsed.map((rawRule) => {
          if (!isRecord(rawRule)) {
            throw new Error('Mốc phí hủy cũ không hợp lệ');
          }
          return {
            hoursBeforeStart:
              rawRule.hoursBeforeStart ?? rawRule.minHoursBeforeStart,
            penaltyPercent: rawRule.penaltyPercent,
          };
        });
        const effectiveFromValue =
          legacyEffectiveFrom instanceof Date
            ? legacyEffectiveFrom.toISOString()
            : legacyEffectiveFrom;
        const effectiveFrom =
          typeof effectiveFromValue === 'string' &&
          !Number.isNaN(new Date(effectiveFromValue).getTime())
            ? effectiveFromValue
            : null;

        return {
          version: 1,
          effectiveFrom,
          rules: normalizeTaskerCancelPenaltyRules(rules),
        };
      } catch {
        return fallback(DEFAULT_TASKER_CANCELLATION_POLICY);
      }
    }

    return fallback(DEFAULT_TASKER_CANCELLATION_POLICY);
  }
}

export function parseCheckinOperationPolicy(
  raw: string | null,
): CheckinOperationPolicy {
  try {
    return normalizeCheckinOperationPolicy(parseJson(raw));
  } catch {
    return fallback(DEFAULT_CHECKIN_OPERATION_POLICY);
  }
}

export function parseCustomerSchedulingPolicy(
  raw: string | null,
): CustomerSchedulingPolicy {
  try {
    return normalizeCustomerSchedulingPolicy(parseJson(raw));
  } catch {
    return fallback(DEFAULT_CUSTOMER_SCHEDULING_POLICY);
  }
}

export function calculateTaskerCancelPenalty(input: {
  policy: TaskerCancellationPolicy;
  scheduledStart: Date;
  totalPrice: number;
  now?: Date;
}): TaskerCancelPenaltyPreview {
  const now = input.now ?? new Date();
  const hoursBeforeStart = Math.max(
    0,
    (input.scheduledStart.getTime() - now.getTime()) / 3_600_000,
  );
  const rules = normalizeTaskerCancelPenaltyRules(input.policy.rules);
  const matchedRule =
    rules.find((rule) => hoursBeforeStart >= rule.hoursBeforeStart) ??
    rules[rules.length - 1];
  const totalPrice = Number.isFinite(input.totalPrice)
    ? Math.max(input.totalPrice, 0)
    : 0;

  return {
    amount: Math.round((totalPrice * matchedRule.penaltyPercent) / 100),
    penaltyPercent: matchedRule.penaltyPercent,
    hoursBeforeStart,
    matchedRule: { ...matchedRule },
    policyVersion: input.policy.version,
    effectiveFrom: input.policy.effectiveFrom,
  };
}
