import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  paginatedResponse,
  successResponse,
} from '../../common/helpers/response.helper';
import { AdminOnly } from '../auth/decorators/admin-only.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BlogService } from './blog.service';
import { CreateBlogDto } from './dto/create-blog.dto';
import { QueryBlogDto } from './dto/query-blog.dto';
import { UpdateBlogStatusDto } from './dto/update-blog-status.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';

@ApiTags('Blog')
@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách blog PUBLISHED cho customer' })
  async findPublished(@Query() query: QueryBlogDto) {
    const result = await this.blogService.findPublished(query);
    return paginatedResponse(
      result.items,
      result.total,
      result.page,
      result.limit,
    );
  }

  @Get('admin/all')
  @AdminOnly()
  @ApiOperation({ summary: 'Danh sách tất cả blog cho admin' })
  async findAllForAdmin(@Query() query: QueryBlogDto) {
    const result = await this.blogService.findAllForAdmin(query);
    return paginatedResponse(
      result.items,
      result.total,
      result.page,
      result.limit,
    );
  }

  @Post('admin')
  @AdminOnly()
  @ApiOperation({ summary: 'Tạo blog' })
  async create(
    @Body() dto: CreateBlogDto,
    @CurrentUser('id') userId: string,
  ) {
    const blog = await this.blogService.create(dto, userId);
    return successResponse(blog, 'Blog created');
  }

  @Patch('admin/:id')
  @AdminOnly()
  @ApiOperation({ summary: 'Sửa blog' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBlogDto,
  ) {
    const blog = await this.blogService.update(id, dto);
    return successResponse(blog, 'Blog updated');
  }

  @Delete('admin/:id')
  @AdminOnly()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa blog' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.blogService.remove(id);
  }

  @Patch('admin/:id/status')
  @AdminOnly()
  @ApiOperation({ summary: 'Đổi status blog' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBlogStatusDto,
  ) {
    const blog = await this.blogService.updateStatus(id, dto.status);
    return successResponse(blog, 'Blog status updated');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết blog PUBLISHED cho customer' })
  async findPublishedOne(@Param('id', ParseUUIDPipe) id: string) {
    const blog = await this.blogService.findPublishedOne(id);
    return successResponse(blog);
  }
}
