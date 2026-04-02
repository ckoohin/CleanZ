import { TokenType } from 'src/common/enums/token-type.enum';
import { User } from 'src/modules/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('tokens')
export class Token {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: TokenType })
  type: string;

  @Column()
  token: string;

  @Column({ name: 'expires_at' })
  expiresAt: Date;

  @Column({ name: 'is_used', default: false })
  isUsed: boolean;

  @ManyToOne(() => User, (user) => user.tokens, { onDelete: 'CASCADE' })
  user: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
