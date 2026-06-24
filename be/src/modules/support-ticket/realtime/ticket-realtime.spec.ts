/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { TicketMessageAudience } from 'src/common/enums/ticket-message-audience.enum';
import {
  TICKET_EVENT_MESSAGE,
  ticketAudienceRoom,
} from './ticket-events.constants';
import { TicketRealtimeService } from './ticket-realtime.service';

const ticket: any = { id: 'tk1' };

describe('ticketAudienceRoom (TC-U-CHAT-RT)', () => {
  it('room theo (ticket, audience)', () => {
    expect(ticketAudienceRoom('tk1', TicketMessageAudience.REPORTER)).toBe(
      'ticket:tk1:REPORTER',
    );
    expect(ticketAudienceRoom('tk1', TicketMessageAudience.INTERNAL)).toBe(
      'ticket:tk1:INTERNAL',
    );
  });
});

describe('TicketRealtimeService.emitMessage', () => {
  it('phát ticket:message tới đúng room của luồng', () => {
    const gateway = { emitToRoom: jest.fn() } as any;
    const svc = new TicketRealtimeService(gateway);
    const msg: any = { id: 'm1', body: 'hi' };
    svc.emitMessage(ticket, TicketMessageAudience.REPORTER, msg);
    expect(gateway.emitToRoom).toHaveBeenCalledTimes(1);
    expect(gateway.emitToRoom).toHaveBeenCalledWith(
      'ticket:tk1:REPORTER',
      TICKET_EVENT_MESSAGE,
      expect.objectContaining({ ticketId: 'tk1', audience: 'REPORTER' }),
    );
  });

  it('INTERNAL phát vào room nội bộ (không lộ ra room user)', () => {
    const gateway = { emitToRoom: jest.fn() } as any;
    const svc = new TicketRealtimeService(gateway);
    svc.emitMessage(ticket, TicketMessageAudience.INTERNAL, {
      id: 'm2',
    } as any);
    expect(gateway.emitToRoom).toHaveBeenCalledWith(
      'ticket:tk1:INTERNAL',
      TICKET_EVENT_MESSAGE,
      expect.anything(),
    );
  });

  it('lỗi gateway không làm vỡ nghiệp vụ (best-effort)', () => {
    const gateway = {
      emitToRoom: jest.fn(() => {
        throw new Error('socket down');
      }),
    } as any;
    const svc = new TicketRealtimeService(gateway);
    expect(() =>
      svc.emitMessage(ticket, TicketMessageAudience.REPORTER, {} as any),
    ).not.toThrow();
  });
});
