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

  @Column()
  expires_at: Date;

  @Column({ default: false })
  is_used: boolean;

  @ManyToOne(() => User, (user) => user.tokens, { onDelete: 'CASCADE' })
  user: User;

  @CreateDateColumn()
  created_at: Date;
}
