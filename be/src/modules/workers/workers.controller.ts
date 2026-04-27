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
import { WorkersService } from './workers.service';
import { UpdateWorkerProfileDto } from './dto/update-worker-profile.dto';
import { CreateWorkerServiceDto } from './dto/create-worker-service.dto';
import { UpdateWorkerServiceDto } from './dto/update-worker-service.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/AuthRequest';
import {
  FileInterceptor,
  FileFieldsInterceptor,
} from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AdminOnly } from '../auth/decorators/admin-only.decorator';
import { UpdateWorkerPresenceDto } from './dto/update-worker-presence.dto';
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

const UUIDParam = new ParseUUIDPipe({
  exceptionFactory: () => new NotFoundException('Người dùng không tồn tại'),
});

@Controller('workers')
@Auth()
@ApiTags('Workers')
@ApiBearerAuth('access-token')
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  @Get('/profile')
  @ApiOperation({ summary: 'Lấy hồ sơ worker hiện tại' })
  @ApiOkResponse({ description: 'Lấy hồ sơ worker thành công' })
  @ApiUnauthorizedResponse({ description: 'Token không hợp lệ' })
  async getProfile(@CurrentUser() currentUser: AuthUser) {
    return this.workersService.getProfileWorker(
      currentUser.id,
      currentUser.role,
    );
  }

  @Get('presence/me')
  @ApiOperation({ summary: 'Lấy trạng thái hiện diện của worker hiện tại' })
  @ApiOkResponse({ description: 'Lấy trạng thái hiện diện thành công' })
  async getMyPresence(@CurrentUser() currentUser: AuthUser) {
    return this.workersService.getMyPresence(currentUser.id, currentUser.role);
  }

  @Patch('presence/me')
  @ApiOperation({
    summary: 'Cập nhật trạng thái hiện diện của worker hiện tại',
  })
  @ApiBody({ type: UpdateWorkerPresenceDto })
  @ApiOkResponse({ description: 'Cập nhật trạng thái hiện diện thành công' })
  @ApiBadRequestResponse({ description: 'Payload không hợp lệ' })
  async updateMyPresence(
    @Body() dto: UpdateWorkerPresenceDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.workersService.updateMyPresence(
      currentUser.id,
      currentUser.role,
      dto,
    );
  }

  @Post(':userId/apply')
  @ApiOperation({ summary: 'Nộp đơn trở thành worker' })
  @ApiParam({ name: 'userId', example: '6a4f7a8f-2e6a-4db3-a6b8-cd191889f72b' })
  @ApiOkResponse({ description: 'Tạo hồ sơ worker thành công' })
  @ApiBadRequestResponse({ description: 'userId không hợp lệ' })
  async applyToWorker(
    @Param('userId', UUIDParam) userId: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.workersService.createProfileWorker(
      userId,
      currentUser.id,
      currentUser.role,
    );
  }

  @Patch(':id/avatar')
  @ApiOperation({ summary: 'Cập nhật ảnh đại diện worker' })
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
    return this.workersService.updateAvatar(
      id,
      file,
      currentUser.id,
      currentUser.role,
    );
  }

  @Patch(':id/documents')
  @ApiOperation({ summary: 'Cập nhật giấy tờ worker (CCCD và chứng chỉ)' })
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

    return this.workersService.updateDocuments(
      id,
      files,
      currentUser.id,
      currentUser.role,
    );
  }

  @Get(':id/documents/:type')
  @ApiOperation({ summary: 'Lấy tài liệu worker theo loại' })
  @ApiParam({ name: 'id', example: '6a4f7a8f-2e6a-4db3-a6b8-cd191889f72b' })
  @ApiParam({ name: 'type', example: 'citizenCard' })
  @ApiOkResponse({ description: 'Lấy danh sách tài liệu theo loại thành công' })
  @ApiBadRequestResponse({ description: 'ID hoặc type không hợp lệ' })
  async getDocumentByType(
    @Param('id', UUIDParam) id: string,
    @Param('type') type: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    const filePaths = await this.workersService.getDocumentPaths(
      id,
      type,
      currentUser.id,
      currentUser.role,
    );
    return { files: filePaths };
  }

  @Get(':id/documents')
  @ApiOperation({ summary: 'Lấy toàn bộ tài liệu của worker' })
  @ApiParam({ name: 'id', example: '6a4f7a8f-2e6a-4db3-a6b8-cd191889f72b' })
  @ApiOkResponse({ description: 'Lấy toàn bộ tài liệu thành công' })
  async getAllDocuments(
    @Param('id', UUIDParam) id: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.workersService.getAllWorkerDocuments(
      id,
      currentUser.id,
      currentUser.role,
    );
  }

  @Patch(':id/approve')
  @AdminOnly()
  @ApiOperation({ summary: 'Phê duyệt worker (Admin)' })
  @ApiParam({ name: 'id', example: '6a4f7a8f-2e6a-4db3-a6b8-cd191889f72b' })
  @ApiOkResponse({ description: 'Phê duyệt worker thành công' })
  @ApiUnauthorizedResponse({ description: 'Không có quyền phê duyệt' })
  async approveWorker(
    @Param('id', UUIDParam) id: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.workersService.approveWorker(id, currentUser.id);
  }

  @Patch(':id/reject')
  @AdminOnly()
  @ApiOperation({ summary: 'Từ chối hồ sơ worker (Admin)' })
  @ApiParam({ name: 'id', example: '6a4f7a8f-2e6a-4db3-a6b8-cd191889f72b' })
  @ApiOkResponse({ description: 'Từ chối worker thành công' })
  @ApiUnauthorizedResponse({ description: 'Không có quyền từ chối' })
  async rejectWorker(
    @Param('id', UUIDParam) id: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.workersService.rejectWorker(id, currentUser.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật hồ sơ worker' })
  @ApiParam({ name: 'id', example: '6a4f7a8f-2e6a-4db3-a6b8-cd191889f72b' })
  @ApiBody({ type: UpdateWorkerProfileDto })
  @ApiOkResponse({ description: 'Cập nhật hồ sơ worker thành công' })
  @ApiBadRequestResponse({ description: 'Payload hoặc ID không hợp lệ' })
  async update(
    @Param('id', UUIDParam) id: string,
    @Body() dto: UpdateWorkerProfileDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.workersService.update(
      id,
      dto,
      currentUser.id,
      currentUser.role,
    );
  }

  // ─── Worker Services Endpoints ──────────────────────────

  @Post(':id/services')
  createWorkerService(
    @Param('id', UUIDParam) id: string,
    @Body() dto: CreateWorkerServiceDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.workersService.createWorkerService(
      id,
      dto,
      currentUser.id,
      currentUser.role,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin worker theo ID' })
  @ApiParam({ name: 'id', example: '6a4f7a8f-2e6a-4db3-a6b8-cd191889f72b' })
  @ApiOkResponse({ description: 'Lấy thông tin worker thành công' })
  @ApiBadRequestResponse({ description: 'ID không hợp lệ' })
  async findById(
    @Param('id', UUIDParam) id: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.workersService.findWorkerById(
      id,
      currentUser.id,
      currentUser.role,
    );
  }

  @Get(':id/services')
  async getWorkerServices(@Param('id', UUIDParam) id: string) {
    return this.workersService.getWorkerServices(id);
  }

  @Patch(':id/services/:wsId')
  async updateWorkerService(
    @Param('id', UUIDParam) id: string,
    @Param('wsId', UUIDParam) wsId: string,
    @Body() dto: UpdateWorkerServiceDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.workersService.updateWorkerService(
      id,
      wsId,
      dto,
      currentUser.id,
      currentUser.role,
    );
  }

  @Delete(':id/services/:wsId')
  async deleteWorkerService(
    @Param('id', UUIDParam) id: string,
    @Param('wsId', UUIDParam) wsId: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.workersService.deleteWorkerService(
      id,
      wsId,
      currentUser.id,
      currentUser.role,
    );
  }
}
