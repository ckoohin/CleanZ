import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from 'class-validator';

/** P1.4 — Khách bổ sung bằng chứng cho hạng mục bị yêu cầu (NEED_MORE_EVIDENCE). */
export class AttachItemEvidenceDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsUUID('4', { each: true })
  evidenceIds!: string[];
}
