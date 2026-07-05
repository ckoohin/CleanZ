import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { SystemConfigEntity } from './entity/system-config.entity';
import { PeakDayConfigEntity } from '../pricing/entity/peak-day-config.entity';

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
    const now = Date.now();
    const cached = this.configCache.get(key);
    if (cached && now - cached.ts < this.CONFIG_CACHE_TTL_MS) {
      return cached.value;
    }

    const config = await manager.getRepository(SystemConfigEntity).findOne({
      where: { configKey: key },
    });

    if (!config) {
      throw new NotFoundException(`Thiếu cấu hình hệ thống ${key}`);
    }

    const value = config.configValue.trim();
    this.configCache.set(key, { value, ts: now });
    return value;
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

  /**
   * Đọc cấu hình dạng số; trả về `defaultValue` nếu chưa cấu hình hoặc giá trị không hợp lệ.
   * Dùng cho các ngưỡng có mặc định an toàn (vd số dư ví tối thiểu).
   */
  async getOptionalNumber(
    manager: EntityManager,
    key: string,
    defaultValue: number,
  ): Promise<number> {
    const config = await manager.getRepository(SystemConfigEntity).findOne({
      where: { configKey: key },
    });
    if (!config) {
      return defaultValue;
    }
    const numberValue = Number(config.configValue.trim());
    return Number.isFinite(numberValue) ? numberValue : defaultValue;
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
