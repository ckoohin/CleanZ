import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SystemConfigService } from 'src/modules/system-config/system-config.service';
import { IncidentSeverity } from 'src/common/enums/incident-severity.enum';
import {
  IC_CONFIG_KEYS,
  IC_DEFAULTS,
  SevereCriteria,
} from '../incident.constants';

export interface SlaTimings {
  receivedMins: number;
  statementMins: number;
  decisionMins: number;
  executeMins: number;
  autocloseHours: number;
}

const DEFAULT_SLA: Record<IncidentSeverity, SlaTimings> = {
  [IncidentSeverity.CRITICAL]: {
    receivedMins: 240,
    statementMins: 1440,
    decisionMins: 1440,
    executeMins: 1440,
    autocloseHours: 48,
  },
  [IncidentSeverity.MAJOR]: {
    receivedMins: 720,
    statementMins: 2160,
    decisionMins: 2880,
    executeMins: 1440,
    autocloseHours: 48,
  },
  [IncidentSeverity.MINOR]: {
    receivedMins: 1440,
    statementMins: 2880,
    decisionMins: 4320,
    executeMins: 1440,
    autocloseHours: 48,
  },
};

@Injectable()
export class IncidentConfigService {
  private readonly logger = new Logger(IncidentConfigService.name);
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

  private async getNumber(key: string, fallback: number): Promise<number> {
    const raw = await this.getRaw(key);
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : fallback;
  }

  async getSevereCriteria(): Promise<Required<SevereCriteria>> {
    const raw = await this.getRaw(IC_CONFIG_KEYS.SEVERE_CRITERIA);
    let parsed: SevereCriteria = {};
    if (raw) {
      try {
        parsed = JSON.parse(raw) as SevereCriteria;
      } catch {
        this.logger.warn('INCIDENT_SEVERE_CRITERIA không hợp lệ → fallback');
      }
    }
    return {
      categories: parsed.categories ?? [],
      severeAmount: parsed.severeAmount ?? IC_DEFAULTS.SEVERE_AMOUNT,
      majorAmount: parsed.majorAmount ?? IC_DEFAULTS.MAJOR_AMOUNT,
    };
  }

  async computeSeverity(totalClaimed: number): Promise<IncidentSeverity> {
    const c = await this.getSevereCriteria();
    if (totalClaimed >= c.severeAmount) return IncidentSeverity.CRITICAL;
    if (totalClaimed >= c.majorAmount) return IncidentSeverity.MAJOR;
    return IncidentSeverity.MINOR;
  }

  async getReportWindowHours(severity: IncidentSeverity): Promise<number> {
    if (severity === IncidentSeverity.CRITICAL) {
      return this.getNumber(
        IC_CONFIG_KEYS.REPORT_WINDOW_SEVERE_HOURS,
        IC_DEFAULTS.REPORT_WINDOW_SEVERE_HOURS,
      );
    }
    return this.getNumber(
      IC_CONFIG_KEYS.REPORT_WINDOW_HOURS,
      IC_DEFAULTS.REPORT_WINDOW_HOURS,
    );
  }

  getClaimMaxAmount(): Promise<number> {
    return this.getNumber(
      IC_CONFIG_KEYS.CLAIM_MAX_AMOUNT,
      IC_DEFAULTS.CLAIM_MAX_AMOUNT,
    );
  }

  getReportedExpiryDays(): Promise<number> {
    return this.getNumber(
      IC_CONFIG_KEYS.REPORTED_EXPIRY_DAYS,
      IC_DEFAULTS.REPORTED_EXPIRY_DAYS,
    );
  }

  getAutoCloseHours(): Promise<number> {
    return this.getNumber(
      IC_CONFIG_KEYS.AUTOCLOSE_HOURS,
      IC_DEFAULTS.AUTOCLOSE_HOURS,
    );
  }

  async getStrikePolicy(): Promise<{ lockFrom: number }> {
    const raw = await this.getRaw(IC_CONFIG_KEYS.FALSE_REPORT_STRIKES);
    if (raw) {
      try {
        const p = JSON.parse(raw) as { lockFrom?: number };
        if (typeof p.lockFrom === 'number') return { lockFrom: p.lockFrom };
      } catch {
        this.logger.warn(
          'INCIDENT_FALSE_REPORT_STRIKES không hợp lệ → fallback',
        );
      }
    }
    return { lockFrom: 3 };
  }

  async getEffectiveConfig(): Promise<Record<string, string | null>> {
    const out: Record<string, string | null> = {};
    for (const key of Object.values(IC_CONFIG_KEYS)) {
      out[key] = await this.getRaw(key);
    }
    return out;
  }

  async updateConfig(updates: Record<string, string | number>): Promise<void> {
    const allowed = new Set<string>(Object.values(IC_CONFIG_KEYS));
    for (const [key, value] of Object.entries(updates)) {
      if (!allowed.has(key)) continue;
      await this.dataSource.query(
        `INSERT INTO system_configs (config_key, config_value)
         VALUES ($1, $2)
         ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value`,
        [key, String(value)],
      );
    }
    this.clearCache();
  }

  getDualApprovalThreshold(): Promise<number> {
    return this.getNumber(
      IC_CONFIG_KEYS.DUAL_APPROVAL_THRESHOLD,
      IC_DEFAULTS.DUAL_APPROVAL_THRESHOLD,
    );
  }

  getCompensationPolicyCap(): Promise<number> {
    return this.getNumber(
      IC_CONFIG_KEYS.COMPENSATION_POLICY_CAP,
      IC_DEFAULTS.COMPENSATION_POLICY_CAP,
    );
  }

  getCoolingPeriodHours(): Promise<number> {
    return this.getNumber(
      IC_CONFIG_KEYS.COOLING_PERIOD_HOURS,
      IC_DEFAULTS.COOLING_PERIOD_HOURS,
    );
  }

  async getSla(severity: IncidentSeverity): Promise<SlaTimings> {
    const raw = await this.getRaw(IC_CONFIG_KEYS.SLA_MATRIX);
    if (raw) {
      try {
        const matrix = JSON.parse(raw) as Record<string, Partial<SlaTimings>>;
        const entry = matrix[severity];
        if (entry) return { ...DEFAULT_SLA[severity], ...entry };
      } catch {
        this.logger.warn('INCIDENT_SLA_MATRIX không hợp lệ → fallback');
      }
    }
    return DEFAULT_SLA[severity];
  }
}
