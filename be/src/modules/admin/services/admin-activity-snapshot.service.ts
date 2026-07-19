import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  DataSource,
  FindOptionsWhere,
  ObjectLiteral,
  Repository,
} from 'typeorm';
import {
  sanitizeAuditValue,
  SENSITIVE_AUDIT_KEY_PATTERN,
} from '../utils/admin-activity-sanitizer';

type SnapshotTarget = {
  path: RegExp;
  entityName: string;
  idParam: string;
};

export type AdminActivitySnapshot = {
  entityName: string;
  id: string | null;
  values: Record<string, unknown> | null;
  targetLabel: string | null;
};

export type AuditFieldChange = {
  before: unknown;
  after: unknown;
};

const SNAPSHOT_TARGETS: SnapshotTarget[] = [
  {
    path: /^admin\/pricing\/tiers(?:\/|$)/,
    entityName: 'PricingTierEntity',
    idParam: 'id',
  },
  {
    path: /^admin\/pricing\/configs(?:\/|$)/,
    entityName: 'PricingConfigEntity',
    idParam: 'id',
  },
  {
    path: /^admin\/pricing\/peak-days(?:\/|$)/,
    entityName: 'PeakDayConfigEntity',
    idParam: 'id',
  },
  {
    path: /^admin\/service-packages(?:\/|$)/,
    entityName: 'ServicePackageEntity',
    idParam: 'id',
  },
  {
    path: /^admin\/sub-services(?:\/|$)/,
    entityName: 'SubServiceEntity',
    idParam: 'id',
  },
  {
    path: /^admin\/coverage-areas(?:\/|$)/,
    entityName: 'CoverageAreaEntity',
    idParam: 'id',
  },
  {
    path: /^admin\/workflows\/[^/]+\/steps\/[^/]+(?:\/|$)/,
    entityName: 'WorkflowStepEntity',
    idParam: 'stepId',
  },
  {
    path: /^admin\/workflows(?:\/|$)/,
    entityName: 'ServiceWorkflowEntity',
    idParam: 'id',
  },
  {
    path: /^admin\/bookings(?:\/|$)/,
    entityName: 'BookingEntity',
    idParam: 'id',
  },
  {
    path: /^admin\/customers(?:\/|$)/,
    entityName: 'CustomerEntity',
    idParam: 'id',
  },
  {
    path: /^users(?:\/|$)/,
    entityName: 'User',
    idParam: 'id',
  },
  {
    path: /^tasker\/admin(?:\/|$)/,
    entityName: 'TaskerEntity',
    idParam: 'id',
  },
  {
    path: /^admin\/incidents(?:\/|$)/,
    entityName: 'IncidentEntity',
    idParam: 'id',
  },
  {
    path: /^admin\/support-tickets(?:\/|$)/,
    entityName: 'SupportTicketEntity',
    idParam: 'id',
  },
  {
    path: /^admin\/reviews\/reports(?:\/|$)/,
    entityName: 'ReviewReportEntity',
    idParam: 'reportId',
  },
  {
    path: /^admin\/reviews(?:\/|$)/,
    entityName: 'ReviewEntity',
    idParam: 'id',
  },
  {
    path: /^admin\/vouchers(?:\/|$)/,
    entityName: 'VoucherEntity',
    idParam: 'id',
  },
  {
    path: /^blog\/admin\/categories(?:\/|$)/,
    entityName: 'BlogCategoryEntity',
    idParam: 'id',
  },
  {
    path: /^blog\/admin(?:\/|$)/,
    entityName: 'BlogEntity',
    idParam: 'id',
  },
  {
    path: /^policy\/packages\/[^/]+\/policies\/[^/]+(?:\/|$)/,
    entityName: 'Policy',
    idParam: 'policyId',
  },
  {
    path: /^policy(?:\/|$)/,
    entityName: 'Policy',
    idParam: 'id',
  },
  {
    path: /^wallet\/admin\/customer-withdrawals(?:\/|$)/,
    entityName: 'CustomerWithdrawalRequestEntity',
    idParam: 'id',
  },
  {
    path: /^admin\/finance\/withdrawals(?:\/|$)/,
    entityName: 'WithdrawalRequestEntity',
    idParam: 'id',
  },
];

const IGNORED_DIFF_FIELDS = new Set([
  'id',
  'createdAt',
  'updatedAt',
  'updatedBy',
  'docReviewedBy',
  'reviewedAt',
  'processedAt',
  'lastLogin',
  'tokenVersion',
]);

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizedPath(path: string): string {
  return path.replace(/^\/api\/v1\/?/, '').replace(/^\//, '');
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function normalizeComparable(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map(normalizeComparable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        normalizeComparable(item),
      ]),
    );
  }
  return value;
}

function valuesEqual(left: unknown, right: unknown): boolean {
  return (
    JSON.stringify(normalizeComparable(left)) ===
    JSON.stringify(normalizeComparable(right))
  );
}

function flattenAuditValues(
  record: Record<string, unknown>,
  prefix = '',
  result: Record<string, unknown> = {},
  depth = 0,
): Record<string, unknown> {
  for (const [key, value] of Object.entries(record)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const nested = asRecord(value);
    if (nested && depth < 3) {
      flattenAuditValues(nested, path, result, depth + 1);
    } else {
      result[path] = value;
    }
  }
  return result;
}

function mergeRequestedValues(
  before: Record<string, unknown>,
  requested: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...before };
  for (const [key, value] of Object.entries(requested)) {
    const oldNested = asRecord(before[key]);
    const newNested = asRecord(value);
    result[key] =
      oldNested && newNested
        ? mergeRequestedValues(oldNested, newNested)
        : value;
  }
  return result;
}

function safeChangedValues(
  key: string,
  before: unknown,
  after: unknown,
): AuditFieldChange {
  if (SENSITIVE_AUDIT_KEY_PATTERN.test(key)) {
    return { before: '[REDACTED]', after: '[CHANGED]' };
  }
  if (
    /id$/i.test(key) &&
    typeof before === 'string' &&
    typeof after === 'string' &&
    UUID_PATTERN.test(before) &&
    UUID_PATTERN.test(after)
  ) {
    return { before: '[REFERENCE_BEFORE]', after: '[REFERENCE_AFTER]' };
  }
  return {
    before: sanitizeAuditValue(normalizeComparable(before), key),
    after: sanitizeAuditValue(normalizeComparable(after), key),
  };
}

export function buildAuditFieldChanges(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
  requestedBody?: Record<string, unknown> | null,
): Record<string, AuditFieldChange> {
  if (before && !after) {
    return {
      recordState: { before: '[EXISTS]', after: '[DELETED]' },
    };
  }

  const fields: Record<string, AuditFieldChange> = {};
  const beforeFields = before ? flattenAuditValues(before) : null;
  const afterFields = after ? flattenAuditValues(after) : null;
  const requestedFields = requestedBody
    ? flattenAuditValues(requestedBody)
    : null;
  const keys = beforeFields
    ? new Set([
        ...Object.keys(beforeFields),
        ...Object.keys(afterFields ?? {}),
        ...Object.keys(requestedFields ?? {}),
      ])
    : new Set(Object.keys(requestedFields ?? afterFields ?? {}));

  for (const key of keys) {
    const leafKey = key.split('.').at(-1) ?? key;
    if (IGNORED_DIFF_FIELDS.has(leafKey)) continue;
    const beforeValue = beforeFields?.[key];
    const afterValue =
      afterFields && Object.prototype.hasOwnProperty.call(afterFields, key)
        ? afterFields[key]
        : requestedFields?.[key];
    if (valuesEqual(beforeValue, afterValue)) continue;
    if (beforeValue === undefined && afterValue === undefined) continue;

    fields[key] = safeChangedValues(
      leafKey,
      beforeValue === undefined ? '[NOT_AVAILABLE]' : beforeValue,
      afterValue === undefined ? '[NOT_AVAILABLE]' : afterValue,
    );
    if (Object.keys(fields).length >= 50) break;
  }

  return fields;
}

@Injectable()
export class AdminActivitySnapshotService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async captureBefore(
    path: string,
    params: Record<string, unknown> | undefined,
  ): Promise<AdminActivitySnapshot | null> {
    const target = this.resolveTarget(path);
    if (!target) return null;
    const idValue = params?.[target.idParam];
    const id = typeof idValue === 'string' ? idValue : null;
    const values = id ? await this.readEntity(target.entityName, id) : null;
    return {
      entityName: target.entityName,
      id,
      values,
      targetLabel: this.extractTargetLabel(values),
    };
  }

  async buildSuccessChanges(input: {
    path: string;
    params: Record<string, unknown> | undefined;
    body: unknown;
    result: unknown;
    before: AdminActivitySnapshot | null;
  }): Promise<Record<string, unknown> | null> {
    const target = this.resolveTarget(input.path);
    const resultPayload = this.resultPayload(input.result);
    const resultId = resultPayload?.id;
    const id =
      input.before?.id ??
      (typeof resultId === 'string' ? resultId : null) ??
      this.paramId(target, input.params);
    const after =
      target && id ? await this.readEntity(target.entityName, id) : null;
    const body = asRecord(input.body);
    const fields = buildAuditFieldChanges(
      input.before?.values ?? null,
      after,
      body,
    );
    const targetLabel =
      this.extractTargetLabel(after) ??
      this.extractTargetLabel(resultPayload) ??
      input.before?.targetLabel ??
      null;

    if (Object.keys(fields).length === 0 && !targetLabel) return null;
    return { fields, targetLabel };
  }

  buildAttemptChanges(input: {
    body: unknown;
    before: AdminActivitySnapshot | null;
  }): Record<string, unknown> | null {
    const body = asRecord(input.body);
    const attempted = body
      ? mergeRequestedValues(input.before?.values ?? {}, body)
      : (input.before?.values ?? null);
    const fields = buildAuditFieldChanges(
      input.before?.values ?? null,
      attempted,
      body,
    );
    if (Object.keys(fields).length === 0 && !input.before?.targetLabel) {
      return null;
    }
    return {
      fields,
      targetLabel: input.before?.targetLabel ?? null,
      attempted: true,
    };
  }

  private resolveTarget(path: string): SnapshotTarget | null {
    const cleanPath = normalizedPath(path);
    return SNAPSHOT_TARGETS.find((item) => item.path.test(cleanPath)) ?? null;
  }

  private paramId(
    target: SnapshotTarget | null,
    params: Record<string, unknown> | undefined,
  ): string | null {
    if (!target) return null;
    const value = params?.[target.idParam];
    return typeof value === 'string' ? value : null;
  }

  private async readEntity(
    entityName: string,
    id: string,
  ): Promise<Record<string, unknown> | null> {
    const repository: Repository<ObjectLiteral> =
      this.dataSource.getRepository(entityName);
    const entity = await repository.findOne({
      where: { id } as FindOptionsWhere<ObjectLiteral>,
      withDeleted: true,
    });
    if (!entity) return null;

    const metadata = this.dataSource.getMetadata(entityName);
    return Object.fromEntries(
      metadata.columns.map((column) => [
        column.propertyName,
        column.getEntityValue(entity) as unknown,
      ]),
    );
  }

  private resultPayload(result: unknown): Record<string, unknown> | null {
    const response = asRecord(result);
    if (!response) return null;
    return asRecord(response.data) ?? response;
  }

  private extractTargetLabel(
    values: Record<string, unknown> | null,
  ): string | null {
    if (!values) return null;
    const value = [
      values.name,
      values.title,
      values.packageCode,
      values.bookingCode,
      values.ticketCode,
      values.code,
    ].find(
      (item): item is string =>
        typeof item === 'string' && item.trim().length > 0,
    );
    return value ? value.trim().slice(0, 160) : null;
  }
}
