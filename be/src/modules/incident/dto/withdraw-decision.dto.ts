import { IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';

/**
 * Thu hồi một quyết định ĐÃ CHỐT nhưng CHƯA chi trả, để soạn lại.
 *
 * Bắt buộc có lý do vì hai bên đã nhận thông báo "quyết định đã chốt": rút lại một lời hứa
 * đã phát đi là hành vi cần dấu vết, dù chưa đồng nào rời ví.
 */
export class WithdrawDecisionDto {
  @IsInt()
  @Min(0)
  expectedDecisionVersion!: number;

  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  reason!: string;
}
