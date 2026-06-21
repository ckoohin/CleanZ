import { IsInt, IsObject, IsOptional, Max, Min } from 'class-validator';

export class UpdateTicketConfigDto {
  @IsOptional()
  @IsObject()
  slaMatrix?: Record<string, { responseMins: number; resolutionMins: number }>;

  @IsOptional()
  @IsObject()
  categoryPriority?: Record<string, string>;

  @IsOptional()
  @IsInt()
  @Min(1)
  autoCloseHours?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  complaintWindowDays?: number;
}
