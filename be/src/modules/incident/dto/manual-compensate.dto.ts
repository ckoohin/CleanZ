import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

/** P0.4 — Chi trả thủ công (chuyển khoản ngoài) khi quỹ SYSTEM không đủ. */
export class ManualCompensateDto {
  /** Ảnh minh chứng chuyển khoản (đã upload qua endpoint transfer-proof). */
  @IsUUID('4')
  proofEvidenceId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
