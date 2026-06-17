import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ChannelResolverService } from './channels/channel-resolver.service';
import { InAppChannel } from './channels/in-app.channel';
import { EmailChannel } from './channels/email.channel';
import { NotifyInput } from './types/notify-input.interface';
import { NOTIFICATION_QUEUE } from './notification.constants';

@Processor(NOTIFICATION_QUEUE)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly channelResolver: ChannelResolverService,
    private readonly inAppChannel: InAppChannel,
    private readonly emailChannel: EmailChannel,
  ) {
    super();
  }

  async process(job: Job<NotifyInput>): Promise<void> {
    const input = job.data;
    const channels = this.channelResolver.resolve(input);

    if (channels.includes('IN_APP')) {
      await this.inAppChannel.send(input);
    }

    if (channels.includes('EMAIL')) {
      await this.emailChannel.send(input);
    }

    this.logger.log(
      `Processed notification job ${job.id ?? '-'} (type=${input.type}, channels=${channels.join(',')})`,
    );
  }
}
