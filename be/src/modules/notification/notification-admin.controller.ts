import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
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
import { NotificationService } from './notification.service';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto';
import { AdminQueryNotificationDto } from './dto/admin-query-notification.dto';

@Controller('admin/notifications')
@ApiTags('Notifications (Admin)')
@ApiBearerAuth('access-token')
@Auth(UserRole.ADMIN)
export class NotificationAdminController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('broadcast')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Broadcast thông báo theo segment/userIds (PROMOTION/SYSTEM)',
  })
  @ApiOkResponse({ description: '202 + { campaignId, enqueued, chunks }' })
  broadcast(@Body() dto: BroadcastNotificationDto) {
    return this.notificationService.broadcast(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Notification history (tra cứu, KHÔNG phải delivery audit)',
  })
  @ApiOkResponse({ description: '{ data, meta }' })
  history(@Query() query: AdminQueryNotificationDto) {
    return this.notificationService.adminHistory(query);
  }
}
