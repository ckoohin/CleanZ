import { PartialType, OmitType } from '@nestjs/swagger';
import { CreatePricingTierDto } from './create-pricing-tier.dto';

export class UpdatePricingTierDto extends PartialType(
  OmitType(CreatePricingTierDto, ['packageId'] as const),
) {}
