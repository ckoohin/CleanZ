import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { BlogEntity } from './blog.entity';
import { BlogTagEntity } from './blog-tag.entity';

@Entity('blog_tag_relations')
export class BlogTagRelationEntity {
  @PrimaryColumn({ type: 'uuid', name: 'blog_id' })
  blogId!: string;

  @PrimaryColumn({ type: 'uuid', name: 'tag_id' })
  tagId!: string;

  @ManyToOne(() => BlogEntity, (blog) => blog.tagRelations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'blog_id' })
  blog!: BlogEntity;

  @ManyToOne(() => BlogTagEntity, (tag) => tag.blogRelations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tag_id' })
  tag!: BlogTagEntity;
}
