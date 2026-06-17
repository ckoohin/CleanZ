import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { AppException } from 'src/common/exceptions/app.exception';
import { UserRole } from 'src/common/enums/user-role.enum';
import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpdateCustomerAddressDto } from './dto/update-customer-address.dto';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';
import { UpsertCustomerAddressDto } from './dto/upsert-customer-address.dto';
import { CustomerService } from './customer.service';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

@Controller('customer')
@ApiTags('Customer')
@ApiBearerAuth('access-token')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get('profile/me')
  @Auth(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Customer xem hồ sơ cá nhân' })
  @ApiOkResponse({ description: 'Lấy hồ sơ customer thành công' })
  @ApiUnauthorizedResponse({ description: 'Customer chưa đăng nhập' })
  getMyProfile(@CurrentUser('id') userId: string) {
    return this.customerService.getMyProfile(userId);
  }

  @Patch('profile/me')
  @Auth(UserRole.CUSTOMER)
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          return callback(
            new AppException(
              `Invalid file type. Only jpg, jpeg, png are allowed. Received: ${file.mimetype}`,
            ),
            false,
          );
        }

        callback(null, true);
      },
    }),
  )
  @ApiOperation({
    summary: 'Customer cập nhật hồ sơ cá nhân',
    description:
      'Customer cần có số điện thoại trước khi đặt booking. Avatar phải upload bằng multipart/form-data field avatar, không truyền link trực tiếp.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        fullName: {
          type: 'string',
          example: 'Nguyen Van A',
        },
        phone: {
          type: 'string',
          example: '0901234567',
        },
        avatar: {
          type: 'string',
          format: 'binary',
          description: 'Ảnh đại diện customer',
        },
      },
    },
  })
  @ApiOkResponse({ description: 'Cập nhật hồ sơ customer thành công' })
  @ApiUnauthorizedResponse({ description: 'Customer chưa đăng nhập' })
  updateMyProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateCustomerProfileDto,
    @UploadedFile() avatar?: Express.Multer.File,
  ) {
    return this.customerService.updateMyProfile(userId, dto, avatar);
  }

  @Get('addresses')
  @Auth(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Customer xem danh sách địa chỉ đã lưu' })
  @ApiOkResponse({ description: 'Lấy danh sách địa chỉ thành công' })
  @ApiUnauthorizedResponse({ description: 'Customer chưa đăng nhập' })
  findMyAddresses(@CurrentUser('id') userId: string) {
    return this.customerService.findMyAddresses(userId);
  }

  @Post('addresses')
  @Auth(UserRole.CUSTOMER)
  @ApiOperation({
    summary: 'Customer tạo địa chỉ',
    description:
      'Nếu là địa chỉ đầu tiên hoặc isDefault=true, hệ thống tự đặt làm địa chỉ mặc định.',
  })
  @ApiBody({ type: UpsertCustomerAddressDto })
  @ApiCreatedResponse({ description: 'Tạo địa chỉ customer thành công' })
  @ApiUnauthorizedResponse({ description: 'Customer chưa đăng nhập' })
  createMyAddress(
    @CurrentUser('id') userId: string,
    @Body() dto: UpsertCustomerAddressDto,
  ) {
    return this.customerService.createMyAddress(userId, dto);
  }

  @Patch('addresses/:id')
  @Auth(UserRole.CUSTOMER)
  @ApiOperation({
    summary: 'Customer cập nhật địa chỉ',
    description:
      'Nếu gửi isDefault=true, hệ thống tự bỏ mặc định ở các địa chỉ khác.',
  })
  @ApiParam({ name: 'id', example: '6d625675-7d12-458f-af83-2db2e8eb7db8' })
  @ApiBody({ type: UpdateCustomerAddressDto })
  @ApiOkResponse({ description: 'Cập nhật địa chỉ customer thành công' })
  @ApiUnauthorizedResponse({ description: 'Customer chưa đăng nhập' })
  updateMyAddress(
    @CurrentUser('id') userId: string,
    @Param('id') addressId: string,
    @Body() dto: UpdateCustomerAddressDto,
  ) {
    return this.customerService.updateMyAddress(userId, addressId, dto);
  }

  @Patch('addresses/:id/default')
  @Auth(UserRole.CUSTOMER)
  @ApiOperation({
    summary: 'Customer đặt địa chỉ mặc định',
    description:
      'Dùng khi FE bấm nút đặt mặc định. Hệ thống tự bỏ default ở các địa chỉ khác của customer.',
  })
  @ApiParam({ name: 'id', example: '6d625675-7d12-458f-af83-2db2e8eb7db8' })
  @ApiOkResponse({ description: 'Đặt địa chỉ mặc định thành công' })
  @ApiUnauthorizedResponse({ description: 'Customer chưa đăng nhập' })
  setMyDefaultAddress(
    @CurrentUser('id') userId: string,
    @Param('id') addressId: string,
  ) {
    return this.customerService.setMyDefaultAddress(userId, addressId);
  }
}
