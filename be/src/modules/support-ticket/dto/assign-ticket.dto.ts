import { IsOptional, IsUUID } from 'class-validator';

export class AssignTicketDto {
  @IsOptional()
  @IsUUID('4')
  assignedAdminId?: string;
}
