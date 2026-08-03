import { IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class ReverseCompensationDto {
  /**
   * Khoá lạc quan — BẮT BUỘC, giống mọi lệnh chạm quyết định khác.
   *
   * `reverse()` từng là lệnh duy nhất không có nó, dù là lệnh đảo dòng tiền thật (đòi lại ví
   * Khách, trả ví Tasker, hoàn quỹ). Admin mở hồ sơ thấy "đã chi 3.000.000đ", gõ lý do, rời
   * đi; trong lúc đó hồ sơ bị đảo và chi lại ở version mới với số khác — lệnh của họ vẫn
   * chạy, nhưng trên một quyết định họ chưa từng đọc.
   *
   * Đây là chân còn thiếu của kiềng ba chân thay cho duyệt cấp 2: khoá lạc quan + cửa sổ
   * hoàn tác + cảnh báo.
   */
  @IsInt()
  @Min(0)
  expectedDecisionVersion!: number;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  reason!: string;
}
