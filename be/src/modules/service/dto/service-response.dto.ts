import { ApiProperty } from '@nestjs/swagger';

export class ServiceResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() description?: string | null;
  @ApiProperty() baseDurationHours!: number | null;
  @ApiProperty() isActive!: boolean;
  @ApiProperty() createdAt!: Date;
}
