import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { AdminOnly } from '../auth/decorators/admin-only.decorator';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
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
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách người dùng (Admin)' })
  @ApiOkResponse({ description: 'Lấy danh sách người dùng thành công' })
  @ApiUnauthorizedResponse({ description: 'Không có quyền truy cập' })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết người dùng theo ID (Admin)' })
  @ApiParam({ name: 'id', example: 'b3de58e7-4ce2-4e5e-b5f5-c99f595f4e56' })
  @ApiOkResponse({ description: 'Lấy thông tin người dùng thành công' })
  @ApiBadRequestResponse({ description: 'ID không hợp lệ' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật người dùng theo ID (Admin)' })
  @ApiParam({ name: 'id', example: 'b3de58e7-4ce2-4e5e-b5f5-c99f595f4e56' })
  @ApiBody({ type: UpdateUserDto })
  @ApiOkResponse({ description: 'Cập nhật người dùng thành công' })
  @ApiBadRequestResponse({ description: 'Payload hoặc ID không hợp lệ' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa người dùng theo ID (Admin)' })
  @ApiParam({ name: 'id', example: 'b3de58e7-4ce2-4e5e-b5f5-c99f595f4e56' })
  @ApiOkResponse({ description: 'Xóa người dùng thành công' })
  @ApiBadRequestResponse({ description: 'ID không hợp lệ' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
