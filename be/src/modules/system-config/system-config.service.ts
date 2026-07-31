import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { AppException } from 'src/common/exceptions/app.exception';
import { SystemConfigEntity } from './entity/system-config.entity';
import { PeakDayConfigEntity } from '../pricing/entity/peak-day-config.entity';
import { SYSTEM_CONFIG_KEYS, SystemConfigKey } from './system-config.keys';
import {
  SYSTEM_CONFIG_DEFINITIONS,
  SystemConfigDefinition,
  findSystemConfigDefinition,
} from './system-config.registry';
import {
  CheckinOperationPolicy,
  CustomerSchedulingPolicy,
  OPERATIONAL_POLICY_KEYS,
  OperationalPolicies,
  OperationalPolicyKey,
  TaskerCancelPenaltyRule,
  TaskerCancellationPolicy,
  normalizeCheckinOperationPolicy,
  normalizeCustomerSchedulingPolicy,
  normalizeTaskerCancellationPolicy,
  parseCheckinOperationPolicy,
  parseCustomerSchedulingPolicy,
  parseTaskerCancellationPolicy,
} from './operational-policy';

export interface SystemConfigItem extends SystemConfigDefinition {
  value: number;
  isOverridden: boolean;
}

@Injectable()
export class SystemConfigService {
  private readonly configCache = new Map<
    string,
    { value: string; ts: number }
  >();
  private readonly CONFIG_CACHE_TTL_MS = 10 * 60 * 1000;

  clearConfigCache(key?: string): void {
    if (key) {
      this.configCache.delete(key);
    } else {
      this.configCache.clear();
    }
  }

  async getRequiredString(
    manager: EntityManager,
    key: string,
  ): Promise<string> {
    const value = await this.findValue(manager, key);

    if (value === null) {
      throw new NotFoundException(`Thiếu cấu hình hệ thống ${key}`);
    }

    return value;
  }

  /**
   * Đọc setting đã khai báo trong registry: lấy giá trị DB, không có thì dùng
   * default. Giá trị DB hỏng (không phải số / ngoài khoảng) cũng lùi về default
   * để không chặn nghiệp vụ.
   */
  async getRegisteredNumber(
    manager: EntityManager,
    key: SystemConfigKey,
  ): Promise<number> {
    const definition = findSystemConfigDefinition(key);
    if (!definition) {
      throw new AppException(`Cấu hình ${key} chưa được khai báo`, 500);
    }

    const raw = await this.findValue(manager, key);
    if (raw === null) {
      return definition.defaultValue;
    }

    const value = Number(raw);
    if (
      !Number.isFinite(value) ||
      value < definition.min ||
      value > definition.max
    ) {
      return definition.defaultValue;
    }

    return value;
  }

  /** Toàn bộ setting trong registry kèm giá trị đang hiệu lực (cho màn admin). */
  async getAdminConfigs(manager: EntityManager): Promise<SystemConfigItem[]> {
    const rows = await manager.getRepository(SystemConfigEntity).find({
      where: SYSTEM_CONFIG_DEFINITIONS.map((item) => ({ configKey: item.key })),
    });
    const stored = new Map(rows.map((row) => [row.configKey, row.configValue]));

    return Promise.all(
      SYSTEM_CONFIG_DEFINITIONS.map(async (definition) => ({
        ...definition,
        value: await this.getRegisteredNumber(
          manager,
          definition.key as SystemConfigKey,
        ),
        isOverridden: stored.has(definition.key),
      })),
    );
  }

  async updateAdminConfigs(
    manager: EntityManager,
    values: Record<string, unknown>,
  ): Promise<SystemConfigItem[]> {
    const entries = Object.entries(values).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    );

    if (entries.length === 0) {
      throw new AppException('Không có cấu hình nào để cập nhật');
    }

    const parsed = entries.map(([key, raw]) => {
      const definition = findSystemConfigDefinition(key);
      if (!definition) {
        throw new AppException(`Cấu hình ${key} không được phép chỉnh sửa`);
      }

      const value = Number(raw);
      if (!Number.isInteger(value)) {
        throw new AppException(`${definition.label} phải là số nguyên`);
      }
      if (value < definition.min || value > definition.max) {
        throw new AppException(
          `${definition.label} phải nằm trong khoảng ${definition.min.toLocaleString('vi-VN')} - ${definition.max.toLocaleString('vi-VN')}`,
        );
      }

      return { definition, value };
    });

    await this.assertConsistent(manager, parsed);

    for (const { definition, value } of parsed) {
      await manager.query(
        `INSERT INTO system_configs (config_key, config_value, description)
         VALUES ($1, $2, $3)
         ON CONFLICT (config_key)
         DO UPDATE SET config_value = EXCLUDED.config_value,
                       description = EXCLUDED.description`,
        [definition.key, String(value), definition.description],
      );
      this.clearConfigCache(definition.key);
    }

    return this.getAdminConfigs(manager);
  }

  /**
   * Policy vận hành không dùng cache RAM: thay đổi tài chính/check-in/lịch phải
   * có hiệu lực nhất quán ngay cả khi backend chạy nhiều instance.
   */
  async getOperationalPolicies(
    manager: EntityManager,
  ): Promise<OperationalPolicies> {
    const keys = Object.values(OPERATIONAL_POLICY_KEYS);
    const rows = await manager.getRepository(SystemConfigEntity).find({
      where: keys.map((configKey) => ({ configKey })),
    });
    const values = new Map(rows.map((row) => [row.configKey, row]));
    const cancellationConfig = values.get(
      OPERATIONAL_POLICY_KEYS.TASKER_CANCELLATION,
    );

    return {
      taskerCancellation: parseTaskerCancellationPolicy(
        cancellationConfig?.configValue ?? null,
        cancellationConfig?.updatedAt,
      ),
      checkin: parseCheckinOperationPolicy(
        values.get(OPERATIONAL_POLICY_KEYS.CHECKIN)?.configValue ?? null,
      ),
      customerScheduling: parseCustomerSchedulingPolicy(
        values.get(OPERATIONAL_POLICY_KEYS.CUSTOMER_SCHEDULING)?.configValue ??
          null,
      ),
    };
  }

  async getTaskerCancellationPolicy(
    manager: EntityManager,
  ): Promise<TaskerCancellationPolicy> {
    const config = await this.findFreshConfig(
      manager,
      OPERATIONAL_POLICY_KEYS.TASKER_CANCELLATION,
    );
    return parseTaskerCancellationPolicy(
      config?.configValue.trim() || null,
      config?.updatedAt,
    );
  }

  async getCheckinOperationPolicy(
    manager: EntityManager,
  ): Promise<CheckinOperationPolicy> {
    return parseCheckinOperationPolicy(
      await this.findFreshValue(manager, OPERATIONAL_POLICY_KEYS.CHECKIN),
    );
  }

  async getCustomerSchedulingPolicy(
    manager: EntityManager,
  ): Promise<CustomerSchedulingPolicy> {
    return parseCustomerSchedulingPolicy(
      await this.findFreshValue(
        manager,
        OPERATIONAL_POLICY_KEYS.CUSTOMER_SCHEDULING,
      ),
    );
  }

  async updateTaskerCancellationPolicy(
    manager: EntityManager,
    rules: TaskerCancelPenaltyRule[],
  ): Promise<TaskerCancellationPolicy> {
    return this.updateOperationalPolicy(
      manager,
      OPERATIONAL_POLICY_KEYS.TASKER_CANCELLATION,
      (current) =>
        normalizeTaskerCancellationPolicy({
          version: current.version + 1,
          effectiveFrom: new Date().toISOString(),
          rules,
        }),
    );
  }

  async updateCheckinOperationPolicy(
    manager: EntityManager,
    input: Pick<
      CheckinOperationPolicy,
      'openBeforeMinutes' | 'autoApproveRadiusMeters'
    >,
  ): Promise<CheckinOperationPolicy> {
    return this.updateOperationalPolicy(
      manager,
      OPERATIONAL_POLICY_KEYS.CHECKIN,
      (current) =>
        normalizeCheckinOperationPolicy({
          version: current.version + 1,
          effectiveFrom: new Date().toISOString(),
          ...input,
        }),
    );
  }

  async updateCustomerSchedulingPolicy(
    manager: EntityManager,
    input: Pick<
      CustomerSchedulingPolicy,
      'minAdvanceMinutes' | 'maxAdvanceDays'
    >,
  ): Promise<CustomerSchedulingPolicy> {
    return this.updateOperationalPolicy(
      manager,
      OPERATIONAL_POLICY_KEYS.CUSTOMER_SCHEDULING,
      (current) =>
        normalizeCustomerSchedulingPolicy({
          version: current.version + 1,
          effectiveFrom: new Date().toISOString(),
          ...input,
        }),
    );
  }

  private async updateOperationalPolicy<T extends { version: number }>(
    manager: EntityManager,
    key: OperationalPolicyKey,
    build: (current: T) => T,
  ): Promise<T> {
    const repository = manager.getRepository(SystemConfigEntity);
    const existing = await repository.findOne({
      where: { configKey: key },
      lock: { mode: 'pessimistic_write' },
    });
    const current = this.parseOperationalPolicy(
      key,
      existing?.configValue,
      existing?.updatedAt,
    ) as unknown as T;

    let next: T;
    try {
      next = build(current);
    } catch (error: unknown) {
      throw new AppException(
        error instanceof Error ? error.message : 'Policy vận hành không hợp lệ',
      );
    }

    const description = this.operationalPolicyDescription(key);
    if (existing) {
      existing.configValue = JSON.stringify(next);
      existing.description = description;
      await repository.save(existing);
    } else {
      await repository.save(
        repository.create({
          configKey: key,
          configValue: JSON.stringify(next),
          description,
        }),
      );
    }
    this.clearConfigCache(key);
    return next;
  }

  private parseOperationalPolicy(
    key: OperationalPolicyKey,
    raw?: string | null,
    updatedAt?: Date,
  ):
    | TaskerCancellationPolicy
    | CheckinOperationPolicy
    | CustomerSchedulingPolicy {
    if (key === OPERATIONAL_POLICY_KEYS.TASKER_CANCELLATION) {
      return parseTaskerCancellationPolicy(raw ?? null, updatedAt);
    }
    if (key === OPERATIONAL_POLICY_KEYS.CHECKIN) {
      return parseCheckinOperationPolicy(raw ?? null);
    }
    return parseCustomerSchedulingPolicy(raw ?? null);
  }

  private operationalPolicyDescription(key: OperationalPolicyKey): string {
    if (key === OPERATIONAL_POLICY_KEYS.TASKER_CANCELLATION) {
      return 'Phí hủy Tasker theo thời gian còn lại trước ca làm';
    }
    if (key === OPERATIONAL_POLICY_KEYS.CHECKIN) {
      return 'Cửa sổ và bán kính tự duyệt check-in';
    }
    return 'Giới hạn đặt lịch trước của khách hàng';
  }

  /** Ràng buộc chéo giữa các setting (min không được vượt max...). */
  private async assertConsistent(
    manager: EntityManager,
    parsed: { definition: SystemConfigDefinition; value: number }[],
  ): Promise<void> {
    const pending = new Map(
      parsed.map(({ definition, value }) => [definition.key, value]),
    );

    // Giá trị đang sửa (nếu có) đè lên giá trị hiện tại trong DB.
    const resolve = async (key: SystemConfigKey): Promise<number> =>
      pending.get(key) ?? (await this.getRegisteredNumber(manager, key));

    const minMaxPairs: [SystemConfigKey, SystemConfigKey, string][] = [
      [
        SYSTEM_CONFIG_KEYS.TOPUP_MIN_VND,
        SYSTEM_CONFIG_KEYS.TOPUP_MAX_VND,
        'Số tiền nạp tối thiểu không được lớn hơn số tiền nạp tối đa',
      ],
      [
        SYSTEM_CONFIG_KEYS.WITHDRAWAL_MIN_VND,
        SYSTEM_CONFIG_KEYS.WITHDRAWAL_MAX_VND,
        'Số tiền rút tối thiểu không được lớn hơn số tiền rút tối đa',
      ],
    ];

    for (const [minKey, maxKey, message] of minMaxPairs) {
      const [min, max] = await Promise.all([resolve(minKey), resolve(maxKey)]);
      if (min > max) {
        throw new AppException(message);
      }
    }
  }

  private async findValue(
    manager: EntityManager,
    key: string,
  ): Promise<string | null> {
    const now = Date.now();
    const cached = this.configCache.get(key);
    if (cached && now - cached.ts < this.CONFIG_CACHE_TTL_MS) {
      return cached.value;
    }

    const config = await manager.getRepository(SystemConfigEntity).findOne({
      where: { configKey: key },
    });

    if (!config) {
      return null;
    }

    const value = config.configValue.trim();
    this.configCache.set(key, { value, ts: now });
    return value;
  }

  private async findFreshValue(
    manager: EntityManager,
    key: string,
  ): Promise<string | null> {
    const config = await this.findFreshConfig(manager, key);
    return config?.configValue.trim() || null;
  }

  private findFreshConfig(
    manager: EntityManager,
    key: string,
  ): Promise<SystemConfigEntity | null> {
    return manager.getRepository(SystemConfigEntity).findOne({
      where: { configKey: key },
    });
  }

  async getRequiredNumber(
    manager: EntityManager,
    key: string,
  ): Promise<number> {
    const value = await this.getRequiredString(manager, key);
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) {
      throw new NotFoundException(`Cấu hình hệ thống ${key} không hợp lệ`);
    }

    return numberValue;
  }

  async getRequiredStringList(
    manager: EntityManager,
    key: string,
  ): Promise<string[]> {
    const value = await this.getRequiredString(manager, key);
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  async getPeakRateForSchedule(
    manager: EntityManager,
    scheduledStart: Date,
    scheduledStartTime: string,
  ): Promise<number> {
    const configs = await manager.getRepository(PeakDayConfigEntity).find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });

    const matchedConfigs = configs.filter(
      (item) =>
        this.isDateInPeakRange(item, scheduledStart) &&
        this.isTimeInPeakRange(item, scheduledStartTime),
    );
    const config = matchedConfigs.sort((current, next) => {
      const rateDiff =
        this.normalizeRate(Number(next.peakRate)) -
        this.normalizeRate(Number(current.peakRate));
      if (rateDiff !== 0) {
        return rateDiff;
      }

      return next.createdAt.getTime() - current.createdAt.getTime();
    })[0];

    return config ? this.normalizeRate(Number(config.peakRate)) : 0;
  }

  private isDateInPeakRange(
    config: PeakDayConfigEntity,
    scheduledStart: Date,
  ): boolean {
    if (config.startAt && scheduledStart < config.startAt) {
      return false;
    }

    if (config.endAt && scheduledStart >= config.endAt) {
      return false;
    }

    return true;
  }

  private isTimeInPeakRange(
    config: PeakDayConfigEntity,
    scheduledStartTime: string,
  ): boolean {
    if (!config.startTime && !config.endTime) {
      return true;
    }

    const scheduleMinutes = this.toMinutes(scheduledStartTime);
    const startMinutes = config.startTime
      ? this.toMinutes(config.startTime)
      : 0;
    const endMinutes = config.endTime
      ? this.toMinutes(config.endTime)
      : 24 * 60;

    if (startMinutes <= endMinutes) {
      return scheduleMinutes >= startMinutes && scheduleMinutes < endMinutes;
    }

    return scheduleMinutes >= startMinutes || scheduleMinutes < endMinutes;
  }

  private toMinutes(time: string | Date): number {
    const timeValue =
      time instanceof Date
        ? `${time.getHours().toString().padStart(2, '0')}:${time
            .getMinutes()
            .toString()
            .padStart(2, '0')}`
        : time;
    const [hour, minute] = timeValue.split(':').map(Number);
    return hour * 60 + minute;
  }

  private normalizeRate(value: number): number {
    if (!Number.isFinite(value)) {
      return 0;
    }

    if (value > 1) {
      return value / 100;
    }

    return value;
  }
}
