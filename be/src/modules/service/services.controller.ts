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
import { ServicesService } from './services/services.service';

import { UserRole } from '../../common/enums/user-role.enum';
import {
  successResponse,
  paginatedResponse,
} from '../../common/helpers/response.helper';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ServiceListQueryDto } from './dto/list-query-service.dto';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { Auth } from '../auth/decorators/auth.decorator';

@ApiTags('Admin – Services')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Auth(UserRole.ADMIN)
@Controller('admin/services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new service' })
  @ApiCreatedResponse({ description: 'Service created' })
  async create(@Body() dto: CreateServiceDto) {
    const data = await this.servicesService.create(dto);
    return successResponse(data, 'Service created successfully');
  }

  @Get()
  @ApiOperation({ summary: 'List all services with pagination & filtering' })
  @ApiOkResponse({ description: 'Paginated service list' })
  async findAll(@Query() query: ServiceListQueryDto) {
    const result = await this.servicesService.findAll(query);
    return paginatedResponse(
      result.items,
      result.total,
      result.page,
      result.limit,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get service by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.servicesService.findOne(id);
    return successResponse(data);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a service' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceDto,
  ) {
    const data = await this.servicesService.update(id, dto);
    return successResponse(data, 'Service updated successfully');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a service' })
  @ApiNoContentResponse({ description: 'Service deleted' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.servicesService.remove(id);
  }

  @Get(':id/bookings')
  @ApiOperation({ summary: 'Get paginated bookings for a service' })
  @ApiOkResponse({ description: 'Paginated bookings list' })
  async getServiceBookings(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const result = await this.servicesService.getServiceBookings(
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
  @ApiOperation({ summary: 'Get paginated taskers for a service' })
  @ApiOkResponse({ description: 'Paginated taskers list' })
  async getServiceTaskers(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const result = await this.servicesService.getServiceTaskers(
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
