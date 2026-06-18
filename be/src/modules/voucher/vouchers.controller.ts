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
} from '@nestjs/swagger';
import { VouchersService } from './services/vouchers.service';
import { UserRole } from '../../common/enums/user-role.enum';
import {
  successResponse,
  paginatedResponse,
} from '../../common/helpers/response.helper';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Auth } from '../auth/decorators/auth.decorator';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { VoucherListQueryDto } from './dto/list-query-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { IssueVoucherToCustomersDto } from './dto/issue-voucher-to-customer.dto';

@ApiTags('Admin – Vouchers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Auth(UserRole.ADMIN)
@Controller('admin/vouchers')
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a voucher' })
  @ApiCreatedResponse()
  async create(@Body() dto: CreateVoucherDto) {
    return successResponse(
      await this.vouchersService.create(dto),
      'Voucher created',
    );
  }

  @Get()
  @ApiOperation({ summary: 'List vouchers with search & filtering' })
  async findAll(@Query() query: VoucherListQueryDto) {
    const result = await this.vouchersService.findAll(query);
    return paginatedResponse(
      result.items,
      result.total,
      result.page,
      result.limit,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get voucher by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return successResponse(await this.vouchersService.findOne(id));
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get voucher usage statistics' })
  async getStats(@Param('id', ParseUUIDPipe) id: string) {
    return successResponse(await this.vouchersService.getVoucherStats(id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a voucher' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVoucherDto,
  ) {
    return successResponse(
      await this.vouchersService.update(id, dto),
      'Voucher updated',
    );
  }

  @Post(':id/issue')
  @ApiOperation({ summary: 'Issue voucher to a list of customers' })
  async issueToCustomers(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: IssueVoucherToCustomersDto,
  ) {
    const result = await this.vouchersService.issueToCustomers(id, dto);
    return successResponse(
      result,
      `Issued to ${result.issued} customers, skipped ${result.skipped}`,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a voucher' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.vouchersService.remove(id);
  }
}
