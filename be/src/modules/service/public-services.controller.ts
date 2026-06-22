import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PublicServiceListQueryDto } from './dto/public-service-list-query.dto';
import { PublicServiceListResponseDto } from './dto/public-service-response.dto';
import { ServicesService } from './services/services.service';

@ApiTags('Services')
@Controller('services')
export class PublicServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  @ApiOperation({
    summary: 'Danh sách dịch vụ khả dụng để đặt booking',
    description:
      'Chỉ trả dịch vụ đang hoạt động và có cấu hình giá đang hoạt động.',
  })
  @ApiOkResponse({ type: PublicServiceListResponseDto })
  findAvailableServices(
    @Query() query: PublicServiceListQueryDto,
  ): Promise<PublicServiceListResponseDto> {
    return this.servicesService.findAvailableServices(query);
  }
}
