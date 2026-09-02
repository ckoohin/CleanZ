import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/**
 * Sửa sai một khoản chi trả THỦ CÔNG đã ghi nhận (chuyển nhầm số tiền / nhầm người).
 *
 * Cả hai số đều là TỔNG TÍCH LUỸ tuyệt đối, không phải phần cộng thêm: admin luôn khai
 * "đến giờ khách đã thực nhận bao nhiêu" và "đến giờ đã mất bao nhiêu". Khai theo delta thì
 * mỗi lần sửa lại phải nhớ số cũ, và hai lần bấm nhầm sẽ cộng dồn thành sổ sai.
 */
export class CorrectManualPayoutDto {
  /**
   * Tổng tiền khách THỰC SỰ đã nhận cho quyết định này. Chuyển thiếu → khai số nhỏ hơn
   * `approved` (đối soát sẽ tiếp tục báo CRITICAL cho tới khi chuyển bù đủ).
   */
  @Type(() => Number)
  @IsInt({ message: 'Số tiền khách thực nhận phải là số nguyên VND' })
  @Min(0)
  deliveredAmount!: number;

  /**
   * Tổng tiền đã rời tài khoản ngân hàng công ty nhưng KHÔNG đến tay khách (nhầm người,
   * chuyển thừa). Bỏ trống = giữ nguyên số đang ghi.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Số tiền thất thoát phải là số nguyên VND' })
  @Min(0)
  lossAmount?: number;

  /** Ảnh minh chứng bổ sung (chuyển bù / hoàn về) — cùng loại với minh chứng chi trả. */
  @IsOptional()
  @IsUUID('4')
  proofEvidenceId?: string;

  @IsString()
  @MinLength(10, { message: 'Lý do điều chỉnh phải có ít nhất 10 ký tự' })
  @MaxLength(2000)
  reason!: string;
}
