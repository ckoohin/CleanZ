import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from 'src/common/enums/user-role.enum';
import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TicketAdminService } from './services/ticket-admin.service';
import { AdminQueryTicketDto } from './dto/admin-query-ticket.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { ReclassifyTicketDto } from './dto/reclassify-ticket.dto';
import { CreateTicketAdminDto } from './dto/create-ticket-admin.dto';
import { CreateAdminMessageDto } from './dto/create-message.dto';
import { CreateResolutionDto } from './dto/create-resolution.dto';
import { TicketResolutionService } from './services/ticket-resolution.service';
import { UpdateTicketConfigDto } from './dto/update-config.dto';
import { TicketConfigService } from './services/ticket-config.service';

@Controller('admin/support-tickets')
@ApiTags('Support Tickets (Admin)')
@ApiBearerAuth('access-token')
@Auth(UserRole.ADMIN)
export class TicketAdminController {
  constructor(
    private readonly adminService: TicketAdminService,
    private readonly resolutionService: TicketResolutionService,
    private readonly configService: TicketConfigService,
  ) {}

  @Get('config')
  @ApiOperation({
    summary: 'Đọc cấu hình ticket (SLA/category/auto-close/window)',
  })
  getConfig() {
    return this.configService.getEffectiveConfig();
  }

  @Put('config')
  @ApiOperation({ summary: 'Cập nhật cấu hình ticket (config dịch vụ)' })
  async updateConfig(@Body() dto: UpdateTicketConfigDto) {
    await this.configService.updateConfig(dto);
    return this.configService.getEffectiveConfig();
  }

  @Post()
  @ApiOperation({ summary: 'Tạo ticket hộ (hotline)' })
  create(
    @CurrentUser('id') adminId: string,
    @Body() dto: CreateTicketAdminDto,
  ) {
    return this.adminService.createOnBehalf(dto, adminId);
  }

  @Get()
  @ApiOperation({ summary: 'Hàng đợi ticket (filter/sort/phân trang)' })
  list(@Query() query: AdminQueryTicketDto) {
    return this.adminService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết ticket đầy đủ (gồm internal note)' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.findOne(id);
  }

  @Patch(':id/assign')
  @ApiOperation({ summary: 'Gán/đổi admin xử lý' })
  assign(
    @CurrentUser('id') adminId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignTicketDto,
  ) {
    return this.adminService.assign(id, dto, adminId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Đổi trạng thái (state machine)' })
  changeStatus(
    @CurrentUser('id') adminId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeStatusDto,
  ) {
    return this.adminService.changeStatus(id, dto, adminId);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Gửi public reply / internal note (+tag)' })
  addMessage(
    @CurrentUser('id') adminId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateAdminMessageDto,
  ) {
    return this.adminService.addMessage(id, dto, adminId);
  }

  @Post(':id/resolutions')
  @ApiOperation({ summary: 'Ghi nhận kết luận xử lý (tiền: record-only)' })
  addResolution(
    @CurrentUser('id') adminId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateResolutionDto,
  ) {
    return this.resolutionService.create(id, dto, adminId);
  }

  @Patch(':id/category')
  @ApiOperation({ summary: 'Phân loại lại ticket (cho OTHER)' })
  reclassify(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReclassifyTicketDto,
  ) {
    return this.adminService.reclassify(id, dto);
  }
}
