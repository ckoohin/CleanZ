import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class FinalizeIncidentDecisionDto {
  @IsInt()
  @Min(0)
  expectedDecisionVersion!: number;

  /**
   * Chỉ áp dụng khi finalize một draft REJECT: đánh dấu báo cáo sai sự thật để
   * cộng strike gian lận cho Customer. Thay cho luồng legacy `decide` đã gỡ.
   */
  @IsOptional()
  @IsBoolean()
  rejectAsFraud?: boolean;
}
