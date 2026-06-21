import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class VerifyItemInput {
  @IsUUID('4')
  itemId!: string;

  @IsInt()
  @Min(0)
  verifiedAmount!: number;
}

export class VerifyItemsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => VerifyItemInput)
  items!: VerifyItemInput[];
}
