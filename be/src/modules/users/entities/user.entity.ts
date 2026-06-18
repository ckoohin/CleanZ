import { Exclude } from 'class-transformer';
import { AuthProvider } from 'src/common/enums/auth-provider.enum';
import { UserRole } from 'src/common/enums/user-role.enum';
import { BaseEntity } from 'src/common/utils/base-entity';
import { Token } from 'src/modules/token/entities/token.entity';
import { Entity, Column, OneToMany, DeleteDateColumn } from 'typeorm';

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 11, nullable: true })
  phone!: string;

  @Exclude()
  @Column({ name: 'password_hash', select: false, nullable: true })
  password?: string;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl?: string;

  @Column({ name: 'full_name', length: 100 })
  fullName!: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CUSTOMER,
  })
  role!: UserRole;

  @Column({ type: 'enum', enum: AuthProvider, default: AuthProvider.LOCAL })
  provider!: AuthProvider;

  @Column({ name: 'provider_id', nullable: true })
  providerId?: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'is_verified', type: 'boolean', default: false })
  isVerified!: boolean;

  @Column({ name: 'last_login', type: 'timestamp', nullable: true })
  lastLogin!: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;

  @OneToMany(() => Token, (token) => token.user)
  tokens?: Token[];
}

export { User as UserEntity };
