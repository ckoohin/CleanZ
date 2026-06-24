import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ServicePackageEntity } from './service-package.entity';
import { SubServiceEntity } from './sub-service.entity';

@Entity('package_sub_services')
export class PackageSubServiceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'package_id' })
  packageId!: string;

  @Column({ type: 'uuid', name: 'sub_service_id' })
  subServiceId!: string;

  @ManyToOne(() => ServicePackageEntity, (sp) => sp.packageSubServices, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'package_id' })
  package!: ServicePackageEntity;

  @ManyToOne(() => SubServiceEntity, (ss) => ss.packageSubServices, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'sub_service_id' })
  subService!: SubServiceEntity;

  @Column({ type: 'boolean', default: false, name: 'is_required' })
  isRequired!: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_default' })
  isDefault!: boolean;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    name: 'exclusivity_group_id',
  })
  exclusivityGroupId?: string | null;

  @Column({ type: 'int', default: 0, name: 'sort_order' })
  sortOrder!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
