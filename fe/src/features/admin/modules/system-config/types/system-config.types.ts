export type SystemConfigGroup =
  "FINANCE" | "TOPUP" | "WITHDRAWAL" | "TASKER" | "DISPATCH";

export interface SystemConfigItem {
  key: string;
  group: SystemConfigGroup;
  label: string;
  description: string;
  unit?: string;
  value: number;
  defaultValue: number;
  min: number;
  max: number;
  /** false = đang dùng giá trị mặc định, chưa từng được admin ghi đè */
  isOverridden: boolean;
}

export interface SystemConfigResponse {
  items: SystemConfigItem[];
  groupLabels: Record<SystemConfigGroup, string>;
}

export type UpdateSystemConfigPayload = Record<string, number>;

export interface VersionedOperationalPolicy {
  version: number;
  effectiveFrom: string | null;
}

export interface TaskerCancelPenaltyRule {
  hoursBeforeStart: number;
  penaltyPercent: number;
}

export interface TaskerCancellationPolicy extends VersionedOperationalPolicy {
  rules: TaskerCancelPenaltyRule[];
}

export interface CheckinOperationPolicy extends VersionedOperationalPolicy {
  openBeforeMinutes: number;
  autoApproveRadiusMeters: number;
}

export interface CustomerSchedulingPolicy extends VersionedOperationalPolicy {
  minAdvanceMinutes: number;
  maxAdvanceDays: number;
}

export interface OperationalPoliciesResponse {
  taskerCancellation: TaskerCancellationPolicy;
  checkin: CheckinOperationPolicy;
  customerScheduling: CustomerSchedulingPolicy;
}
