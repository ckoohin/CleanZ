import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { QuizQuestionEntity } from './quiz-question.entity';
import { QuizAttemptEntity } from './quiz-attempt.entity';

@Entity('quizzes')
export class QuizEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'time_limit_minutes', type: 'int', default: -1 })
  timeLimitMinutes: number;

  @Column({ name: 'max_attempts', type: 'int', default: 3 })
  maxAttempts: number;

  @Column({ name: 'passing_score', type: 'int', default: 80 })
  passingScore: number;

  @Column({ name: 'is_active', type: 'boolean', default: false })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @OneToMany(() => QuizQuestionEntity, (qq) => qq.quiz, { cascade: true })
  quizQuestions: QuizQuestionEntity[];

  @OneToMany(() => QuizAttemptEntity, (a) => a.quiz)
  attempts: QuizAttemptEntity[];
}
