import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { StaffsService } from './staffs.service';
import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/AuthRequest';
import {
  FileInterceptor,
  FileFieldsInterceptor,
} from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AdminOnly } from '../auth/decorators/admin-only.decorator';
import { UpdateStaffPresenceDto } from './dto/update-staff-presence.dto';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UpdateStaffProfileDto } from './dto/update-staff-profile.dto';
import { CreateStaffServiceDto } from './dto/create-staff-service.dto';
import { UpdateStaffServiceDto } from './dto/update-staff-service.dto';

const UUIDParam = new ParseUUIDPipe({
  exceptionFactory: () => new NotFoundException('Người dùng không tồn tại'),
});

@Controller('staffs')
@Auth()
@ApiTags('staffs')
@ApiBearerAuth('access-token')
export class StaffsController {
  constructor(private readonly staffsService: StaffsService) {}

  @Get('/profile')
  @ApiOperation({ summary: 'Lấy hồ sơ staff hiện tại' })
  @ApiOkResponse({ description: 'Lấy hồ sơ staff thành công' })
  @ApiUnauthorizedResponse({ description: 'Token không hợp lệ' })
  async getProfile(@CurrentUser() currentUser: AuthUser) {
    return this.staffsService.getProfileStaff(currentUser.id, currentUser.role);
  }

  @Get('presence/me')
  @ApiOperation({ summary: 'Lấy trạng thái hiện diện của staff hiện tại' })
  @ApiOkResponse({ description: 'Lấy trạng thái hiện diện thành công' })
  async getMyPresence(@CurrentUser() currentUser: AuthUser) {
    return this.staffsService.getMyPresence(currentUser.id, currentUser.role);
  }

  @Patch('presence/me')
  @ApiOperation({
    summary: 'Cập nhật trạng thái hiện diện của staff hiện tại',
  })
  @ApiBody({ type: UpdateStaffPresenceDto })
  @ApiOkResponse({ description: 'Cập nhật trạng thái hiện diện thành công' })
  @ApiBadRequestResponse({ description: 'Payload không hợp lệ' })
  async updateMyPresence(
    @Body() dto: UpdateStaffPresenceDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.staffsService.updateMyPresence(
      currentUser.id,
      currentUser.role,
      dto,
    );
  }

  @Post(':userId/apply')
  @ApiOperation({ summary: 'Nộp đơn trở thành staff' })
  @ApiParam({ name: 'userId', example: '6a4f7a8f-2e6a-4db3-a6b8-cd191889f72b' })
  @ApiOkResponse({ description: 'Tạo hồ sơ staff thành công' })
  @ApiBadRequestResponse({ description: 'userId không hợp lệ' })
  async applyToStaff(
    @Param('userId', UUIDParam) userId: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.staffsService.createProfileStaff(
      userId,
      currentUser.id,
      currentUser.role,
    );
  }

  @Patch(':id/avatar')
  @ApiOperation({ summary: 'Cập nhật ảnh đại diện staff' })
  @ApiParam({ name: 'id', example: '6a4f7a8f-2e6a-4db3-a6b8-cd191889f72b' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        avatar: { type: 'string', format: 'binary' },
      },
      required: ['avatar'],
    },
  })
  @ApiOkResponse({ description: 'Cập nhật avatar thành công' })
  @ApiBadRequestResponse({
    description: 'Thiếu file hoặc file ảnh không hợp lệ',
  })
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          cb(new Error('Chỉ chấp nhận file ảnh'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  async updateAvatar(
    @Param('id', UUIDParam) id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() currentUser: AuthUser,
  ) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn ảnh đại diện');
    }
    return this.staffsService.updateAvatar(
      id,
      file,
      currentUser.id,
      currentUser.role,
    );
  }

  @Patch(':id/documents')
  @ApiOperation({ summary: 'Cập nhật giấy tờ staff (CCCD và chứng chỉ)' })
  @ApiParam({ name: 'id', example: '6a4f7a8f-2e6a-4db3-a6b8-cd191889f72b' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        citizenCard: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Tối đa 2 ảnh CCCD',
        },
        certificate: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Tối đa 10 ảnh chứng chỉ',
        },
      },
    },
  })
  @ApiOkResponse({ description: 'Cập nhật giấy tờ thành công' })
  @ApiBadRequestResponse({
    description: 'Số lượng file vượt giới hạn hoặc file sai định dạng',
  })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'citizenCard', maxCount: 2 },
        { name: 'certificate', maxCount: 10 },
      ],
      {
        storage: memoryStorage(),
        limits: { fileSize: 5 * 1024 * 1024 },
        fileFilter: (_req, file, cb) => {
          if (!file.mimetype.startsWith('image/')) {
            cb(new Error('Chỉ chấp nhận file ảnh'), false);
            return;
          }
          cb(null, true);
        },
      },
    ),
  )
  async updateDocuments(
    @Param('id', UUIDParam) id: string,
    @UploadedFiles()
    files: {
      citizenCard?: Express.Multer.File[];
      certificate?: Express.Multer.File[];
    },
    @CurrentUser() currentUser: AuthUser,
  ) {
    const citizenCardCount = files?.citizenCard?.length ?? 0;
    const certificateCount = files?.certificate?.length ?? 0;

    if (citizenCardCount > 2) {
      throw new BadRequestException('Chỉ được upload tối đa 2 ảnh CCCD');
    }
    if (certificateCount > 10) {
      throw new BadRequestException('Chỉ được upload tối đa 10 ảnh chứng chỉ');
    }

    return this.staffsService.updateDocuments(
      id,
      files,
      currentUser.id,
      currentUser.role,
    );
  }

  @Get(':id/documents/:type')
  @ApiOperation({ summary: 'Lấy tài liệu staff theo loại' })
  @ApiParam({ name: 'id', example: '6a4f7a8f-2e6a-4db3-a6b8-cd191889f72b' })
  @ApiParam({ name: 'type', example: 'citizenCard' })
  @ApiOkResponse({ description: 'Lấy danh sách tài liệu theo loại thành công' })
  @ApiBadRequestResponse({ description: 'ID hoặc type không hợp lệ' })
  async getDocumentByType(
    @Param('id', UUIDParam) id: string,
    @Param('type') type: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    const filePaths = await this.staffsService.getDocumentPaths(
      id,
      type,
      currentUser.id,
      currentUser.role,
    );
    return { files: filePaths };
  }

  @Get(':id/documents')
  @ApiOperation({ summary: 'Lấy toàn bộ tài liệu của staff' })
  @ApiParam({ name: 'id', example: '6a4f7a8f-2e6a-4db3-a6b8-cd191889f72b' })
  @ApiOkResponse({ description: 'Lấy toàn bộ tài liệu thành công' })
  async getAllDocuments(
    @Param('id', UUIDParam) id: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.staffsService.getAllStaffDocuments(
      id,
      currentUser.id,
      currentUser.role,
    );
  }

  @Patch(':id/approve')
  @AdminOnly()
  @ApiOperation({ summary: 'Phê duyệt staff (Admin)' })
  @ApiParam({ name: 'id', example: '6a4f7a8f-2e6a-4db3-a6b8-cd191889f72b' })
  @ApiOkResponse({ description: 'Phê duyệt staff thành công' })
  @ApiUnauthorizedResponse({ description: 'Không có quyền phê duyệt' })
  async approveStaff(
    @Param('id', UUIDParam) id: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.staffsService.approveStaff(id, currentUser.id);
  }

  @Patch(':id/reject')
  @AdminOnly()
  @ApiOperation({ summary: 'Từ chối hồ sơ staff (Admin)' })
  @ApiParam({ name: 'id', example: '6a4f7a8f-2e6a-4db3-a6b8-cd191889f72b' })
  @ApiOkResponse({ description: 'Từ chối staff thành công' })
  @ApiUnauthorizedResponse({ description: 'Không có quyền từ chối' })
  async rejectStaff(
    @Param('id', UUIDParam) id: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.staffsService.rejectStaff(id, currentUser.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật hồ sơ staff' })
  @ApiParam({ name: 'id', example: '6a4f7a8f-2e6a-4db3-a6b8-cd191889f72b' })
  @ApiBody({ type: UpdateStaffProfileDto })
  @ApiOkResponse({ description: 'Cập nhật hồ sơ staff thành công' })
  @ApiBadRequestResponse({ description: 'Payload hoặc ID không hợp lệ' })
  async update(
    @Param('id', UUIDParam) id: string,
    @Body() dto: UpdateStaffProfileDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.staffsService.update(id, dto, currentUser.id, currentUser.role);
  }

  // ─── Staff Services Endpoints ──────────────────────────

  @Post(':id/services')
  createStaffService(
    @Param('id', UUIDParam) id: string,
    @Body() dto: CreateStaffServiceDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.staffsService.createStaffService(
      id,
      dto,
      currentUser.id,
      currentUser.role,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin staff theo ID' })
  @ApiParam({ name: 'id', example: '6a4f7a8f-2e6a-4db3-a6b8-cd191889f72b' })
  @ApiOkResponse({ description: 'Lấy thông tin staff thành công' })
  @ApiBadRequestResponse({ description: 'ID không hợp lệ' })
  async findById(
    @Param('id', UUIDParam) id: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.staffsService.findStaffById(
      id,
      currentUser.id,
      currentUser.role,
    );
  }

  @Get(':id/services')
  async getStaffServices(@Param('id', UUIDParam) id: string) {
    return this.staffsService.getStaffServices(id);
  }

  @Patch(':id/services/:wsId')
  async updateStaffService(
    @Param('id', UUIDParam) id: string,
    @Param('wsId', UUIDParam) wsId: string,
    @Body() dto: UpdateStaffServiceDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.staffsService.updateStaffService(
      id,
      wsId,
      dto,
      currentUser.id,
      currentUser.role,
    );
  }

  @Delete(':id/services/:wsId')
  async deleteStaffService(
    @Param('id', UUIDParam) id: string,
    @Param('wsId', UUIDParam) wsId: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.staffsService.deleteStaffService(
      id,
      wsId,
      currentUser.id,
      currentUser.role,
    );
  }
}
