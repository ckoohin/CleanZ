/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { EmailChannel } from './email.channel';
import { NotificationType } from 'src/common/enums/notification-type.enum';

describe('EmailChannel (TC-U-EM)', () => {
  let channel: EmailChannel;
  let mail: { sendNotificationEmail: jest.Mock };
  let userRepo: { findOne: jest.Mock };

  beforeEach(() => {
    mail = { sendNotificationEmail: jest.fn().mockResolvedValue(undefined) };
    userRepo = { findOne: jest.fn() };
    channel = new EmailChannel(mail as any, userRepo as any);
  });

  it('gửi email đúng địa chỉ + subject theo type', async () => {
    userRepo.findOne.mockResolvedValue({
      id: 'u1',
      email: 'a@b.c',
      fullName: 'An',
    });
    await channel.send({
      userId: 'u1',
      type: NotificationType.BOOKING_CONFIRMED,
      title: 'Đơn đã xác nhận',
      content: 'noi dung',
    });
    expect(mail.sendNotificationEmail).toHaveBeenCalledWith(
      'a@b.c',
      'An',
      'Đơn đặt lịch đã được xác nhận',
      { title: 'Đơn đã xác nhận', content: 'noi dung' },
    );
  });

  it('subject fallback về title khi type không có map', async () => {
    userRepo.findOne.mockResolvedValue({
      id: 'u1',
      email: 'a@b.c',
      fullName: 'An',
    });
    await channel.send({
      userId: 'u1',
      type: NotificationType.PROMOTION,
      title: 'Khuyến mãi hè',
    });
    expect(mail.sendNotificationEmail).toHaveBeenCalledWith(
      'a@b.c',
      'An',
      'Khuyến mãi hè',
      expect.objectContaining({ title: 'Khuyến mãi hè' }),
    );
  });

  it('user không email → skip, không gọi mail (không throw)', async () => {
    userRepo.findOne.mockResolvedValue({
      id: 'u1',
      email: null,
      fullName: 'An',
    });
    await expect(
      channel.send({ userId: 'u1', type: NotificationType.SYSTEM, title: 't' }),
    ).resolves.toBeUndefined();
    expect(mail.sendNotificationEmail).not.toHaveBeenCalled();
  });

  it('lỗi SMTP/template → log và không throw để không làm fail notification job', async () => {
    userRepo.findOne.mockResolvedValue({
      id: 'u1',
      email: 'a@b.c',
      fullName: 'An',
    });
    mail.sendNotificationEmail.mockRejectedValue(new Error('SMTP down'));
    await expect(
      channel.send({ userId: 'u1', type: NotificationType.SYSTEM, title: 't' }),
    ).resolves.toBeUndefined();
  });
});
