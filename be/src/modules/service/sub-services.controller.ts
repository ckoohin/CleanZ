import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
} from '@nestjs/swagger';
import { SubServicesService } from './services/sub-services.service';
import { UserRole } from '../../common/enums/user-role.enum';
import {
  successResponse,
  paginatedResponse,
} from '../../common/helpers/response.helper';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SubServiceListQueryDto } from './dto/list-query-sub-service.dto';
import { CreateSubServiceDto } from './dto/create-sub-service.dto';
import { UpdateSubServiceDto } from './dto/update-sub-service.dto';
import { Auth } from '../auth/decorators/auth.decorator';

@ApiTags('Admin – Sub Services')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/sub-services')
export class SubServicesController {
  constructor(private readonly subServicesService: SubServicesService) {}

  @Post()
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new sub-service' })
  @ApiCreatedResponse({ description: 'Sub-service created' })
  async create(@Body() dto: CreateSubServiceDto) {
    const data = await this.subServicesService.create(dto);
    return successResponse(data, 'Sub-service created successfully');
  }

  @Get()
  @Auth(UserRole.ADMIN, UserRole.CUSTOMER, UserRole.TASKER)
  @ApiOperation({
    summary: 'List all sub-services with pagination & filtering',
  })
  @ApiOkResponse({ description: 'Paginated sub-service list' })
  async findAll(@Query() query: SubServiceListQueryDto) {
    const result = await this.subServicesService.findAll(query);
    return paginatedResponse(
      result.items,
      result.total,
      result.page,
      result.limit,
    );
  }

  @Get(':id')
  @Auth(UserRole.ADMIN, UserRole.CUSTOMER, UserRole.TASKER)
  @ApiOperation({ summary: 'Get sub-service by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.subServicesService.findOne(id);
    return successResponse(data);
  }

  @Patch(':id')
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a sub-service' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSubServiceDto,
  ) {
    const data = await this.subServicesService.update(id, dto);
    return successResponse(data, 'Sub-service updated successfully');
  }

  @Delete(':id')
  @Auth(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a sub-service' })
  @ApiNoContentResponse({ description: 'Sub-service deleted' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.subServicesService.remove(id);
  }

  @Get(':id/bookings')
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get paginated bookings for a sub-service' })
  @ApiOkResponse({ description: 'Paginated bookings list' })
  async getServiceBookings(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const result = await this.subServicesService.getServiceBookings(
      id,
      +page,
      +limit,
    );
    return paginatedResponse(
      result.items,
      result.total,
      result.page,
      result.limit,
    );
  }

  @Get(':id/taskers')
  @Auth(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get paginated taskers for a sub-service' })
  @ApiOkResponse({ description: 'Paginated taskers list' })
  async getServiceTaskers(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const result = await this.subServicesService.getServiceTaskers(
      id,
      +page,
      +limit,
    );
    return paginatedResponse(
      result.items,
      result.total,
      result.page,
      result.limit,
    );
  }
}
