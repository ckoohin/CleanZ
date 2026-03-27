import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    JoinColumn,
    OneToOne,
    OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { WorkerDocumentEntity } from './worker-document.entity';

export enum WorkerStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
}

@Entity('workerProfiles')
export class WorkerEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @OneToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user!: User;

    @Column({ nullable: true, type: 'text' })
    skills!: string;

    @Column({ nullable: true, type: 'text' })
    experience!: string;

    @Column({ nullable: true, type: 'text' })
    bio!: string;

    @Column({ type: 'text', nullable: true })
    avatarPath!: string | null;

    @OneToMany(() => WorkerDocumentEntity, document => document.worker, { cascade: true })
    documents?: WorkerDocumentEntity[];

    @Column({ type: 'int', default: 0 })
    totalJobs!: number;

    @Column({ type: 'float', default: 0 })
    avgRating!: number;


    @Column({
        type: 'enum',
        enum: WorkerStatus,
        default: WorkerStatus.PENDING,
    })
    status!: WorkerStatus;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
