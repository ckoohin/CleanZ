import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { QuizEntity } from './quiz.entity';
import { QuestionEntity } from './question.entity';

@Entity('quiz_questions')
@Unique(['quizId', 'questionId'])
@Unique(['quizId', 'orderIndex'])
export class QuizQuestionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'quiz_id', type: 'uuid' })
  @Index()
  quizId: string;

  @Column({ name: 'question_id', type: 'uuid' })
  @Index()
  questionId: string;

  @Column({ name: 'order_index', type: 'int' })
  orderIndex: number;

  @ManyToOne(() => QuizEntity, (q) => q.quizQuestions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quiz_id' })
  quiz: QuizEntity;

  @ManyToOne(() => QuestionEntity, (q) => q.quizQuestions, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'question_id' })
  question: QuestionEntity;
}
