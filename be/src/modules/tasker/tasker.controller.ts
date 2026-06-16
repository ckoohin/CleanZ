import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
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
import { UserRole } from 'src/common/enums/user-role.enum';
import { DocumentStatus } from 'src/common/enums/document-status.enum';
import { AppException } from 'src/common/exceptions/app.exception';
import { AdminOnly } from '../auth/decorators/admin-only.decorator';
import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/AuthRequest';
import { ReviewTaskerProfileDto } from './dto/review-tasker-profile.dto';
import { SubmitTaskerProfileDto } from './dto/submit-tasker-profile.dto';
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
  @Auth(UserRole.TASKER)
  @ApiOperation({
    summary: 'Tasker xem hồ sơ của chính mình',
    description:
      'FE dùng API này để hiển thị trạng thái hồ sơ hiện tại: PENDING, APPROVED hoặc REJECTED. Nếu hồ sơ bị từ chối, lý do nằm trong document.note.',
  })
  findMyProfile(@CurrentUser() user: AuthUser) {
    return this.taskerService.findMyProfile(user.id);
  }

  @Get('admin/profiles/pending')
  @AdminOnly()
  @ApiOperation({
    summary: 'Admin xem danh sách hồ sơ tasker chờ duyệt',
    description:
      'FE admin dùng API này để lấy các hồ sơ có docStatus = PENDING, sắp xếp theo lần cập nhật mới nhất.',
  })
  findPendingProfiles() {
    return this.taskerService.findPendingProfiles();
  }

  @Get('admin/profiles/pending/:taskerId')
  @AdminOnly()
  @ApiOperation({
    summary: 'Admin xem chi tiết hồ sơ tasker đang chờ duyệt',
    description:
      'FE admin dùng API này khi mở chi tiết một hồ sơ trong danh sách chờ duyệt. API chỉ trả hồ sơ có document.status = PENDING.',
  })
  @ApiParam({
    name: 'taskerId',
    description: 'ID hồ sơ tasker đang chờ duyệt',
    example: '20000000-0000-0000-0000-000000000001',
  })
  findPendingProfileDetail(@Param('taskerId') taskerId: string) {
    return this.taskerService.findPendingProfileDetail(taskerId);
  }

  @Patch('admin/profiles/:taskerId/review')
  @AdminOnly()
  @ApiOperation({
    summary: 'Admin duyệt hoặc từ chối hồ sơ tasker',
    description:
      'Nếu status = APPROVED, tasker được chuyển sang ACTIVE. Nếu status = REJECTED, bắt buộc gửi reason; hệ thống lưu reason vào taskers.doc_note và tasker có thể nộp hồ sơ lại.',
  })
  @ApiParam({
    name: 'taskerId',
    description: 'ID hồ sơ tasker cần duyệt',
    example: '20000000-0000-0000-0000-000000000001',
  })
  @ApiBody({
    type: ReviewTaskerProfileDto,
    examples: {
      approve: {
        summary: 'Duyệt hồ sơ',
        value: {
          status: DocumentStatus.APPROVED,
        },
      },
      reject: {
        summary: 'Từ chối hồ sơ',
        value: {
          status: DocumentStatus.REJECTED,
          reason: 'Ảnh giấy tờ bị mờ, vui lòng upload lại.',
        },
      },
    },
  })
  reviewProfile(
    @CurrentUser() user: AuthUser,
    @Param('taskerId') taskerId: string,
    @Body() dto: ReviewTaskerProfileDto,
  ) {
    return this.taskerService.reviewProfile(user.id, taskerId, dto);
  }
}
