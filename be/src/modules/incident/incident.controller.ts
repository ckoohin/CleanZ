import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { IncidentService } from './services/incident.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { QueryIncidentDto } from './dto/query-incident.dto';
import { WithdrawIncidentDto } from './dto/withdraw-incident.dto';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/jpg'];
const MAX_SIZE = 5 * 1024 * 1024;

@Controller('incidents')
@ApiTags('Incidents')
@ApiBearerAuth('access-token')
@Auth(UserRole.CUSTOMER)
export class IncidentController {
  constructor(private readonly incidentService: IncidentService) {}

  @Post('evidences')
  @ApiOperation({ summary: 'Upload bằng chứng (ảnh) — dùng trước khi tạo' })
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
    return this.incidentService.uploadEvidence(userId, file);
  }

  @Post()
  @ApiOperation({ summary: 'Customer báo cáo sự cố từ đơn đã hoàn thành' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateIncidentDto) {
    return this.incidentService.create(userId, dto);
  }

  @Get('mine')
  @ApiOperation({ summary: 'Danh sách sự cố của tôi (phân trang, lọc)' })
  listMine(
    @CurrentUser('id') userId: string,
    @Query() query: QueryIncidentDto,
  ) {
    return this.incidentService.listMine(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết sự cố của tôi (ẩn tài chính Tasker)' })
  findOne(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.incidentService.findOneForCustomer(userId, id);
  }

  @Patch(':id/withdraw')
  @ApiOperation({ summary: 'Rút báo cáo (chỉ trước khi được duyệt)' })
  withdraw(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: WithdrawIncidentDto,
  ) {
    return this.incidentService.withdraw(userId, id, dto);
  }
}
