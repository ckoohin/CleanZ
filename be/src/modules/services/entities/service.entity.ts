import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn 
} from 'typeorm';

@Entity('services')
export class ServiceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 100 })
  category!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  basePrice!: number;

  @Column({ type: 'int', nullable: true })
  duration?: number;

  @Column({ type: 'text', nullable: true })
  imageUrl?: string | null;

  @Column({ type: 'varchar', nullable: true })
  imagePublicId?: string | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: 'uuid', nullable: true })
  createdByAdminId?: string;

  @Column({ type: 'uuid', nullable: true })
  lastUpdatedByAdminId?: string;
}