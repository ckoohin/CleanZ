import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseUUIDPipe,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { AdminOnly } from '../auth/decorators/admin-only.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@Controller('users')
@Auth()
@AdminOnly()
@ApiTags('Users')
@ApiBearerAuth('access-token')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo người dùng mới (Admin)' })
  @ApiBody({ type: CreateUserDto })
  @ApiCreatedResponse({ description: 'Tạo người dùng thành công' })
  @ApiBadRequestResponse({ description: 'Dữ liệu không hợp lệ' })
  @ApiUnauthorizedResponse({ description: 'Không có quyền truy cập' })
  create(@Body() createUserDto: CreateUserDto) {
    // Admin tạo tài khoản bằng mật khẩu do admin đặt → buộc user đổi ở lần đầu.
    return this.usersService.create(createUserDto, {
      mustChangePassword: true,
    });
  }

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách người dùng với filter + pagination (Admin)',
  })
  @ApiQuery({ name: 'keyword', required: false })
  @ApiQuery({
    name: 'role',
    required: false,
    enum: ['ADMIN', 'CUSTOMER', 'TASKER'],
  })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'isVerified', required: false, type: Boolean })
  @ApiQuery({
    name: 'provider',
    required: false,
    enum: ['LOCAL', 'GOOGLE', 'FACEBOOK'],
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({ description: 'Lấy danh sách người dùng thành công' })
  @ApiUnauthorizedResponse({ description: 'Không có quyền truy cập' })
  findAll(@Query() query: QueryUsersDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Lấy chi tiết người dùng kèm profile liên kết (Admin)',
  })
  @ApiParam({ name: 'id', example: 'b3de58e7-4ce2-4e5e-b5f5-c99f595f4e56' })
  @ApiOkResponse({ description: 'Lấy thông tin người dùng thành công' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy user' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOneWithProfile(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật người dùng theo ID (Admin)' })
  @ApiParam({ name: 'id', example: 'b3de58e7-4ce2-4e5e-b5f5-c99f595f4e56' })
  @ApiBody({ type: UpdateUserDto })
  @ApiOkResponse({ description: 'Cập nhật người dùng thành công' })
  @ApiBadRequestResponse({ description: 'Payload hoặc ID không hợp lệ' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Activate / Deactivate người dùng (Admin)' })
  @ApiParam({ name: 'id', example: 'b3de58e7-4ce2-4e5e-b5f5-c99f595f4e56' })
  @ApiBody({ type: UpdateUserStatusDto })
  @ApiOkResponse({ description: 'Cập nhật trạng thái thành công' })
  @ApiForbiddenResponse({ description: 'Không thể tự deactivate chính mình' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy user' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser('id') currentUserId: string,
  ) {
    return this.usersService.toggleUserActiveStatus(
      id,
      dto.isActive,
      currentUserId,
    );
  }

  @Post(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gửi email reset mật khẩu cho người dùng (Admin)' })
  @ApiParam({ name: 'id', example: 'b3de58e7-4ce2-4e5e-b5f5-c99f595f4e56' })
  @ApiOkResponse({ description: 'Email reset mật khẩu đã được gửi' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy user' })
  resetPassword(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.sendPasswordResetEmail(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete người dùng theo ID (Admin)' })
  @ApiParam({ name: 'id', example: 'b3de58e7-4ce2-4e5e-b5f5-c99f595f4e56' })
  @ApiOkResponse({ description: 'Xóa người dùng thành công (soft delete)' })
  @ApiForbiddenResponse({ description: 'Không thể tự xóa tài khoản của mình' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy user' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') currentUserId: string,
  ) {
    return this.usersService.softRemove(id, currentUserId);
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Khôi phục người dùng đã bị soft-delete (Admin)' })
  @ApiParam({ name: 'id', example: 'b3de58e7-4ce2-4e5e-b5f5-c99f595f4e56' })
  @ApiOkResponse({ description: 'Khôi phục người dùng thành công' })
  @ApiBadRequestResponse({ description: 'User chưa bị xóa' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy user' })
  restore(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.restore(id);
  }
}
