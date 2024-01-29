import { InjectRepository } from '@nestjs/typeorm';
import { Inject } from '@nestjs/common';

import { Command, CommandRunner, Option } from 'nest-commander';
import { Repository } from 'typeorm';

import {
  FeatureFlagEntity,
  FeatureFlagKeys,
} from 'src/core/feature-flag/feature-flag.entity';
import { MessagingUtilsService } from 'src/workspace/messaging/services/messaging-utils.service';
import { MessageQueue } from 'src/integrations/message-queue/message-queue.constants';
import { MessageQueueService } from 'src/integrations/message-queue/services/message-queue.service';
import {
  GmailFullSyncJobData,
  GmailFullSyncJob,
} from 'src/workspace/messaging/jobs/gmail-full-sync.job';

interface GmailFullSyncOptions {
  workspaceId: string;
}

@Command({
  name: 'workspace:gmail-full-sync',
  description: 'Fetch messages of all workspaceMembers in a workspace.',
})
export class GmailFullSyncCommand extends CommandRunner {
  constructor(
    private readonly utils: MessagingUtilsService,
    @InjectRepository(FeatureFlagEntity, 'core')
    private readonly featureFlagRepository: Repository<FeatureFlagEntity>,
    @Inject(MessageQueue.messagingQueue)
    private readonly messageQueueService: MessageQueueService,
  ) {
    super();
  }

  async run(
    _passedParam: string[],
    options: GmailFullSyncOptions,
  ): Promise<void> {
    const isMessagingEnabled = await this.featureFlagRepository.findOneBy({
      workspaceId: options.workspaceId,
      key: FeatureFlagKeys.IsMessagingEnabled,
      value: true,
    });

    if (!isMessagingEnabled) {
      throw new Error('Messaging is not enabled for this workspace');
    }

    await this.fetchWorkspaceMessages(options.workspaceId);

    return;
  }

  @Option({
    flags: '-w, --workspace-id [workspace_id]',
    description: 'workspace id',
    required: true,
  })
  parseWorkspaceId(value: string): string {
    return value;
  }

  private async fetchWorkspaceMessages(workspaceId: string): Promise<void> {
    const { workspaceDataSource, dataSourceMetadata } =
      await this.utils.getDataSourceMetadataWorkspaceMetadata(workspaceId);

    const connectedAccounts = await this.utils.getConnectedAccounts(
      dataSourceMetadata,
      workspaceDataSource,
    );

    for (const connectedAccount of connectedAccounts) {
      await this.messageQueueService.add<GmailFullSyncJobData>(
        GmailFullSyncJob.name,
        {
          workspaceId,
          connectedAccountId: connectedAccount.id,
        },
        {
          id: `${workspaceId}-${connectedAccount.id}`,
          retryLimit: 2,
        },
      );
    }
  }
}
