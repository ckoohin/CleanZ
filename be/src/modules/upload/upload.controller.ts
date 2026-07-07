import {
  Controller,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UploadService } from './upload.service';
import { ResponseHelper } from '../../common/helpers/response.helper';
import { AppException } from '../../common/exceptions/app.exception';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Auth } from '../auth/decorators/auth.decorator';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];

const MAX_FILE_SIZE = 5 * 1024 * 1024; //5MB
const BLOG_UPLOAD_FOLDER = 'CleanZ/blog';

type UploadImageBody = {
  folder?: string;
};

type DeleteImageBody = {
  public_id?: string;
};

@Controller('upload')
@ApiTags('Upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @Auth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Upload ảnh lên cloud storage' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        folder: { type: 'string', example: BLOG_UPLOAD_FOLDER },
      },
      required: ['file'],
    },
  })
  @ApiCreatedResponse({ description: 'Upload ảnh thành công' })
  @ApiBadRequestResponse({ description: 'Thiếu file hoặc sai định dạng ảnh' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),

      limits: { fileSize: MAX_FILE_SIZE },

      // Validate MIME type ngay tại tầng Multer
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
    }),
  )
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadImageBody,
  ) {
    if (!file) {
      throw new AppException('No file uploaded. Field name must be "file".');
    }

    const folder =
      body?.folder === BLOG_UPLOAD_FOLDER ? BLOG_UPLOAD_FOLDER : undefined;
    const result = await this.uploadService.uploadImage(file, folder);

    return ResponseHelper.success(result, 'Image uploaded successfully');
  }

  @Delete('image')
  @Auth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xoa anh theo public_id' })
  @ApiOkResponse({ description: 'Xoa anh thanh cong' })
  @ApiBadRequestResponse({ description: 'public_id khong hop le' })
  async deleteImageByBody(
    @Body() body: DeleteImageBody,
    @Query('public_id') publicIdQuery?: string,
  ) {
    return this.deleteByPublicId(body?.public_id ?? publicIdQuery);
  }

  @Delete('image/*publicId')
  @Auth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa ảnh theo publicId' })
  @ApiParam({
    name: 'publicId',
    example: 'services/image_01',
    description: 'Public ID của ảnh cần xóa',
  })
  @ApiOkResponse({ description: 'Xóa ảnh thành công' })
  @ApiBadRequestResponse({ description: 'publicId không hợp lệ' })
  async deleteImage(@Param('publicId') publicId: string) {
    return this.deleteByPublicId(publicId);
  }

  private async deleteByPublicId(publicId?: string) {
    if (!publicId) {
      throw new AppException('public_id is required.');
    }

    publicId = publicId.replace(/,/g, '/');

    publicId = publicId.replace(/^\/+/, '');

    if (!publicId.trim()) {
      throw new AppException('public_id is required.');
    }

    const result = await this.uploadService.deleteImage(publicId);

    return ResponseHelper.success(result, 'Image deleted successfully');
  }
}
