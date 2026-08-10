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
import { AuditAction } from '../admin/audit/audit-action.decorator';
import { AuditActionCode } from '../admin/audit/audit-action-codes';
import { AuditSeverity } from 'src/common/enums/audit-severity.enum';

@Controller('admin/notifications')
@ApiTags('Notifications (Admin)')
@ApiBearerAuth('access-token')
@Auth(UserRole.ADMIN)
export class NotificationAdminController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Gửi hàng loạt RA NGOÀI hệ thống — không thu hồi được sau khi đã tới tay người
   * nhận. `segment` và số lượng `userIds` là dữ kiện quyết định phạm vi ảnh hưởng,
   * còn `enqueued` ở kết quả cho biết thực tế đã bắn đi bao nhiêu.
   */
  @AuditAction({
    code: AuditActionCode.NOTIFICATION_BROADCAST,
    severity: AuditSeverity.HIGH,
    targetType: 'NOTIFICATION_CAMPAIGN',
    affectedIdsField: 'userIds',
    extract: ({ body, result }) => ({
      segment: body.segment ?? null,
      explicitRecipients: Array.isArray(body.userIds) ? body.userIds.length : 0,
      type: body.type ?? null,
      title: body.title ?? null,
      campaignId: result?.campaignId ?? null,
      enqueued: result?.enqueued ?? null,
    }),
  })
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
