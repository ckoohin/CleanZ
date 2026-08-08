import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionEntity } from './entities/question.entity';
import { QuizEntity } from './entities/quiz.entity';
import { QuizQuestionEntity } from './entities/quiz-question.entity';
import { QuizAttemptEntity } from './entities/quiz-attempt.entity';
import { QuizAttemptAnswerEntity } from './entities/quiz-attempt-answer.entity';
import { TaskerEntity } from 'src/modules/tasker/entity/tasker.entity';
import { QuizService } from './quiz.service';
import { AdminQuizService } from './admin-quiz.service';
import { QuizController } from './quiz.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      QuestionEntity,
      QuizEntity,
      QuizQuestionEntity,
      QuizAttemptEntity,
      QuizAttemptAnswerEntity,
      TaskerEntity,
    ]),
  ],
  controllers: [QuizController],
  providers: [QuizService, AdminQuizService],
  exports: [QuizService, AdminQuizService],
})
export class QuizModule {}
