import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from 'src/common/enums/user-role.enum';
import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IncidentTaskerService } from './services/incident-tasker.service';
import { QueryIncidentDto } from './dto/query-incident.dto';
import { SubmitStatementDto } from './dto/submit-statement.dto';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/jpg'];
const MAX_SIZE = 5 * 1024 * 1024;

@Controller('tasker/incidents')
@ApiTags('Tasker Incidents')
@ApiBearerAuth('access-token')
@Auth(UserRole.TASKER)
export class IncidentTaskerController {
  constructor(private readonly taskerService: IncidentTaskerService) {}

  @Post('evidences')
  @ApiOperation({ summary: 'Tasker upload bằng chứng phản biện (ảnh)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_SIZE },
    }),
  )
  uploadEvidence(
    @CurrentUser('id') userId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Thiếu file bằng chứng');
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      throw new BadRequestException('Chỉ chấp nhận ảnh (jpg/png)');
    }
    return this.taskerService.uploadEvidence(userId, file);
  }

  @Get('mine')
  @ApiOperation({ summary: 'Danh sách sự cố liên quan tôi' })
  listMine(
    @CurrentUser('id') userId: string,
    @Query() query: QueryIncidentDto,
  ) {
    return this.taskerService.listMine(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết sự cố (tasker view, ẩn tài chính khách)' })
  findOne(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.taskerService.findOne(userId, id);
  }

  @Post(':id/statements')
  @ApiOperation({ summary: 'Gửi giải trình / đối chất (khi INVESTIGATING)' })
  submitStatement(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitStatementDto,
  ) {
    return this.taskerService.submitStatement(userId, id, dto);
  }
}
