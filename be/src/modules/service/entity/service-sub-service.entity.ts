import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ServicePackageEntity } from './service-package.entity';
import { SubServiceEntity } from './sub-service.entity';

@Entity('service_sub_services')
export class ServiceSubServiceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'package_id' })
  packageId!: string;

  @ManyToOne(() => ServicePackageEntity, (pkg) => pkg.subServices, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'package_id' })
  package!: ServicePackageEntity;

  @Column({ type: 'uuid', name: 'sub_service_id' })
  subServiceId!: string;

  @ManyToOne(() => SubServiceEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'sub_service_id' })
  subService!: SubServiceEntity;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  price!: number;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
