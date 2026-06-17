import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from 'src/common/enums/user-role.enum';
import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { NotificationService } from './notification.service';
import { QueryNotificationDto } from './dto/query-notification.dto';

@Controller('notifications')
@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@Auth(UserRole.CUSTOMER, UserRole.TASKER, UserRole.ADMIN)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách thông báo của tôi (phân trang, lọc)' })
  @ApiOkResponse({ description: 'Danh sách dạng { data, meta }' })
  list(
    @CurrentUser('id') userId: string,
    @Query() query: QueryNotificationDto,
  ) {
    return this.notificationService.list(userId, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Số thông báo chưa đọc (badge)' })
  @ApiOkResponse({ description: '{ count: number }' })
  unreadCount(@CurrentUser('id') userId: string) {
    return this.notificationService.unreadCount(userId);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Đánh dấu tất cả thông báo đã đọc' })
  @ApiOkResponse({ description: '{ updated: number }' })
  markAllRead(@CurrentUser('id') userId: string) {
    return this.notificationService.markAllRead(userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Đánh dấu một thông báo đã đọc' })
  @ApiOkResponse({ description: 'Thông báo đã cập nhật' })
  markRead(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notificationService.markRead(userId, id);
  }
}
