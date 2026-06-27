import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SystemConfigService } from 'src/modules/system-config/system-config.service';
import { TicketCategory } from 'src/common/enums/ticket-category.enum';
import { TicketPriority } from 'src/common/enums/ticket-priority.enum';
import { ST_CONFIG_KEYS, ST_DEFAULTS } from '../support-ticket.constants';

export interface SlaWindow {
  responseMins: number;
  resolutionMins: number;
}

const DEFAULT_SLA: Record<TicketPriority, SlaWindow> = {
  [TicketPriority.URGENT]: { responseMins: 15, resolutionMins: 240 },
  [TicketPriority.HIGH]: { responseMins: 30, resolutionMins: 120 },
  [TicketPriority.MEDIUM]: { responseMins: 120, resolutionMins: 1440 },
  [TicketPriority.LOW]: { responseMins: 120, resolutionMins: 1440 },
};

const DEFAULT_CATEGORY_PRIORITY: Record<TicketCategory, TicketPriority> = {
  [TicketCategory.SERVICE_QUALITY]: TicketPriority.MEDIUM,
  [TicketCategory.TASKER_BEHAVIOR]: TicketPriority.HIGH,
  [TicketCategory.SCHEDULING]: TicketPriority.HIGH,
  [TicketCategory.PROPERTY_DAMAGE]: TicketPriority.URGENT,
  [TicketCategory.PAYMENT_BILLING]: TicketPriority.MEDIUM,
  [TicketCategory.ACCOUNT_TECHNICAL]: TicketPriority.LOW,
  [TicketCategory.APPEAL]: TicketPriority.HIGH,
  [TicketCategory.OTHER]: TicketPriority.LOW,
};

@Injectable()
export class TicketConfigService {
  private readonly logger = new Logger(TicketConfigService.name);
  private cache = new Map<string, { value: string; at: number }>();
  private readonly TTL_MS = 60_000;

  constructor(
    private readonly dataSource: DataSource,
    private readonly systemConfig: SystemConfigService,
  ) {}

  private async getRaw(key: string): Promise<string | null> {
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < this.TTL_MS) return hit.value;
    try {
      const value = await this.systemConfig.getRequiredString(
        this.dataSource.manager,
        key,
      );
      this.cache.set(key, { value, at: Date.now() });
      return value;
    } catch {
      return null;
    }
  }

  clearCache(): void {
    this.cache.clear();
  }

  async getSlaWindow(priority: TicketPriority): Promise<SlaWindow> {
    const raw = await this.getRaw(ST_CONFIG_KEYS.SLA_MATRIX);
    if (raw) {
      try {
        const matrix = JSON.parse(raw) as Record<string, SlaWindow>;
        if (matrix[priority]) return matrix[priority];
      } catch {
        this.logger.warn('TICKET_SLA_MATRIX không phải JSON hợp lệ → fallback');
      }
    }
    return DEFAULT_SLA[priority];
  }

  async getDefaultPriority(category: TicketCategory): Promise<TicketPriority> {
    const raw = await this.getRaw(ST_CONFIG_KEYS.CATEGORY_PRIORITY);
    if (raw) {
      try {
        const map = JSON.parse(raw) as Record<string, TicketPriority>;
        if (map[category]) return map[category];
      } catch {
        this.logger.warn('TICKET_CATEGORY_PRIORITY không hợp lệ → fallback');
      }
    }
    return DEFAULT_CATEGORY_PRIORITY[category];
  }

  async getComplaintWindowDays(): Promise<number> {
    const raw = await this.getRaw(ST_CONFIG_KEYS.COMPLAINT_WINDOW_DAYS);
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : ST_DEFAULTS.COMPLAINT_WINDOW_DAYS;
  }

  async getAutoCloseHours(): Promise<number> {
    const raw = await this.getRaw(ST_CONFIG_KEYS.AUTOCLOSE_HOURS);
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : ST_DEFAULTS.AUTOCLOSE_HOURS;
  }

  async getEffectiveConfig(): Promise<{
    slaMatrix: Record<string, SlaWindow>;
    categoryPriority: Record<string, TicketPriority>;
    autoCloseHours: number;
    complaintWindowDays: number;
  }> {
    const slaRaw = await this.getRaw(ST_CONFIG_KEYS.SLA_MATRIX);
    const catRaw = await this.getRaw(ST_CONFIG_KEYS.CATEGORY_PRIORITY);
    const parse = <T>(raw: string | null, fb: T): T => {
      if (!raw) return fb;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return fb;
      }
    };
    return {
      slaMatrix: parse(slaRaw, DEFAULT_SLA),
      categoryPriority: parse(catRaw, DEFAULT_CATEGORY_PRIORITY),
      autoCloseHours: await this.getAutoCloseHours(),
      complaintWindowDays: await this.getComplaintWindowDays(),
    };
  }

  // PUT cấu hình (config dịch vụ) — upsert system_configs + invalidate cache. FR-G3.
  async updateConfig(dto: {
    slaMatrix?: unknown;
    categoryPriority?: unknown;
    autoCloseHours?: number;
    complaintWindowDays?: number;
  }): Promise<void> {
    const updates: { key: string; value: string }[] = [];
    if (dto.slaMatrix !== undefined)
      updates.push({
        key: ST_CONFIG_KEYS.SLA_MATRIX,
        value: JSON.stringify(dto.slaMatrix),
      });
    if (dto.categoryPriority !== undefined)
      updates.push({
        key: ST_CONFIG_KEYS.CATEGORY_PRIORITY,
        value: JSON.stringify(dto.categoryPriority),
      });
    if (dto.autoCloseHours !== undefined)
      updates.push({
        key: ST_CONFIG_KEYS.AUTOCLOSE_HOURS,
        value: String(dto.autoCloseHours),
      });
    if (dto.complaintWindowDays !== undefined)
      updates.push({
        key: ST_CONFIG_KEYS.COMPLAINT_WINDOW_DAYS,
        value: String(dto.complaintWindowDays),
      });

    for (const u of updates) {
      await this.dataSource.query(
        `INSERT INTO system_configs (config_key, config_value)
         VALUES ($1, $2)
         ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value`,
        [u.key, u.value],
      );
    }
    this.clearCache(); // lần đọc sau lấy giá trị mới (FR-G3)
  }
}
