import { IncidentAlertService } from './incident-alert.service';

function make(env: Record<string, string | undefined>): IncidentAlertService {
  const config = { get: (k: string) => env[k] } as never;
  return new IncidentAlertService(config);
}

describe('IncidentAlertService', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
    jest.restoreAllMocks();
  });

  it('không cấu hình webhook → chỉ log, không gọi fetch, trả false', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as never;
    const svc = make({});
    const sent = await svc.send('k', 'msg');
    expect(sent).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('có webhook → POST JSON {text} kèm severity emoji', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true } as never);
    global.fetch = fetchMock as never;
    const svc = make({ INCIDENT_ALERT_WEBHOOK_URL: 'https://hook.test/x' });
    const sent = await svc.send('k', 'quỹ thấp', 'CRITICAL');
    expect(sent).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('https://hook.test/x');
    const body = JSON.parse((opts as { body: string }).body);
    expect(body.text).toContain('🔴');
    expect(body.text).toContain('quỹ thấp');
  });

  it('throttle theo key: lần 2 trong khoảng interval không gửi lại', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true } as never);
    global.fetch = fetchMock as never;
    const svc = make({
      INCIDENT_ALERT_WEBHOOK_URL: 'https://hook.test/x',
      INCIDENT_ALERT_MIN_INTERVAL_MS: '60000',
    });
    expect(await svc.send('same', 'a')).toBe(true);
    expect(await svc.send('same', 'b')).toBe(false); // throttled
    expect(await svc.send('other', 'c')).toBe(true); // key khác → gửi
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('webhook lỗi mạng → nuốt lỗi, trả false (không ném)', async () => {
    const fetchMock = jest.fn().mockRejectedValue(new Error('boom'));
    global.fetch = fetchMock as never;
    const svc = make({ INCIDENT_ALERT_WEBHOOK_URL: 'https://hook.test/x' });
    await expect(svc.send('k', 'm')).resolves.toBe(false);
  });

  it('webhook HTTP non-2xx → trả false', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: false, status: 500 } as never);
    global.fetch = fetchMock as never;
    const svc = make({ INCIDENT_ALERT_WEBHOOK_URL: 'https://hook.test/x' });
    await expect(svc.send('k', 'm')).resolves.toBe(false);
  });
});
