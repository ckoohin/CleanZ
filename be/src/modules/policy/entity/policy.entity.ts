import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
} from 'typeorm';
import { ServicePackageEntity } from '../../service/entity/service-package.entity';

export enum PolicyRole {
  CUSTOMER = 'CUSTOMER',
  TASKER = 'TASKER',
  ALL = 'ALL',
}

export enum PolicyCategory {
  LEGAL = 'LEGAL',
  CLEANING_STANDARD = 'CLEANING_STANDARD',
  INCIDENT_HANDLING = 'INCIDENT_HANDLING',
  CANCELLATION = 'CANCELLATION',
  CUSTOMER_SUPPORT = 'CUSTOMER_SUPPORT',
  PAYMENT = 'PAYMENT',
  GENERAL = 'GENERAL',
}

@Entity('policies')
export class Policy {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 255 })
  title!: string;

  @Column({ unique: true })
  slug!: string;

  @Column('text')
  content!: string;

  @Column({
    type: 'enum',
    enum: PolicyRole,
    default: PolicyRole.ALL,
  })
  role!: PolicyRole;

  /**
   * Dùng name: 'category' để rõ ràng — migration sẽ tạo cột này.
   * Enum type sẽ được tạo bởi migration trước khi column được thêm.
   */
  @Column({
    type: 'enum',
    enum: PolicyCategory,
    default: PolicyCategory.GENERAL,
    name: 'category',
  })
  category!: PolicyCategory;

  /** Emoji icon: '⚖️', '🧹', '🛡️'... */
  @Column({ name: 'icon_emoji', length: 10, default: '📄' })
  iconEmoji!: string;

  /** Tự động gán khi tạo Package mới */
  @Column({ name: 'is_default', default: false })
  isDefault!: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  /**
   * Giữ nguyên tên cột "isActive" (camelCase) để khớp với bảng DB cũ.
   * KHÔNG đặt name: 'is_active' để tránh conflict.
   */
  @Column({ default: true })
  isActive!: boolean;

  /**
   * Giữ nguyên "createdAt" / "updatedAt" để khớp DB cũ (camelCase).
   * Không đặt name: 'created_at' vì bảng cũ dùng camelCase.
   */
  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToMany(() => ServicePackageEntity, (pkg) => pkg.policies)
  packages!: ServicePackageEntity[];
}
