import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Lý do mở lại ticket đã đóng. Bắt buộc nhập để admin biết vì sao khách quay
 * lại — lý do được ghi thẳng vào `ticket_status_logs` (tab Lịch sử).
 */
export class ReopenTicketDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: 'Vui lòng mô tả lý do mở lại (ít nhất 10 ký tự)' })
  @MaxLength(500)
  reason!: string;
}
