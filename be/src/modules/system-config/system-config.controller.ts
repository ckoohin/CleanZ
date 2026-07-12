import { Body, Controller, Get, Put } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { successResponse } from 'src/common/helpers/response.helper';
import { AdminOnly } from '../auth/decorators/admin-only.decorator';
import { UpdateSystemConfigDto } from './dto/update-system-config.dto';
import { SystemConfigService } from './system-config.service';
import { SYSTEM_CONFIG_GROUP_LABELS } from './system-config.registry';

@Controller('system-config')
@ApiTags('System Config')
@ApiBearerAuth('access-token')
export class SystemConfigController {
  constructor(
    private readonly systemConfigService: SystemConfigService,
    private readonly dataSource: DataSource,
  ) {}

  @Get()
  @AdminOnly()
  @ApiOperation({ summary: 'Admin xem cấu hình hệ thống đang hiệu lực' })
  @ApiOkResponse({ description: 'Lấy cấu hình hệ thống thành công' })
  async getConfigs() {
    const items = await this.systemConfigService.getAdminConfigs(
      this.dataSource.manager,
    );

    return successResponse(
      { items, groupLabels: SYSTEM_CONFIG_GROUP_LABELS },
      'Lấy cấu hình hệ thống thành công',
    );
  }

  @Put()
  @AdminOnly()
  @ApiOperation({ summary: 'Admin cập nhật cấu hình hệ thống' })
  @ApiOkResponse({ description: 'Cập nhật cấu hình hệ thống thành công' })
  async updateConfigs(@Body() dto: UpdateSystemConfigDto) {
    const items = await this.systemConfigService.updateAdminConfigs(
      this.dataSource.manager,
      dto.values,
    );

    return successResponse(
      { items, groupLabels: SYSTEM_CONFIG_GROUP_LABELS },
      'Cập nhật cấu hình hệ thống thành công',
    );
  }
}
