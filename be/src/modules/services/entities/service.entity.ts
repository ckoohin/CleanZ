import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ServiceLocationType } from 'src/common/enums/service-location-type.enum';

@Entity('services')
export class ServiceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 100, default: 'Khác' })
  category!: string;

  @Column({
    name: 'supported_location_types',
    type: 'enum',
    enum: ServiceLocationType,
    array: true,
    default: `{${ServiceLocationType.AT_SHOP}}`,
  })
  supportedLocationTypes!: ServiceLocationType[];

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'base_price', type: 'decimal', precision: 10, scale: 2 })
  basePrice!: number;

  @Column({ type: 'int', nullable: true })
  duration?: number;

  @Column({ name: 'image_url', type: 'text', nullable: true })
  imageUrl?: string | null;

  @Column({ name: 'image_public_id', type: 'varchar', nullable: true })
  imagePublicId?: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ name: 'created_by_admin_id', type: 'uuid', nullable: true })
  createdByAdminId?: string;

  @Column({ name: 'last_updated_by_admin_id', type: 'uuid', nullable: true })
  lastUpdatedByAdminId?: string;
}
