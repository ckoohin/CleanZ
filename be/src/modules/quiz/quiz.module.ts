import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { QuestionEntity } from './entities/question.entity';
import { QuizEntity } from './entities/quiz.entity';
import { QuizQuestionEntity } from './entities/quiz-question.entity';
import { QuizAttemptEntity } from './entities/quiz-attempt.entity';
import { QuizAttemptAnswerEntity } from './entities/quiz-attempt-answer.entity';
import { TaskerEntity } from 'src/modules/tasker/entity/tasker.entity';
import { SystemConfigModule } from 'src/modules/system-config/system-config.module';
import { QuizService } from './quiz.service';
import { AdminQuizService } from './admin-quiz.service';
import { QuizController } from './quiz.controller';
import { QuizScheduler } from './quiz.scheduler';
import { QuizProcessor } from './quiz.processor';
import { QUIZ_QUEUE } from './quiz.constants';

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
    BullModule.registerQueue({ name: QUIZ_QUEUE }),
    SystemConfigModule,
  ],
  controllers: [QuizController],
  providers: [QuizService, AdminQuizService, QuizScheduler, QuizProcessor],
  exports: [QuizService, AdminQuizService],
})
export class QuizModule {}
