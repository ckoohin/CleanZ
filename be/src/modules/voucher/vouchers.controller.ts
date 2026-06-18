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
  NotFoundException,
  BadRequestException,
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
import { toNumber } from 'src/common/helpers/number.helper';
import { VoucherType } from 'src/common/enums/voucher-type.enum';
import { VoucherEntity } from './entity/voucher.entity';
import { EntityManager } from 'typeorm';

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

  getById(
    manager: EntityManager,
    voucherId: string,
  ): Promise<VoucherEntity | null> {
    return manager.getRepository(VoucherEntity).findOne({
      where: { id: voucherId },
    });
  }

  async findValidForBooking(
    manager: EntityManager,
    voucherCode: string,
    serviceId: string,
    subtotal: number,
  ): Promise<VoucherEntity> {
    const now = new Date();
    const voucher = await manager
      .getRepository(VoucherEntity)
      .createQueryBuilder('voucher')
      .leftJoinAndSelect('voucher.service', 'service')
      .where('UPPER(voucher.code) = :code', {
        code: voucherCode.trim().toUpperCase(),
      })
      .andWhere('voucher.is_active = true')
      .getOne();

    if (!voucher) {
      throw new NotFoundException(
        'Voucher không tồn tại hoặc đã ngừng hoạt động',
      );
    }

    if (voucher.startDate && voucher.startDate > now) {
      throw new BadRequestException('Voucher chưa đến thời gian sử dụng');
    }

    if (voucher.endDate && voucher.endDate < now) {
      throw new BadRequestException('Voucher đã hết hạn');
    }

    if (
      voucher.usageLimit !== null &&
      voucher.usageLimit !== undefined &&
      voucher.usedCount >= voucher.usageLimit
    ) {
      throw new BadRequestException('Voucher đã hết lượt sử dụng');
    }

    if (voucher.service && voucher.service.id !== serviceId) {
      throw new BadRequestException('Voucher không áp dụng cho dịch vụ này');
    }

    if (subtotal < toNumber(voucher.minOrderAmount)) {
      throw new BadRequestException(
        'Đơn hàng chưa đạt giá trị tối thiểu của voucher',
      );
    }

    return voucher;
  }

  calculateDiscount(voucher: VoucherEntity, subtotal: number): number {
    if (voucher.type === VoucherType.FIXED) {
      return Math.min(toNumber(voucher.value), subtotal);
    }

    const discount = (subtotal * toNumber(voucher.value)) / 100;
    const maxDiscount = toNumber(voucher.maxDiscount);

    return Math.min(
      maxDiscount > 0 ? Math.min(discount, maxDiscount) : discount,
      subtotal,
    );
  }
}
