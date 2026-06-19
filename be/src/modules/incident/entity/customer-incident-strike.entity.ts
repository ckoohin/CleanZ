import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CustomerEntity } from 'src/modules/customer/entity/customer.entity';
import { IncidentEntity } from './incident.entity';

@Entity('customer_incident_strikes')
@Index('idx_cis_customer', ['customer'])
export class CustomerIncidentStrikeEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => CustomerEntity, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'customer_id' })
  customer!: CustomerEntity;

  @ManyToOne(() => IncidentEntity, {
    nullable: true,
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'incident_id' })
  incident?: IncidentEntity | null;

  @Column({ type: 'text', nullable: true })
  reason?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
