/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { NotificationGateway } from './notification.gateway';
import { WsJwtGuard } from './guards/ws-jwt.guard';

describe('NotificationGateway (TC-U-GW)', () => {
  let gateway: NotificationGateway;
  let wsJwt: { verifyFromHandshake: jest.Mock };

  const makeClient = (): any => ({
    id: 'sid1',
    join: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn(),
  });

  beforeEach(() => {
    wsJwt = { verifyFromHandshake: jest.fn() };
    gateway = new NotificationGateway(wsJwt as unknown as WsJwtGuard);
  });

  it('cookie hợp lệ → join room user:<id>, không disconnect', async () => {
    wsJwt.verifyFromHandshake.mockReturnValue('u1');
    const client = makeClient();
    await gateway.handleConnection(client);
    expect(client.join).toHaveBeenCalledWith('user:u1');
    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it('không/invalid cookie → disconnect, không join', async () => {
    wsJwt.verifyFromHandshake.mockReturnValue(null);
    const client = makeClient();
    await gateway.handleConnection(client);
    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(client.join).not.toHaveBeenCalled();
  });

  it('emitNewNotification → emit tới room đúng event', () => {
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({ emit });
    (gateway as any).server = { to };
    gateway.emitNewNotification('u1', { id: 'n1' } as any);
    expect(to).toHaveBeenCalledWith('user:u1');
    expect(emit).toHaveBeenCalledWith('notification:new', { id: 'n1' });
  });

  it('emitUnreadCount → emit {count} tới room', () => {
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({ emit });
    (gateway as any).server = { to };
    gateway.emitUnreadCount('u1', 5);
    expect(to).toHaveBeenCalledWith('user:u1');
    expect(emit).toHaveBeenCalledWith('notification:unread_count', {
      count: 5,
    });
  });
});
