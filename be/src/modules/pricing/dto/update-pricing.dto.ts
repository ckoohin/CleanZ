import { PartialType } from '@nestjs/swagger';
import { CreatePricingConfigDto } from './create-pricing.dto';

export class UpdatePricingConfigDto extends PartialType(
  CreatePricingConfigDto,
) {}
