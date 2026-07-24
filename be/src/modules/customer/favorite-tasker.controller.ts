import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from 'src/common/enums/user-role.enum';
import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AddFavoriteTaskerDto } from './dto/add-favorite-tasker.dto';
import { FavoriteTaskerAvailabilityQueryDto } from './dto/favorite-tasker-availability-query.dto';
import { FavoriteTaskerService } from './services/favorite-tasker.service';

@Controller('customer/favorite-taskers')
@ApiTags('Customer - Thợ yêu thích')
@ApiBearerAuth('access-token')
@Auth(UserRole.CUSTOMER)
export class FavoriteTaskerController {
  constructor(private readonly favoriteTaskerService: FavoriteTaskerService) {}

  @Get()
  @ApiOperation({
    summary: 'Danh sách thợ yêu thích của khách',
    description:
      'Kèm cờ isPremiumEligible để FE biết thợ nào có thể được chỉ định cho đơn Cao cấp.',
  })
  @ApiOkResponse({ description: 'Lấy danh sách thành công' })
  list(@CurrentUser('id') userId: string) {
    return this.favoriteTaskerService.list(userId);
  }

  @Get('availability')
  @ApiOperation({
    summary: 'Kiểm tra lịch các Tasker yêu thích',
    description:
      'Chỉ trả trạng thái rảnh, trùng lịch hoặc sát ca trong 60 phút. Không trả thông tin khách hay địa chỉ của booking khác.',
  })
  @ApiOkResponse({ description: 'Kiểm tra lịch thành công' })
  listAvailability(
    @CurrentUser('id') userId: string,
    @Query() query: FavoriteTaskerAvailabilityQueryDto,
  ) {
    return this.favoriteTaskerService.listAvailability(userId, query);
  }

  @Get(':taskerId/contact')
  @ApiOperation({
    summary: 'Lấy liên hệ của một Tasker đã yêu thích',
    description:
      'Chỉ khách sở hữu danh sách yêu thích mới lấy được số điện thoại của Tasker đã chọn.',
  })
  @ApiParam({ name: 'taskerId', description: 'ID của Tasker đã chọn' })
  @ApiOkResponse({ description: 'Lấy thông tin liên hệ thành công' })
  getContact(
    @CurrentUser('id') userId: string,
    @Param('taskerId', ParseUUIDPipe) taskerId: string,
  ) {
    return this.favoriteTaskerService.getContact(userId, taskerId);
  }

  @Post(':taskerId')
  @ApiOperation({
    summary: 'Thêm thợ vào danh sách yêu thích',
    description:
      'Chỉ thêm được thợ đã từng hoàn thành ít nhất một đơn cho chính khách này.',
  })
  @ApiParam({ name: 'taskerId', description: 'ID của tasker' })
  @ApiOkResponse({ description: 'Đã thêm vào danh sách yêu thích' })
  add(
    @CurrentUser('id') userId: string,
    @Param('taskerId', ParseUUIDPipe) taskerId: string,
    @Body() dto: AddFavoriteTaskerDto,
  ) {
    return this.favoriteTaskerService.add(userId, taskerId, dto.note);
  }

  @Delete(':taskerId')
  @ApiOperation({ summary: 'Bỏ thợ khỏi danh sách yêu thích' })
  @ApiParam({ name: 'taskerId', description: 'ID của tasker' })
  @ApiOkResponse({ description: 'Đã xóa khỏi danh sách yêu thích' })
  remove(
    @CurrentUser('id') userId: string,
    @Param('taskerId', ParseUUIDPipe) taskerId: string,
  ) {
    return this.favoriteTaskerService.remove(userId, taskerId);
  }
}
