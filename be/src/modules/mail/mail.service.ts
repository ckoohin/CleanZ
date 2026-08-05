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

  async sendTempPasswordEmail(
    email: string,
    fullName: string,
    tempPassword: string,
    loginUrl: string,
  ): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Tài khoản KingOfService của bạn đã được tạo',
      template: 'temp-password',
      context: {
        fullName,
        tempPassword,
        loginUrl,
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
    notes?: string,
  ): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Hồ sơ tasker của bạn đã bị từ chối',
      template: 'tasker-rejected',
      context: {
        fullName,
        notes: notes?.trim() || null,
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

  async sendTaskerRequestInfoEmail(
    email: string,
    fullName: string,
    notes: string,
    kycResubmitUrl?: string,
  ): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Hồ sơ tasker của bạn cần bổ sung thông tin',
      template: 'tasker-request-info',
      context: { fullName, notes, kycResubmitUrl },
    });
  }

  async sendTaskerBannedEmail(
    email: string,
    fullName: string,
    reason: string,
    options?: { isPermanent?: boolean; appealUrl?: string },
  ): Promise<void> {
    const isPermanent = options?.isPermanent ?? false;
    await this.mailerService.sendMail({
      to: email,
      subject: isPermanent
        ? 'Tài khoản tasker của bạn đã bị chấm dứt'
        : 'Tài khoản tasker của bạn đã bị tạm khóa',
      template: 'tasker-banned',
      context: {
        fullName,
        reason,
        isPermanent,
        // Chỉ ban vĩnh viễn mới hiện nút kháng cáo.
        appealUrl: isPermanent ? options?.appealUrl : undefined,
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

  /**
   * Gửi bảng kê thu nhập kèm file PDF đính kèm.
   *
   * Handlebars đang bật `strict: true` (mail.module.ts) nên MỌI biến template
   * dùng đều phải có mặt trong `context` — thiếu một key là ném lỗi lúc render,
   * không phải render rỗng.
   */
  async sendTaskerEarningsReportEmail(
    email: string,
    fullName: string,
    context: {
      rangeLabel: string;
      periodLabel: string;
      netIncome: string;
      grossRevenue: string;
      platformFee: string;
      completedBookings: number;
      generatedAt: string;
    },
    attachment: { filename: string; content: Buffer },
  ): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: `Bảng kê thu nhập CleanZ — ${context.rangeLabel}`,
      template: 'tasker-earnings-report',
      context: {
        fullName,
        ...context,
      },
      attachments: [
        {
          filename: attachment.filename,
          content: attachment.content,
          contentType: 'application/pdf',
        },
      ],
    });
  }
}
