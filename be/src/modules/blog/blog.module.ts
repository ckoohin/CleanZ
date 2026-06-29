import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlogService } from './blog.service';
import { BlogController } from './blog.controller';
import { BlogEntity } from './entity/blog.entity';
import { BlogCategoryEntity } from './entity/blog-category.entity';
import { BlogTagEntity } from './entity/blog-tag.entity';
import { BlogTagRelationEntity } from './entity/blog-tag-relation.entity';
import { BlogCommentEntity } from './entity/blog-comment.entity';
import { BlogBookmarkEntity } from './entity/blog-bookmark.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BlogEntity,
      BlogCategoryEntity,
      BlogTagEntity,
      BlogTagRelationEntity,
      BlogCommentEntity,
      BlogBookmarkEntity,
    ]),
  ],
  controllers: [BlogController],
  providers: [BlogService],
})
export class BlogModule {}
