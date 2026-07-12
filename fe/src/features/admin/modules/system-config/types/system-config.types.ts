export type SystemConfigGroup = "TOPUP" | "WITHDRAWAL" | "TASKER";

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
