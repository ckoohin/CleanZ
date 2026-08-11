import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { QuizAttemptEntity } from './quiz-attempt.entity';
import { QuestionEntity } from './question.entity';

@Entity('quiz_attempt_answers')
@Unique(['attemptId', 'questionId'])
export class QuizAttemptAnswerEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'attempt_id', type: 'uuid' })
  @Index()
  attemptId: string;

  @Column({ name: 'question_id', type: 'uuid' })
  @Index()
  questionId: string;

  @Column({ name: 'selected_answer', type: 'text', nullable: true })
  selectedAnswer: string | null;

  @Column({ name: 'is_correct', type: 'boolean', default: false })
  isCorrect: boolean;

  @ManyToOne(() => QuizAttemptEntity, (a) => a.answers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attempt_id' })
  attempt: QuizAttemptEntity;

  @ManyToOne(() => QuestionEntity)
  @JoinColumn({ name: 'question_id' })
  question: QuestionEntity;
}
