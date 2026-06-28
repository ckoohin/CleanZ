import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { CoverageAreasService } from './services/coverage-areas.service';
import { Auth } from '../auth/decorators/auth.decorator';
import { UserRole } from 'src/common/enums/user-role.enum';
import { successResponse } from 'src/common/helpers/response.helper';

@ApiTags('Admin — Coverage Areas')
@ApiBearerAuth()
@Controller('admin/coverage-areas')
export class CoverageAreasController {
  constructor(private readonly coverageAreasService: CoverageAreasService) {}

  @Get()
  @Auth(UserRole.ADMIN, UserRole.CUSTOMER, UserRole.TASKER)
  @ApiOperation({ summary: 'Lấy danh sách khu vực phục vụ (quận/huyện)' })
  @ApiQuery({ name: 'city', required: false, example: 'Hà Nội' })
  async findAll(@Query('city') city?: string) {
    const data = await this.coverageAreasService.findAll(city);
    return successResponse(data);
  }

  @Post('seed')
  @Auth(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Seed 30 quận/huyện Hà Nội vào DB (chỉ chạy 1 lần)',
  })
  async seedHanoi() {
    const result = await this.coverageAreasService.seedHanoiDistricts();
    return successResponse(result, `Đã seed ${result.seeded} quận/huyện`);
  }

  @Patch(':id')
  @Auth(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cập nhật phí vận chuyển của khu vực' })
  async update(
    @Param('id') id: string,
    @Body('transportFee') transportFee: number,
  ) {
    const data = await this.coverageAreasService.update(id, transportFee);
    return successResponse(data, 'Cập nhật phí vận chuyển thành công');
  }
}
