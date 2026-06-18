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
  ApiCreatedResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { UserRole } from '../../common/enums/user-role.enum';
import {
  successResponse,
  paginatedResponse,
} from '../../common/helpers/response.helper';
import { Auth } from '../auth/decorators/auth.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreatePricingConfigDto } from './dto/create-pricing.dto';
import { UpdatePricingConfigDto } from './dto/update-pricing.dto';
import { CreatePeakDayConfigDto } from './dto/create-peak-day.dto';
import { UpdatePeakDayConfigDto } from './dto/update-peak-day.dto';
import { PricingListQueryDto } from './dto/list-query-pricing.dto';
import { PricingService } from './services/pricing.service';

@ApiTags('Admin – Pricing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Auth(UserRole.ADMIN)
@Controller('admin/pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Post('configs')
  @ApiOperation({
    summary: 'Create pricing config (service × province × duration)',
  })
  @ApiCreatedResponse()
  async createConfig(@Body() dto: CreatePricingConfigDto) {
    const data = await this.pricingService.createPricingConfig(dto);
    return successResponse(data, 'Pricing config created');
  }

  @Get('configs')
  @ApiOperation({ summary: 'List pricing configs' })
  async findAllConfigs(@Query() query: PricingListQueryDto) {
    const result = await this.pricingService.findAllPricingConfigs(query);
    return paginatedResponse(
      result.items,
      result.total,
      result.page,
      result.limit,
    );
  }

  @Get('configs/:id')
  @ApiOperation({ summary: 'Get pricing config by ID' })
  async findOneConfig(@Param('id', ParseUUIDPipe) id: string) {
    return successResponse(await this.pricingService.findOnePricingConfig(id));
  }

  @Patch('configs/:id')
  @ApiOperation({ summary: 'Update pricing config' })
  async updateConfig(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePricingConfigDto,
  ) {
    return successResponse(
      await this.pricingService.updatePricingConfig(id, dto),
      'Pricing config updated',
    );
  }

  @Delete('configs/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete pricing config' })
  async removeConfig(@Param('id', ParseUUIDPipe) id: string) {
    await this.pricingService.removePricingConfig(id);
  }

  @Post('peak-days')
  @ApiOperation({ summary: 'Create peak day config' })
  @ApiCreatedResponse()
  async createPeakDay(@Body() dto: CreatePeakDayConfigDto) {
    const data = await this.pricingService.createPeakDayConfig(dto);
    return successResponse(data, 'Peak day config created');
  }

  @Get('peak-days')
  @ApiOperation({ summary: 'List all peak day configs' })
  @ApiQuery({ name: 'onlyActive', required: false, type: Boolean })
  async findAllPeakDays(@Query('onlyActive') onlyActive?: string) {
    const data = await this.pricingService.findAllPeakDayConfigs(
      onlyActive === 'true',
    );
    return successResponse(data);
  }

  @Get('peak-days/:id')
  @ApiOperation({ summary: 'Get peak day config by ID' })
  async findOnePeakDay(@Param('id', ParseUUIDPipe) id: string) {
    return successResponse(await this.pricingService.findOnePeakDayConfig(id));
  }

  @Patch('peak-days/:id')
  @ApiOperation({ summary: 'Update peak day config' })
  async updatePeakDay(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePeakDayConfigDto,
  ) {
    return successResponse(
      await this.pricingService.updatePeakDayConfig(id, dto),
      'Peak day config updated',
    );
  }

  @Delete('peak-days/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete peak day config' })
  async removePeakDay(@Param('id', ParseUUIDPipe) id: string) {
    await this.pricingService.removePeakDayConfig(id);
  }
}
