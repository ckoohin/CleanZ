import { IsBoolean, IsOptional, IsUUID } from 'class-validator';
import { CreateTicketDto } from './create-ticket.dto';

export class CreateTicketAdminDto extends CreateTicketDto {
  @IsUUID('4')
  reporterUserId!: string;

  @IsOptional()
  @IsBoolean()
  assignToSelf?: boolean;
}
