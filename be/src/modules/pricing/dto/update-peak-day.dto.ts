import { PartialType } from '@nestjs/swagger';
import { CreatePeakDayConfigDto } from './create-peak-day.dto';

export class UpdatePeakDayConfigDto extends PartialType(
  CreatePeakDayConfigDto,
) {}
