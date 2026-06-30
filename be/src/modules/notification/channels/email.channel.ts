import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from 'src/modules/users/entities/user.entity';
import { MailService } from 'src/modules/mail/mail.service';
import { NotificationType } from 'src/common/enums/notification-type.enum';
import { NotifyInput } from '../types/notify-input.interface';

const EMAIL_SUBJECTS: Partial<Record<NotificationType, string>> = {
  [NotificationType.BOOKING_CONFIRMED]: 'Đơn đặt lịch đã được xác nhận',
  [NotificationType.TASKER_ON_THE_WAY]: 'Tasker đang trên đường tới',
  [NotificationType.BOOKING_COMPLETED]: 'Đơn dịch vụ đã hoàn thành',
  [NotificationType.BOOKING_CANCELLED]: 'Đơn đặt lịch đã bị hủy',
  [NotificationType.PAYMENT_SUCCESS]: 'Thanh toán thành công',
  [NotificationType.PAYMENT_FAILED]: 'Thanh toán thất bại',
  [NotificationType.INCIDENT_UPDATE]: 'Cập nhật sự cố',
  [NotificationType.SUPPORT_REPLY]: 'Phản hồi từ bộ phận hỗ trợ',
};

@Injectable()
export class EmailChannel {
  private readonly logger = new Logger(EmailChannel.name);

  constructor(
    private readonly mailService: MailService,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  async send(input: NotifyInput): Promise<void> {
    const user = await this.userRepo.findOne({
      where: { id: input.userId },
      select: { id: true, email: true, fullName: true },
    });

    if (!user?.email) {
      this.logger.warn(
        `Skip email: user ${input.userId} không có địa chỉ email`,
      );
      return;
    }

    const subject = EMAIL_SUBJECTS[input.type] ?? input.title;
    try {
      await this.mailService.sendNotificationEmail(
        user.email,
        user.fullName,
        subject,
        {
          title: input.title,
          content: input.content,
        },
      );
    } catch (err) {
      this.logger.error(
        `Skip email notification: user=${input.userId}, type=${input.type}, error=${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
