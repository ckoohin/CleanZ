import { NotificationRefType } from 'src/common/enums/notification-ref-type.enum';
import { NotificationType } from 'src/common/enums/notification-type.enum';
import { NotificationOutboxStatus } from 'src/common/enums/notification-outbox-status.enum';
import { NotificationOutboxEntity } from '../entity/notification-outbox.entity';
import { IncidentNotificationOutboxWorkerService } from './incident-notification-outbox-worker.service';

describe('IncidentNotificationOutboxWorkerService', () => {
  const makeService = (
    overrides?: Partial<{
      dataSource: Record<string, unknown>;
      notification: Record<string, unknown>;
      config: Record<string, unknown>;
    }>,
  ) =>
    new IncidentNotificationOutboxWorkerService(
      (overrides?.dataSource ?? {}) as never,
      (overrides?.notification ?? { notify: jest.fn() }) as never,
      (overrides?.config ?? { get: jest.fn() }) as never,
    );

  it('maps outbox row to deduped incident notification input', () => {
    const service = makeService() as unknown as {
      toNotifyInput: (row: NotificationOutboxEntity) => unknown;
    };

    const input = service.toNotifyInput({
      eventType: 'INCIDENT_COMPENSATION_RECORDED',
      refId: 'incident-1',
      recipient: { id: 'user-1' },
      dedupeKey: 'incident:1:compensation-recorded:user-1',
      payload: {
        incidentCode: 'IC-1',
        approvedAmount: 1500000,
      },
    } as unknown as NotificationOutboxEntity);

    expect(input).toEqual({
      userId: 'user-1',
      type: NotificationType.INCIDENT_UPDATE,
      title: 'Đã ghi nhận bồi thường sự cố',
      content:
        'Khoản bồi thường 1.500.000đ cho sự cố (mã IC-1) đã được hoàn vào ví của bạn.',
      referenceType: NotificationRefType.INCIDENT,
      referenceId: 'incident-1',
      dedupeKey: 'incident:1:compensation-recorded:user-1',
    });
  });

  it('calculates exponential retry backoff capped at five minutes', () => {
    const service = makeService() as unknown as {
      calculateNextRetryAt: (base: Date, retryCount: number) => Date;
    };
    const base = new Date('2026-01-01T00:00:00.000Z');

    expect(service.calculateNextRetryAt(base, 1).getTime()).toBe(
      base.getTime() + 5_000,
    );
    expect(service.calculateNextRetryAt(base, 2).getTime()).toBe(
      base.getTime() + 10_000,
    );
    expect(service.calculateNextRetryAt(base, 20).getTime()).toBe(
      base.getTime() + 300_000,
    );
  });

  it('marks a row SENT after NotificationService accepts the job', async () => {
    const row = makeRow();
    const saved: NotificationOutboxEntity[] = [];
    const notification = { notify: jest.fn().mockResolvedValue(undefined) };
    const manager = makeManager(row, saved);
    const dataSource = {
      transaction: jest.fn((fn) => fn(manager)),
    };
    const service = makeService({ dataSource, notification }) as unknown as {
      processOneDueRow: () => Promise<unknown>;
    };

    await expect(service.processOneDueRow()).resolves.toEqual({
      status: NotificationOutboxStatus.SENT,
      terminalFailed: false,
    });

    expect(notification.notify).toHaveBeenCalledTimes(1);
    expect(saved[0]).toMatchObject({
      status: NotificationOutboxStatus.SENT,
      retryCount: 0,
      lastError: null,
      nextRetryAt: null,
    });
    expect(saved[0].sentAt).toEqual(new Date('2026-01-01T00:00:00.000Z'));
  });

  it('marks a row FAILED with retry schedule when notify fails before max retries', async () => {
    const row = makeRow({ retryCount: 1 });
    const saved: NotificationOutboxEntity[] = [];
    const notification = {
      notify: jest.fn().mockRejectedValue(new Error('queue down')),
    };
    const manager = makeManager(row, saved);
    const dataSource = {
      transaction: jest.fn((fn) => fn(manager)),
    };
    const service = makeService({
      dataSource,
      notification,
      config: {
        get: jest.fn((key: string) =>
          key.endsWith('MAX_RETRIES') ? '5' : undefined,
        ),
      },
    }) as unknown as {
      processOneDueRow: () => Promise<unknown>;
    };

    await expect(service.processOneDueRow()).resolves.toEqual({
      status: NotificationOutboxStatus.FAILED,
      terminalFailed: false,
    });

    expect(saved[0]).toMatchObject({
      status: NotificationOutboxStatus.FAILED,
      retryCount: 2,
      sentAt: null,
    });
    expect(saved[0].lastError).toContain('queue down');
    expect(saved[0].nextRetryAt).toEqual(new Date('2026-01-01T00:00:10.000Z'));
  });

  it('keeps processing following rows when one recipient fails', async () => {
    const service = makeService({
      config: {
        get: jest.fn((key: string) =>
          key.endsWith('BATCH_SIZE') ? '3' : undefined,
        ),
      },
    }) as unknown as {
      processOneDueRow: jest.Mock;
      runDueBatch: () => Promise<unknown>;
    };
    service.processOneDueRow = jest
      .fn()
      .mockResolvedValueOnce({
        status: NotificationOutboxStatus.FAILED,
        terminalFailed: false,
      })
      .mockResolvedValueOnce({
        status: NotificationOutboxStatus.SENT,
        terminalFailed: false,
      })
      .mockResolvedValueOnce(null);

    await expect(service.runDueBatch()).resolves.toEqual({
      processed: 2,
      sent: 1,
      failed: 1,
      terminalFailed: 0,
    });
  });
});

function makeRow(
  patch?: Partial<NotificationOutboxEntity>,
): NotificationOutboxEntity {
  return {
    id: 'outbox-1',
    eventType: 'INCIDENT_DECISION_FINALIZED',
    refType: 'INCIDENT',
    refId: 'incident-1',
    recipient: { id: 'user-1' },
    decisionVersion: 2,
    payload: { incidentCode: 'IC-1' },
    dedupeKey: 'dedupe-1',
    status: NotificationOutboxStatus.PENDING,
    retryCount: 0,
    nextRetryAt: null,
    sentAt: null,
    lastError: null,
    ...patch,
  } as NotificationOutboxEntity;
}

function makeManager(
  row: NotificationOutboxEntity | null,
  saved: NotificationOutboxEntity[],
) {
  const qb = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    setLock: jest.fn().mockReturnThis(),
    setOnLocked: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(row),
  };
  const repo = {
    createQueryBuilder: jest.fn(() => qb),
    save: jest.fn((entity: NotificationOutboxEntity) => {
      saved.push(entity);
      return Promise.resolve(entity);
    }),
  };
  return {
    getRepository: jest.fn(() => repo),
    query: jest.fn().mockResolvedValue([{ now: '2026-01-01T00:00:00.000Z' }]),
  };
}
