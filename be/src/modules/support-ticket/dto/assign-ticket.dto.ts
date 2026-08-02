import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class AssignTicketDto {
  @IsOptional()
  @IsUUID('4')
  assignedAdminId?: string;
}

/** Gán hàng loạt từ hàng đợi (chọn nhiều dòng rồi "Nhận xử lý"). */
export class BulkAssignTicketDto extends AssignTicketDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  ticketIds!: string[];
}
