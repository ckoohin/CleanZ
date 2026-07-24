import { EntityManager } from 'typeorm';
import { SystemConfigService } from 'src/modules/system-config/system-config.service';
import { SYSTEM_CONFIG_KEYS } from 'src/modules/system-config/system-config.keys';
import { TaskerEquipmentStatus } from 'src/common/enums/tasker-equipment-status.enum';

export interface PremiumDispatchConfig {
  /** Thời gian giữ đơn riêng cho thợ yêu thích (ring 0) — mili giây. */
  favoriteWaitMs: number;
}

export async function loadPremiumDispatchConfig(
  manager: EntityManager,
  systemConfig: SystemConfigService,
): Promise<PremiumDispatchConfig> {
  const favoriteWaitSeconds = await systemConfig.getRegisteredNumber(
    manager,
    SYSTEM_CONFIG_KEYS.PREMIUM_FAVORITE_WAIT_SECONDS,
  );

  return {
    favoriteWaitMs: favoriteWaitSeconds * 1_000,
  };
}

/**
 * Điều kiện SQL "tasker đủ tư cách nhận đơn PREMIUM" — NGUỒN SỰ THẬT DUY NHẤT.
 *
 * Dùng chung cho các truy vấn chọn người nhận chủ động:
 *  1. `findNearestTaskers` — vòng mời chủ động (booking-dispatch.service.ts)
 *  2. `findFavoriteTaskerCandidate` — thợ yêu thích được khách chọn
 *
 * Danh sách "Nhận đơn" vẫn trả đơn PREMIUM cho mọi tasker. Quyền bấm nhận
 * dùng bản kiểm tra TypeScript bên dưới và được kiểm tra lại ở guard backend.
 *
 * `alias` là bí danh bảng `taskers` trong query gọi tới.
 */
export function premiumEligibilitySql(alias: string): string {
  return `${alias}.equipment_status = '${TaskerEquipmentStatus.APPROVED}'`;
}

export type PremiumEligibilityIssue = 'EQUIPMENT_NOT_APPROVED';

export function getTaskerPremiumEligibilityIssues(tasker: {
  equipmentStatus: TaskerEquipmentStatus;
}): PremiumEligibilityIssue[] {
  return tasker.equipmentStatus === TaskerEquipmentStatus.APPROVED
    ? []
    : ['EQUIPMENT_NOT_APPROVED'];
}

/** Bản kiểm tra trong TypeScript, dùng khi đã có sẵn entity trong bộ nhớ. */
export function isTaskerPremiumEligible(tasker: {
  equipmentStatus: TaskerEquipmentStatus;
}): boolean {
  return getTaskerPremiumEligibilityIssues(tasker).length === 0;
}
