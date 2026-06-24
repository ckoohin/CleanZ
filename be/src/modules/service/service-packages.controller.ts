import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ServicePackagesService } from './services/service-packages.service';
import { CreateServicePackageDto } from './dto/create-service-package.dto';
import { UpdateServicePackageDto } from './dto/update-service-package.dto';
import { AddSubServicesToPackageDto } from './dto/add-sub-services-to-package.dto';
import { UserRole } from 'src/common/enums/user-role.enum';
import { Auth } from '../auth/decorators/auth.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { successResponse } from 'src/common/helpers/response.helper';

@ApiTags('Admin – Service Packages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/service-packages')
export class ServicePackagesController {
  constructor(
    private readonly servicePackagesService: ServicePackagesService,
  ) {}

  @Post()
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Tạo gói dịch vụ mới' })
  async create(@Body() dto: CreateServicePackageDto) {
    const data = await this.servicePackagesService.create(dto);
    return successResponse(data, 'Tạo gói dịch vụ thành công');
  }

  @Get()
  @Auth(UserRole.ADMIN, UserRole.CUSTOMER, UserRole.TASKER)
  @ApiOperation({ summary: 'Lấy tất cả gói dịch vụ' })
  async findAll() {
    const data = await this.servicePackagesService.findAll();
    return successResponse(data);
  }

  @Get(':id')
  @Auth(UserRole.ADMIN, UserRole.CUSTOMER, UserRole.TASKER)
  @ApiOperation({ summary: 'Lấy chi tiết gói dịch vụ' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.servicePackagesService.findOne(id);
    return successResponse(data);
  }

  @Patch(':id')
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Cập nhật gói dịch vụ' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServicePackageDto,
  ) {
    const data = await this.servicePackagesService.update(id, dto);
    return successResponse(data, 'Cập nhật gói dịch vụ thành công');
  }

  @Delete(':id')
  @Auth(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa gói dịch vụ' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.servicePackagesService.remove(id);
  }

  @Get(':id/analytics')
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Lấy dữ liệu thống kê của gói dịch vụ' })
  async getAnalytics(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.servicePackagesService.getAnalytics(id);
    return successResponse(data);
  }

  @Post(':id/sub-services')
  @Auth(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Thêm hoặc cập nhật danh sách dịch vụ con trong gói' })
  async addSubServices(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddSubServicesToPackageDto,
  ) {
    await this.servicePackagesService.addSubServices(id, dto);
    return successResponse(null, 'Liên kết dịch vụ con thành công');
  }

  @Delete(':id/sub-services/:subServiceId')
  @Auth(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Gỡ dịch vụ con khỏi gói' })
  async removeSubService(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('subServiceId', ParseUUIDPipe) subServiceId: string,
  ) {
    await this.servicePackagesService.removeSubService(id, subServiceId);
  }
}
