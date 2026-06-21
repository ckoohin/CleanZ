import { ChannelResolverService } from './channel-resolver.service';
import { NotificationType } from 'src/common/enums/notification-type.enum';

describe('ChannelResolverService (TC-U-CR)', () => {
  const resolver = new ChannelResolverService();

  it('returns IN_APP + EMAIL for transactional types', () => {
    expect(
      resolver.resolve({
        userId: 'u1',
        type: NotificationType.BOOKING_CONFIRMED,
        title: 't',
      }),
    ).toEqual(['IN_APP', 'EMAIL']);
  });

  it('returns only IN_APP for PROMOTION (né spam email)', () => {
    expect(
      resolver.resolve({
        userId: 'u1',
        type: NotificationType.PROMOTION,
        title: 't',
      }),
    ).toEqual(['IN_APP']);
  });

  it('returns only IN_APP for SYSTEM', () => {
    expect(
      resolver.resolve({
        userId: 'u1',
        type: NotificationType.SYSTEM,
        title: 't',
      }),
    ).toEqual(['IN_APP']);
  });

  it('honours explicit channels override', () => {
    expect(
      resolver.resolve({
        userId: 'u1',
        type: NotificationType.BOOKING_CONFIRMED,
        title: 't',
        channels: ['IN_APP'],
      }),
    ).toEqual(['IN_APP']);
  });

  it('covers all 10 notification types with a non-empty channel list', () => {
    for (const type of Object.values(NotificationType)) {
      const channels = resolver.resolve({ userId: 'u1', type, title: 't' });
      expect(channels.length).toBeGreaterThan(0);
      expect(channels).toContain('IN_APP');
    }
  });
});
