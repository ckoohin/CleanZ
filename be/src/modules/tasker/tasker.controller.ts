import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from 'src/common/enums/user-role.enum';
import { AppException } from 'src/common/exceptions/app.exception';
import { DateRangeQueryDto } from '../admin/dto/date-range-query.dto';
import { AdminOnly } from '../auth/decorators/admin-only.decorator';
import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/AuthRequest';
import { AdminBanTaskerDto } from './dto/admin-ban-tasker.dto';
import { AdminReviewTaskerDto } from './dto/admin-review-tasker.dto';
import { AdminUpdateTaskerDto } from './dto/admin-update-tasker.dto';
import { AdminUpdateTaskerWorkStatusDto } from './dto/admin-update-tasker-work-status.dto';
import { ReinstateTaskerDto } from './dto/reinstate-tasker.dto';
import { QueryTaskersDto } from './dto/query-taskers.dto';
import { SubmitTaskerProfileDto } from './dto/submit-tasker-profile.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { UpdatePresenceDto } from './dto/update-presence.dto';
import { UpdateTaskerLocationDto } from './dto/update-tasker-location.dto';
import { TaskerService } from './tasker.service';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

@ApiTags('Tasker')
@ApiBearerAuth()
@Controller('tasker')
export class TaskerController {
  constructor(private readonly taskerService: TaskerService) {}

  @Post('profile')
  @Auth(UserRole.CUSTOMER, UserRole.TASKER)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'avatar', maxCount: 1 },
        { name: 'docFront', maxCount: 1 },
        { name: 'docBack', maxCount: 1 },
        { name: 'criminalRecord', maxCount: 1 },
        { name: 'healthCertificate', maxCount: 1 },
        { name: 'certificate', maxCount: 1 },
      ],
      {
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
      },
    ),
  )
  @ApiOperation({
    summary: 'Tasker nộp hồ sơ đăng ký làm tasker',
    description:
      'FE gửi multipart/form-data gồm avatar, số điện thoại, thông tin hồ sơ, thông tin ngân hàng, giấy tờ và 2 file ảnh docFront/docBack. Backend tự upload ảnh lên cloud storage rồi lưu URL vào hồ sơ. Nếu user chưa có hồ sơ tasker thì hệ thống tạo mới; nếu hồ sơ từng bị từ chối thì cho nộp lại và chuyển về PENDING. Hồ sơ đã APPROVED thì không được nộp lại và không thể đổi số điện thoại.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: [
        'avatar',
        'phone',
        'docType',
        'docIdNumber',
        'docFront',
        'docBack',
      ],
      properties: {
        avatar: {
          type: 'string',
          format: 'binary',
          description: 'Ảnh đại diện tasker, bắt buộc khi nộp hồ sơ',
        },
        workingAddress: {
          type: 'string',
          example: '12 Nguyen Trai, Thanh Xuan, Ha Noi',
        },
        bio: {
          type: 'string',
          example: 'Tôi có 2 năm kinh nghiệm dọn dẹp căn hộ và nhà phố.',
        },
        phone: {
          type: 'string',
          example: '09876543210',
          description:
            'Số điện thoại tasker. Không thể thay đổi sau khi hồ sơ được duyệt.',
        },
        docType: {
          type: 'string',
          enum: ['CITIZEN_ID', 'OTHER'],
          example: 'CITIZEN_ID',
        },
        docIdNumber: {
          type: 'string',
          example: '001203000123',
        },
        docIssuedDate: {
          type: 'string',
          example: '2020-01-01',
        },
        docExpiredDate: {
          type: 'string',
          example: '2035-01-01',
        },
        docFront: {
          type: 'string',
          format: 'binary',
          description: 'Ảnh mặt trước căn cước',
        },
        docBack: {
          type: 'string',
          format: 'binary',
          description: 'Ảnh mặt sau căn cước',
        },
        criminalRecord: {
          type: 'string',
          format: 'binary',
          description: 'Ảnh lý lịch tư pháp',
        },
        healthCertificate: {
          type: 'string',
          format: 'binary',
          description: 'Ảnh giấy khám sức khỏe',
        },
        certificate: {
          type: 'string',
          format: 'binary',
          description: 'Ảnh chứng chỉ nghiệp vụ nếu có',
        },
        bankName: {
          type: 'string',
          example: 'Vietcombank',
        },
        bankAccountNumber: {
          type: 'string',
          example: '1234567890',
        },
        bankAccountName: {
          type: 'string',
          example: 'NGUYEN VAN A',
        },
      },
    },
  })
  submitProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: SubmitTaskerProfileDto,
    @UploadedFiles()
    files: {
      avatar?: Express.Multer.File[];
      docFront?: Express.Multer.File[];
      docBack?: Express.Multer.File[];
      criminalRecord?: Express.Multer.File[];
      healthCertificate?: Express.Multer.File[];
      certificate?: Express.Multer.File[];
    },
  ) {
    return this.taskerService.submitProfile(user.id, dto, files);
  }

  @Get('profile/me')
  @Auth(UserRole.CUSTOMER, UserRole.TASKER)
  @ApiOperation({
    summary: 'Tasker / applicant xem hồ sơ của chính mình',
    description:
      'FE dùng API này để hiển thị trạng thái hồ sơ hiện tại: PENDING, APPROVED hoặc REJECTED. Applicant đang chờ duyệt vẫn còn role CUSTOMER (chỉ nâng TASKER khi admin duyệt) nên endpoint này cho phép cả CUSTOMER. Nếu hồ sơ bị từ chối, lý do nằm trong document.note.',
  })
  findMyProfile(@CurrentUser() user: AuthUser) {
    return this.taskerService.findMyProfile(user.id);
  }

  @Patch('profile/me')
  @Auth(UserRole.CUSTOMER, UserRole.TASKER)
  @ApiOperation({
    summary: 'Tasker / applicant tự cập nhật thông tin hồ sơ',
    description:
      'Cập nhật phone, bio, experience, skills, địa chỉ làm việc và thông tin ngân hàng. Không gồm giấy tờ (dùng PATCH /tasker/profile/documents). Applicant chờ duyệt vẫn còn role CUSTOMER nên endpoint cho phép cả CUSTOMER.',
  })
  updateMyProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateMyProfileDto,
  ) {
    return this.taskerService.updateMyProfile(user.id, dto);
  }

  @Patch('profile/documents')
  @Auth(UserRole.TASKER)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'avatar', maxCount: 1 },
        { name: 'docFront', maxCount: 1 },
        { name: 'docBack', maxCount: 1 },
        { name: 'criminalRecord', maxCount: 1 },
        { name: 'healthCertificate', maxCount: 1 },
        { name: 'certificate', maxCount: 1 },
      ],
      {
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
      },
    ),
  )
  @ApiOperation({
    summary: 'Tasker xem xét và bổ sung giấy tờ của chính mình',
    description:
      'Chỉ cho tải giấy tờ còn thiếu hoặc đúng mục admin yêu cầu cập nhật. Giấy tờ đã có bị khóa ở backend, không chỉ trên giao diện.',
  })
  @ApiConsumes('multipart/form-data')
  updateMyDocuments(
    @CurrentUser() user: AuthUser,
    @UploadedFiles()
    files: {
      avatar?: Express.Multer.File[];
      docFront?: Express.Multer.File[];
      docBack?: Express.Multer.File[];
      criminalRecord?: Express.Multer.File[];
      healthCertificate?: Express.Multer.File[];
      certificate?: Express.Multer.File[];
    },
  ) {
    return this.taskerService.updateMyDocuments(user.id, files);
  }

  @Patch('me/presence')
  @Auth(UserRole.TASKER)
  @ApiOperation({
    summary: 'Tasker cập nhật trạng thái hoạt động (ONLINE / OFFLINE)',
  })
  updatePresence(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdatePresenceDto,
  ) {
    return this.taskerService.updatePresence(
      user.id,
      dto.presenceStatus,
      dto.lat,
      dto.lng,
    );
  }

  @Patch('me/location')
  @Auth(UserRole.TASKER)
  @ApiOperation({
    summary: 'Tasker cập nhật vị trí hiện tại (heartbeat mỗi 60s khi ONLINE)',
  })
  async updateLocation(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateTaskerLocationDto,
  ) {
    await this.taskerService.updateLocation(user.id, dto.lat, dto.lng);
    return { updated: true };
  }

  // ─── Admin: tasker management ─────────────────────────────────────────────
  // NOTE: literal routes (admin/...) must precede parametric routes (admin/:id)
  // — NestJS resolves by registration order within the same segment count.

  @Get('admin')
  @AdminOnly()
  @ApiOperation({ summary: 'Admin xem danh sách tất cả tasker với filter' })
  listTaskers(@Query() dto: QueryTaskersDto) {
    return this.taskerService.listTaskers(dto);
  }

  @Get('admin/:id')
  @AdminOnly()
  @ApiOperation({ summary: 'Admin xem chi tiết một tasker' })
  @ApiParam({ name: 'id', description: 'UUID của tasker' })
  getTaskerDetail(@Param('id', ParseUUIDPipe) id: string) {
    return this.taskerService.getTaskerDetail(id);
  }

  @Patch('admin/:id')
  @AdminOnly()
  @ApiOperation({ summary: 'Admin sửa thông tin cơ bản của tasker' })
  @ApiParam({ name: 'id', description: 'UUID của tasker' })
  updateTasker(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminUpdateTaskerDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.taskerService.updateTaskerByAdmin(id, dto, adminId);
  }

  @Patch('admin/:id/work-status')
  @AdminOnly()
  @ApiOperation({
    summary: 'Admin mở khóa nhận đơn cho tasker',
  })
  @ApiParam({ name: 'id', description: 'UUID của tasker' })
  updateTaskerWorkStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminUpdateTaskerWorkStatusDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.taskerService.updateTaskerWorkStatusByAdmin(id, dto, adminId);
  }

  @Patch('admin/:id/approve')
  @AdminOnly()
  @ApiOperation({ summary: 'Admin duyệt tasker — chuyển sang ACTIVE' })
  @ApiParam({ name: 'id', description: 'UUID của tasker' })
  approveTasker(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.taskerService.approveTasker(id, adminId);
  }

  @Patch('admin/:id/reject')
  @AdminOnly()
  @ApiOperation({ summary: 'Admin từ chối hồ sơ tasker' })
  @ApiParam({ name: 'id', description: 'UUID của tasker' })
  rejectTasker(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminReviewTaskerDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.taskerService.rejectTasker(id, dto, adminId);
  }

  @Patch('admin/:id/request-info')
  @AdminOnly()
  @ApiOperation({ summary: 'Admin yêu cầu tasker bổ sung thông tin' })
  @ApiParam({ name: 'id', description: 'UUID của tasker' })
  requestMoreInfo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminReviewTaskerDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.taskerService.requestMoreInfo(id, dto, adminId);
  }

  @Post('admin/:id/ban')
  @AdminOnly()
  @ApiOperation({ summary: 'Admin khóa tài khoản tasker' })
  @ApiParam({ name: 'id', description: 'UUID của tasker' })
  banTasker(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminBanTaskerDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.taskerService.banTasker(id, dto, adminId);
  }

  @Post('admin/:id/unban')
  @AdminOnly()
  @ApiOperation({ summary: 'Admin mở khóa tài khoản tasker' })
  @ApiParam({ name: 'id', description: 'UUID của tasker' })
  unbanTasker(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.taskerService.unbanTasker(id, adminId);
  }

  @Patch('admin/:id/reinstate')
  @AdminOnly()
  @ApiOperation({
    summary: 'Khôi phục tasker bị chấm dứt vĩnh viễn (sau kháng cáo)',
  })
  @ApiParam({ name: 'id', description: 'UUID của tasker' })
  reinstateTasker(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReinstateTaskerDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.taskerService.reinstateTasker(id, adminId, dto.reason);
  }

  @Delete('admin/:id')
  @AdminOnly()
  @ApiOperation({
    summary: 'Admin xóa hồ sơ tasker — buộc ứng viên nộp lại từ đầu',
    description:
      'Xóa hẳn hồ sơ tasker (kèm toàn bộ thông tin & ảnh giấy tờ đã nộp) để ứng viên phải đăng ký lại từ đầu. Chỉ áp dụng cho hồ sơ CHƯA được duyệt — hồ sơ đã APPROVED không thể xóa (dùng khóa tài khoản nếu cần).',
  })
  @ApiParam({ name: 'id', description: 'UUID của tasker' })
  deleteTaskerProfile(@Param('id', ParseUUIDPipe) id: string) {
    return this.taskerService.deleteProfile(id);
  }

  @Get('admin/:id/penalties')
  @AdminOnly()
  @ApiOperation({ summary: 'Lịch sử vi phạm của tasker (placeholder)' })
  @ApiParam({ name: 'id', description: 'UUID của tasker' })
  getPenalties(@Param('id', ParseUUIDPipe) id: string) {
    return this.taskerService.getPenalties(id);
  }

  @Get('admin/:id/earnings')
  @AdminOnly()
  @ApiOperation({
    summary: 'Admin xem thu nhập tasker & chiết khấu nền tảng theo kỳ',
  })
  @ApiParam({ name: 'id', description: 'UUID của tasker' })
  getTaskerEarnings(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() dto: DateRangeQueryDto,
  ) {
    return this.taskerService.getTaskerEarningsSummary(
      id,
      dto.fromDate,
      dto.toDate,
    );
  }

  @Get('admin/:id/earnings/details')
  @AdminOnly()
  @ApiOperation({
    summary: 'Admin xem danh sách phiếu lương theo từng đơn của tasker',
  })
  @ApiParam({ name: 'id', description: 'UUID của tasker' })
  getTaskerEarningsDetails(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() dto: DateRangeQueryDto,
  ) {
    return this.taskerService.getTaskerEarningsDetails(
      id,
      dto.fromDate,
      dto.toDate,
    );
  }
}
