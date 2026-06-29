import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { BlogBookmarkEntity } from './blog-bookmark.entity';
import { BlogCategoryEntity } from './blog-category.entity';
import { BlogCommentEntity } from './blog-comment.entity';
import { BlogTagRelationEntity } from './blog-tag-relation.entity';

export enum BlogStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

@Entity('blogs')
export class BlogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Index('uq_blogs_slug', { unique: true })
  @Column({ type: 'varchar', length: 280, unique: true })
  slug!: string;

  @Column({ type: 'text', nullable: true })
  summary!: string | null;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'thumbnail_url' })
  thumbnailUrl!: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'category_id' })
  categoryId!: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'author_id' })
  authorId!: string | null;

  @Index('idx_blogs_status')
  @Column({
    type: 'enum',
    enum: BlogStatus,
    enumName: 'blog_status',
    default: BlogStatus.DRAFT,
  })
  status!: BlogStatus;

  @Column({ type: 'int', default: 0, name: 'view_count' })
  viewCount!: number;

  @Column({ type: 'timestamp', nullable: true, name: 'published_at' })
  publishedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => BlogCategoryEntity, (category) => category.blogs, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'category_id' })
  category!: BlogCategoryEntity | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'author_id' })
  author!: User | null;

  @OneToMany(() => BlogTagRelationEntity, (relation) => relation.blog)
  tagRelations!: BlogTagRelationEntity[];

  @OneToMany(() => BlogCommentEntity, (comment) => comment.blog)
  comments!: BlogCommentEntity[];

  @OneToMany(() => BlogBookmarkEntity, (bookmark) => bookmark.blog)
  bookmarks!: BlogBookmarkEntity[];
}
