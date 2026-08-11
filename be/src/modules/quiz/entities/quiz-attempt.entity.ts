import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { QuizAttemptStatus } from 'src/common/enums/quiz-attempt-status.enum';
import { QuizEntity } from './quiz.entity';
import { TaskerEntity } from 'src/modules/tasker/entity/tasker.entity';
import { QuizAttemptAnswerEntity } from './quiz-attempt-answer.entity';

@Entity('quiz_attempts')
export class QuizAttemptEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'quiz_id', type: 'uuid' })
  @Index()
  quizId: string;

  @Column({ name: 'tasker_id', type: 'uuid' })
  @Index()
  taskerId: string;

  @Column({ name: 'attempt_number', type: 'int', default: 1 })
  attemptNumber: number;

  @Column({
    type: 'enum',
    enum: QuizAttemptStatus,
    enumName: 'quiz_attempt_status',
    default: QuizAttemptStatus.IN_PROGRESS,
  })
  @Index()
  status: QuizAttemptStatus;

  @Column({ type: 'int', nullable: true })
  score: number | null;

  @Column({ name: 'correct_count', type: 'int', nullable: true })
  correctCount: number | null;

  @Column({ name: 'total_questions', type: 'int' })
  totalQuestions: number;

  @CreateDateColumn({ name: 'started_at', type: 'timestamp' })
  startedAt: Date;

  @Column({ name: 'submitted_at', type: 'timestamp', nullable: true })
  submittedAt: Date | null;

  @Column({ name: 'expired_at', type: 'timestamp', nullable: true })
  expiredAt: Date | null;

  @ManyToOne(() => QuizEntity, (q) => q.attempts)
  @JoinColumn({ name: 'quiz_id' })
  quiz: QuizEntity;

  @ManyToOne(() => TaskerEntity)
  @JoinColumn({ name: 'tasker_id' })
  tasker: TaskerEntity;

  @OneToMany(() => QuizAttemptAnswerEntity, (a) => a.attempt, { cascade: true })
  answers: QuizAttemptAnswerEntity[];
}
