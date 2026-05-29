import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';
import { ServiceLocationType } from 'src/common/enums/service-location-type.enum';

export class UpdateStaffServiceDto {
  @IsArray({ message: 'Loại địa điểm phải là mảng' })
  @IsEnum(ServiceLocationType, {
    each: true,
    message: 'Loại địa điểm không hợp lệ (home / at_shop)',
  })
  @IsOptional()
  locationTypes?: ServiceLocationType[];

  @IsNumber({}, { message: 'Giá riêng phải là số' })
  @Min(0, { message: 'Giá không được âm' })
  @IsOptional()
  customPrice?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @ValidateIf((o: UpdateStaffServiceDto) => {
    return (
      Array.isArray(o.locationTypes) &&
      o.locationTypes.includes(ServiceLocationType.AT_SHOP)
    );
  })
  @IsString({ message: 'Địa chỉ quán phải là chuỗi' })
  @IsOptional()
  shopAddress?: string;

  @IsOptional()
  isAvailable?: boolean;
}
