import { Body, Controller, Get, Put } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { successResponse } from 'src/common/helpers/response.helper';
import { AdminOnly } from '../auth/decorators/admin-only.decorator';
import { UpdateSystemConfigDto } from './dto/update-system-config.dto';
import {
  UpdateCheckinOperationPolicyDto,
  UpdateCustomerSchedulingPolicyDto,
  UpdateTaskerCancellationPolicyDto,
} from './dto/update-operational-policy.dto';
import { SystemConfigService } from './system-config.service';
import { SYSTEM_CONFIG_GROUP_LABELS } from './system-config.registry';
import { AuditAction } from '../admin/audit/audit-action.decorator';
import { AuditActionCode } from '../admin/audit/audit-action-codes';
import { AuditSeverity } from 'src/common/enums/audit-severity.enum';

@Controller('system-config')
@ApiTags('System Config')
@ApiBearerAuth('access-token')
export class SystemConfigController {
  constructor(
    private readonly systemConfigService: SystemConfigService,
    private readonly dataSource: DataSource,
  ) {}

  @Get('operations')
  @AdminOnly()
  @ApiOperation({ summary: 'Admin xem các policy vận hành đang hiệu lực' })
  async getOperationalPolicies() {
    const policies = await this.systemConfigService.getOperationalPolicies(
      this.dataSource.manager,
    );
    return successResponse(policies, 'Lấy policy vận hành thành công');
  }

  @AuditAction({
    code: AuditActionCode.TASKER_CANCELLATION_POLICY_UPDATE,
    severity: AuditSeverity.CRITICAL,
    targetType: 'SYSTEM_CONFIG',
  })
  @Put('operations/tasker-cancellation')
  @AdminOnly()
  @ApiOperation({ summary: 'Admin cập nhật phí hủy theo thời gian của Tasker' })
  async updateTaskerCancellationPolicy(
    @Body() dto: UpdateTaskerCancellationPolicyDto,
  ) {
    const policy = await this.dataSource.transaction((manager) =>
      this.systemConfigService.updateTaskerCancellationPolicy(
        manager,
        dto.rules,
      ),
    );
    return successResponse(policy, 'Đã cập nhật phí hủy Tasker');
  }

  @AuditAction({
    code: AuditActionCode.CHECKIN_POLICY_UPDATE,
    severity: AuditSeverity.CRITICAL,
    targetType: 'SYSTEM_CONFIG',
  })
  @Put('operations/checkin')
  @AdminOnly()
  @ApiOperation({ summary: 'Admin cập nhật cửa sổ và bán kính check-in' })
  async updateCheckinOperationPolicy(
    @Body() dto: UpdateCheckinOperationPolicyDto,
  ) {
    const policy = await this.dataSource.transaction((manager) =>
      this.systemConfigService.updateCheckinOperationPolicy(manager, dto),
    );
    return successResponse(policy, 'Đã cập nhật chính sách check-in');
  }

  @AuditAction({
    code: AuditActionCode.CUSTOMER_SCHEDULING_POLICY_UPDATE,
    severity: AuditSeverity.CRITICAL,
    targetType: 'SYSTEM_CONFIG',
  })
  @Put('operations/customer-scheduling')
  @AdminOnly()
  @ApiOperation({ summary: 'Admin cập nhật quy tắc đặt lịch của khách hàng' })
  async updateCustomerSchedulingPolicy(
    @Body() dto: UpdateCustomerSchedulingPolicyDto,
  ) {
    const policy = await this.dataSource.transaction((manager) =>
      this.systemConfigService.updateCustomerSchedulingPolicy(manager, dto),
    );
    return successResponse(policy, 'Đã cập nhật quy tắc đặt lịch');
  }

  @Get()
  @AdminOnly()
  @ApiOperation({ summary: 'Admin xem cấu hình hệ thống đang hiệu lực' })
  @ApiOkResponse({ description: 'Lấy cấu hình hệ thống thành công' })
  async getConfigs() {
    const items = await this.systemConfigService.getAdminConfigs(
      this.dataSource.manager,
    );

    return successResponse(
      { items, groupLabels: SYSTEM_CONFIG_GROUP_LABELS },
      'Lấy cấu hình hệ thống thành công',
    );
  }

  /**
   * Ba endpoint `operations/*` đã được `AdminActivitySnapshotService` chụp
   * before/after theo `configKey` cố định. Endpoint gộp này thì không: nó nhận
   * một mảng key-value tuỳ ý nên không có key nào để tra trước. Mà đây lại là chỗ
   * sửa được hoa hồng, phí phạt, ngưỡng cọc — tức là đổi cách tính tiền cho MỌI
   * giao dịch sau đó. Ghi thẳng danh sách key bị đụng vào `business_data`.
   */
  @AuditAction({
    code: AuditActionCode.SYSTEM_CONFIG_UPDATE,
    severity: AuditSeverity.CRITICAL,
    targetType: 'SYSTEM_CONFIG',
    extract: ({ body }) => {
      const values = body.values;
      if (!values || typeof values !== 'object') return null;
      return { changedKeys: Object.keys(values as Record<string, unknown>) };
    },
  })
  @Put()
  @AdminOnly()
  @ApiOperation({ summary: 'Admin cập nhật cấu hình hệ thống' })
  @ApiOkResponse({ description: 'Cập nhật cấu hình hệ thống thành công' })
  async updateConfigs(@Body() dto: UpdateSystemConfigDto) {
    const items = await this.systemConfigService.updateAdminConfigs(
      this.dataSource.manager,
      dto.values,
    );

    return successResponse(
      { items, groupLabels: SYSTEM_CONFIG_GROUP_LABELS },
      'Cập nhật cấu hình hệ thống thành công',
    );
  }
}
