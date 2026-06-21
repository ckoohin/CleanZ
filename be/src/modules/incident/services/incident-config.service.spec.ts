import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { SystemConfigService } from 'src/modules/system-config/system-config.service';
import { IncidentSeverity } from 'src/common/enums/incident-severity.enum';
import { IncidentConfigService } from './incident-config.service';

describe('IncidentConfigService', () => {
  let service: IncidentConfigService;
  let configValues: Record<string, string>;

  beforeEach(async () => {
    configValues = {
      INCIDENT_SEVERE_CRITERIA: JSON.stringify({
        categories: [],
        severeAmount: 5_000_000,
        majorAmount: 1_000_000,
      }),
      INCIDENT_REPORT_WINDOW_HOURS: '48',
      INCIDENT_REPORT_WINDOW_SEVERE_HOURS: '72',
      INCIDENT_CLAIM_MAX_AMOUNT: '20000000',
    };
    const systemConfig = {
      getRequiredString: jest.fn((_m: unknown, key: string) => {
        const v = configValues[key];
        if (v === undefined) return Promise.reject(new Error('missing'));
        return Promise.resolve(v);
      }),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        IncidentConfigService,
        { provide: DataSource, useValue: { manager: {} } },
        { provide: SystemConfigService, useValue: systemConfig },
      ],
    }).compile();
    service = moduleRef.get(IncidentConfigService);
  });

  describe('computeSeverity (TC-U-SEV-1/2)', () => {
    it('Σclaimed >= severeAmount → CRITICAL', async () => {
      expect(await service.computeSeverity(5_000_000)).toBe(
        IncidentSeverity.CRITICAL,
      );
      expect(await service.computeSeverity(9_000_000)).toBe(
        IncidentSeverity.CRITICAL,
      );
    });
    it('majorAmount <= Σclaimed < severeAmount → MAJOR', async () => {
      expect(await service.computeSeverity(1_000_000)).toBe(
        IncidentSeverity.MAJOR,
      );
      expect(await service.computeSeverity(4_999_999)).toBe(
        IncidentSeverity.MAJOR,
      );
    });
    it('Σclaimed < majorAmount → MINOR', async () => {
      expect(await service.computeSeverity(999_999)).toBe(
        IncidentSeverity.MINOR,
      );
    });
    it('fallback khi thiếu config', async () => {
      configValues = {};
      service.clearCache();
      expect(await service.computeSeverity(6_000_000)).toBe(
        IncidentSeverity.CRITICAL,
      );
    });
  });

  describe('getReportWindowHours', () => {
    it('CRITICAL → 72h, còn lại → 48h', async () => {
      expect(
        await service.getReportWindowHours(IncidentSeverity.CRITICAL),
      ).toBe(72);
      expect(await service.getReportWindowHours(IncidentSeverity.MAJOR)).toBe(
        48,
      );
      expect(await service.getReportWindowHours(IncidentSeverity.MINOR)).toBe(
        48,
      );
    });
  });
});
