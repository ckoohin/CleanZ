import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendVerificationEmail(
    email: string,
    fullName: string,
    verificationUrl: string,
  ): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Xác thực email đăng ký tài khoản',
      template: 'verify-email',
      context: {
        fullName,
        verificationUrl,
      },
    });
  }

  async sendResetPasswordEmail(
    email: string,
    fullName: string,
    resetUrl: string,
  ): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Đặt lại mật khẩu tài khoản',
      template: 'reset-password',
      context: {
        fullName,
        resetUrl,
      },
    });
  }

  async sendLoginOtpEmail(
    email: string,
    fullName: string,
    otp: string,
  ): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Mã xác thực đăng nhập',
      template: 'login-otp',
      context: {
        fullName,
        otp,
      },
    });
  }

  async sendTaskerApprovedEmail(
    email: string,
    fullName: string,
  ): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Hồ sơ tasker của bạn đã được phê duyệt',
      template: 'tasker-approved',
      context: {
        fullName,
      },
    });
  }

  async sendTaskerRejectedEmail(
    email: string,
    fullName: string,
  ): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Hồ sơ tasker của bạn đã bị từ chối',
      template: 'tasker-rejected',
      context: {
        fullName,
      },
    });
  }

  async sendNotificationEmail(
    email: string,
    fullName: string,
    subject: string,
    context: { title: string; content?: string | null },
  ): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject,
      template: 'notification-generic',
      context: {
        fullName,
        title: context.title,
        content: context.content ?? '',
      },
    });
  }

  async sendBookingNotificationEmail(
    email: string,
    fullName: string,
    subject: string,
    context: {
      serviceName: string;
      bookingId: string;
      status: string;
      bookingType: string;
      address?: string;
      scheduledDate?: string;
      scheduledTime?: string;
      totalPrice: number;
    },
  ): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject,
      template: 'booking-notification',
      context: {
        fullName,
        ...context,
      },
    });
  }
}
