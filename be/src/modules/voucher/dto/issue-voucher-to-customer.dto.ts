import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class IssueVoucherToCustomersDto {
  @ApiProperty({
    description: 'List of customer UUIDs to issue voucher to',
    type: [String],
  })
  @IsUUID('4', { each: true })
  customerIds!: string[];
}
