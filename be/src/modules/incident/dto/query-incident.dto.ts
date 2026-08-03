import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { IncidentStatus } from 'src/common/enums/incident-status.enum';
import { IC_INPUT_LIMITS } from '../incident.constants';

export class QueryIncidentDto extends PaginationDto {
  @IsOptional()
  @IsEnum(IncidentStatus)
  status?: IncidentStatus;

  /**
   * `PaginationDto` chỉ chặn cận dưới (`@Min(1)`), nên `?limit=999999` vét sạch bảng trong
   * MỘT request — và mỗi hàng còn kéo theo bằng chứng, giải trình, phản hồi khi dựng view.
   * Chặn ở đây thay vì sửa `PaginationDto` chung để không đổi hành vi các module khác đang
   * cố tình lấy trang lớn (`limit: 1000`).
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(IC_INPUT_LIMITS.PAGE_SIZE_MAX)
  declare limit?: number;
}
