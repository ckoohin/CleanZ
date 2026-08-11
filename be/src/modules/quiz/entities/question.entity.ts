import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { QuizQuestionEntity } from './quiz-question.entity';

@Entity('questions')
export class QuestionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'question_text', type: 'text' })
  questionText: string;

  @Column({ type: 'jsonb' })
  options: string[];

  @Column({ name: 'correct_answer', type: 'text' })
  correctAnswer: string;

  @Column({ type: 'jsonb', nullable: true })
  tags: string[] | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @OneToMany(() => QuizQuestionEntity, (qq) => qq.question)
  quizQuestions: QuizQuestionEntity[];
}
