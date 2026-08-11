import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Queue } from 'bullmq';
import { QUIZ_JOB_EXPIRE_ATTEMPTS, QUIZ_QUEUE } from './quiz.constants';

@Injectable()
export class QuizScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(QuizScheduler.name);

  constructor(@InjectQueue(QUIZ_QUEUE) private readonly quizQueue: Queue) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.quizQueue.add(
      QUIZ_JOB_EXPIRE_ATTEMPTS,
      {},
      {
        repeat: { every: 60 * 60 * 1000 }, // every hour
        removeOnComplete: 10,
        removeOnFail: 50,
        jobId: 'expire-quiz-attempts-repeatable',
      },
    );
    this.logger.log('Scheduled expire-quiz-attempts job (every 1 hour)');
  }
}
