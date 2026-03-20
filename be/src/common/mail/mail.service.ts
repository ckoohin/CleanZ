import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendStaffWelcomeEmail(
    email: string,
    fullName: string,
    tempPassword: string,
  ): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Tài khoản nhân viên của bạn đã được tạo',
      template: 'staff-welcome',
      html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; text-align: center;">
        <h2 style="color: #166534;">Chào mừng bạn, ${fullName}!</h2>
        <p>Tài khoản nhân viên của bạn đã được tạo thành công.</p>
        <p>Dưới đây là thông tin đăng nhập của bạn:</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>Email:</strong> ${email}</p>
          <p style="margin: 4px 0;"><strong>Mật khẩu tạm thời:</strong> 
            <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px;">${tempPassword}</code>
          </p>
        </div>
        <p style="color: #ef4444;">Vui lòng đổi mật khẩu ngay sau khi đăng nhập lần đầu!</p>
        <p>Trân trọng,<br/>Đội ngũ quản trị</p>
      </div>`,
    });
  }
}
