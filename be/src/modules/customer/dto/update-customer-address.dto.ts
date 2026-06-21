import { PartialType } from '@nestjs/swagger';
import { UpsertCustomerAddressDto } from './upsert-customer-address.dto';

export class UpdateCustomerAddressDto extends PartialType(
  UpsertCustomerAddressDto,
) {}
