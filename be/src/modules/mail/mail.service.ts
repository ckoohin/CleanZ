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

  async sendWorkerApprovedEmail(
    email: string,
    fullName: string,
  ): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Hồ sơ worker của bạn đã được phê duyệt',
      template: 'worker-approved',
      context: {
        fullName,
      },
    });
  }

  async sendWorkerRejectedEmail(
    email: string,
    fullName: string,
  ): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Hồ sơ worker của bạn đã bị từ chối',
      template: 'worker-rejected',
      context: {
        fullName,
      },
    });
  }
}
