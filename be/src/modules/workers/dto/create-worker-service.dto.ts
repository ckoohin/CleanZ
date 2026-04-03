import {
  IsUUID,
  IsNotEmpty,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';
import { ServiceLocationType } from 'src/common/enums/service-location-type.enum';

export class CreateWorkerServiceDto {
  @IsUUID('4', { message: 'ID dịch vụ phải là UUID hợp lệ' })
  @IsNotEmpty({ message: 'ID dịch vụ không được để trống' })
  serviceId: string;

  @IsArray({ message: 'Loại địa điểm phải là mảng' })
  @IsEnum(ServiceLocationType, {
    each: true,
    message: 'Loại địa điểm không hợp lệ (home / at_shop)',
  })
  @IsNotEmpty({ message: 'Loại địa điểm không được để trống' })
  locationTypes: ServiceLocationType[];

  @IsNumber({}, { message: 'Giá riêng phải là số' })
  @Min(0, { message: 'Giá không được âm' })
  @IsOptional()
  customPrice?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @ValidateIf((o: CreateWorkerServiceDto) => {
    return (
      Array.isArray(o.locationTypes) &&
      o.locationTypes.includes(ServiceLocationType.AT_SHOP)
    );
  })
  @IsString({ message: 'Địa chỉ quán phải là chuỗi' })
  @IsNotEmpty({ message: 'Địa chỉ quán bắt buộc khi dịch vụ tại quán' })
  shopAddress?: string;
}
