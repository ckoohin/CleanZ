import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { GetServicesFilterDto } from './dto/get-service-filter.sto';
import { Auth } from '../auth/decorators/auth.decorator';
import { AdminOnly } from '../auth/decorators/admin-only.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/AuthRequest';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/jpg',
  'image/webp',
];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

@Controller('services')
@Auth()
@ApiTags('Services')
@ApiBearerAuth('access-token')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  @AdminOnly()
  @ApiOperation({ summary: 'Tạo dịch vụ mới (Admin)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Vệ sinh máy lạnh' },
        category: { type: 'string', example: 'Điện lạnh' },
        description: {
          type: 'string',
          example: 'Vệ sinh và bảo dưỡng máy lạnh tại nhà',
        },
        basePrice: { type: 'number', example: 250000 },
        duration: { type: 'number', example: 60 },
        isActive: { type: 'boolean', example: true },
        image: { type: 'string', format: 'binary' },
      },
      required: ['name', 'category', 'basePrice'],
    },
  })
  @ApiOkResponse({ description: 'Tạo dịch vụ thành công' })
  @ApiBadRequestResponse({
    description: 'Payload không hợp lệ hoặc file ảnh sai định dạng',
  })
  @ApiUnauthorizedResponse({ description: 'Không có quyền truy cập' })
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          return callback(
            new BadRequestException(
              'File không hợp lệ. Chỉ chấp nhận jpg, jpeg, png, webp.',
            ),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async create(
    @Body() createServiceDto: CreateServiceDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.servicesService.createService(
      createServiceDto,
      file,
      currentUser.id,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách dịch vụ có phân trang và lọc' })
  @ApiQuery({ name: 'keyword', required: false, example: 'máy lạnh' })
  @ApiQuery({ name: 'category', required: false, example: 'Điện lạnh' })
  @ApiQuery({ name: 'minPrice', required: false, example: 100000 })
  @ApiQuery({ name: 'maxPrice', required: false, example: 500000 })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiOkResponse({ description: 'Lấy danh sách dịch vụ thành công' })
  async findAll(@Query() filterDto: GetServicesFilterDto) {
    return this.servicesService.getAllServices(filterDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết dịch vụ theo ID' })
  @ApiParam({ name: 'id', example: 'c1d4d8aa-4cb0-4e97-b116-57d2ce0f7d14' })
  @ApiOkResponse({ description: 'Lấy thông tin dịch vụ thành công' })
  @ApiBadRequestResponse({ description: 'ID không hợp lệ' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.servicesService.getServiceById(id);
  }

  @Patch(':id')
  @AdminOnly()
  @ApiOperation({ summary: 'Cập nhật dịch vụ theo ID (Admin)' })
  @ApiParam({ name: 'id', example: 'c1d4d8aa-4cb0-4e97-b116-57d2ce0f7d14' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Vệ sinh máy lạnh inverter' },
        category: { type: 'string', example: 'Điện lạnh' },
        description: {
          type: 'string',
          example: 'Cập nhật mô tả dịch vụ',
        },
        basePrice: { type: 'number', example: 300000 },
        duration: { type: 'number', example: 90 },
        isActive: { type: 'boolean', example: true },
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOkResponse({ description: 'Cập nhật dịch vụ thành công' })
  @ApiBadRequestResponse({ description: 'Payload hoặc ID không hợp lệ' })
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          return callback(
            new BadRequestException(
              'File không hợp lệ. Chỉ chấp nhận jpg, jpeg, png, webp.',
            ),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateServiceDto: UpdateServiceDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.servicesService.updateService(
      id,
      updateServiceDto,
      file,
      currentUser.id,
    );
  }

  @Delete(':id')
  @AdminOnly()
  @ApiOperation({ summary: 'Xóa dịch vụ theo ID (Admin)' })
  @ApiParam({ name: 'id', example: 'c1d4d8aa-4cb0-4e97-b116-57d2ce0f7d14' })
  @ApiOkResponse({ description: 'Xóa dịch vụ thành công' })
  @ApiBadRequestResponse({ description: 'ID không hợp lệ' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.servicesService.removeService(id, currentUser.id);
  }
}
