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
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import {
  paginatedResponse,
  successResponse,
} from '../../common/helpers/response.helper';
import { AdminOnly } from '../auth/decorators/admin-only.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BlogService } from './blog.service';
import { CreateBlogCategoryDto } from './dto/create-blog-category.dto';
import { CreateBlogDto } from './dto/create-blog.dto';
import { QueryBlogDto } from './dto/query-blog.dto';
import { UpdateBlogCategoryDto } from './dto/update-blog-category.dto';
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

  @Get('categories')
  @ApiOperation({ summary: 'Danh sach category blog public' })
  async findPublicCategories() {
    const categories = await this.blogService.findPublicCategories();
    return successResponse(categories);
  }

  @Get('tags')
  @ApiOperation({ summary: 'Danh sach tag blog public' })
  async findPublicTags() {
    const tags = await this.blogService.findPublicTags();
    return successResponse(tags);
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

  @Get('admin/:id/preview')
  @AdminOnly()
  @ApiOperation({ summary: 'Preview blog cho admin khong tang view' })
  async previewForAdmin(@Param('id', ParseUUIDPipe) id: string) {
    const blog = await this.blogService.findOneForPreview(id);
    return successResponse(blog);
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

  @Get('admin/categories')
  @AdminOnly()
  @ApiOperation({ summary: 'Danh sach category blog cho admin' })
  async findCategories(@Query('q') q?: string) {
    const categories = await this.blogService.findCategories(q);
    return successResponse(categories);
  }

  @Post('admin/categories')
  @AdminOnly()
  @ApiOperation({ summary: 'Tao category blog' })
  async createCategory(@Body() dto: CreateBlogCategoryDto) {
    const category = await this.blogService.createCategory(dto);
    return successResponse(category, 'Blog category created');
  }

  @Patch('admin/categories/:id')
  @AdminOnly()
  @ApiOperation({ summary: 'Sua category blog' })
  async updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBlogCategoryDto,
  ) {
    const category = await this.blogService.updateCategory(id, dto);
    return successResponse(category, 'Blog category updated');
  }

  @Delete('admin/categories/:id')
  @AdminOnly()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xoa category blog' })
  async removeCategory(@Param('id', ParseUUIDPipe) id: string) {
    await this.blogService.removeCategory(id);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Chi tiet blog PUBLISHED theo slug cho customer' })
  async findPublishedOneBySlug(
    @Param('slug') slug: string,
    @Req() request: Request,
  ) {
    const blog = await this.blogService.findPublishedOneBySlug(
      slug,
      this.getViewClientKey(request),
    );
    return successResponse(blog);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết blog PUBLISHED cho customer' })
  async findPublishedOne(@Param('id', ParseUUIDPipe) id: string) {
    const blog = await this.blogService.findPublishedOne(id);
    return successResponse(blog);
  }

  private getViewClientKey(request: Request): string {
    const forwardedFor = request.headers['x-forwarded-for'];
    const ip = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor?.split(',')[0] || request.ip || request.socket.remoteAddress || 'unknown';
    const userAgent = request.headers['user-agent'] || 'unknown';
    return `${ip}:${userAgent}`;
  }
}
