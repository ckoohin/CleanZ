import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    JoinColumn,
    OneToOne,
} from 'typeorm';
import { User } from '../users/entities/user.entity';

export enum WorkerStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
}

@Entity('worker_profiles')
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

    @Column({ type: 'text', nullable: true })
    citizenCardImagePath: string | null = null;

    @Column({ type: 'text', nullable: true })
    certificateImagePath: string | null = null;

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
