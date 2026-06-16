import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('system_configs')
export class SystemConfigEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'config_key', type: 'varchar', length: 100, unique: true })
  configKey!: string;

  @Column({ name: 'config_value', type: 'text' })
  configValue!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
