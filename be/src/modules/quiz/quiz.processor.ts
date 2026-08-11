import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DataSource } from 'typeorm';
import { QUIZ_JOB_EXPIRE_ATTEMPTS, QUIZ_QUEUE } from './quiz.constants';
import { QuizService } from './quiz.service';
import { SystemConfigService } from 'src/modules/system-config/system-config.service';
import { SYSTEM_CONFIG_KEYS } from 'src/modules/system-config/system-config.keys';

@Processor(QUIZ_QUEUE)
export class QuizProcessor extends WorkerHost {
  private readonly logger = new Logger(QuizProcessor.name);

  constructor(
    private readonly quizService: QuizService,
    private readonly systemConfigService: SystemConfigService,
    private readonly dataSource: DataSource,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === QUIZ_JOB_EXPIRE_ATTEMPTS) {
      const hours = await this.dataSource.transaction((manager) =>
        this.systemConfigService
          .getRegisteredNumber(
            manager,
            SYSTEM_CONFIG_KEYS.QUIZ_UNLIMITED_EXPIRE_HOURS,
          )
          .catch(() => 24),
      );

      const count = await this.quizService.expireStaleAttempts(hours);
      if (count > 0) {
        this.logger.log(`Force-expired ${count} stale quiz attempt(s)`);
      }
    }
  }
}
