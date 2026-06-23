import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToMany,
} from 'typeorm';
import { ServicePackageEntity } from './service-package.entity';

@Entity('coverage_areas')
export class CoverageAreaEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 50, default: 'Hà Nội' })
  city!: string;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    name: 'transport_fee',
    default: 0.00,
  })
  transportFee!: number;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean;

  @ManyToMany(() => ServicePackageEntity, (sp) => sp.coverageAreas)
  packages!: ServicePackageEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
