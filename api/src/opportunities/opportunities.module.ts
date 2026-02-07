import { Module, forwardRef } from '@nestjs/common';
import { OpportunitiesService } from './opportunities.service';
import { OpportunitiesController } from './opportunities.controller';
import { PipelineIntelligenceService } from './pipeline-intelligence.service';
import { PipelineController } from './pipeline.controller';
import { PrismaModule } from '../database/prisma.module';
import { AnthropicModule } from '../anthropic/anthropic.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SalesforceModule } from '../salesforce/salesforce.module';
import { OutcomeBillingModule } from '../outcome-billing/outcome-billing.module';

@Module({
  imports: [
    PrismaModule,
    AnthropicModule,
    NotificationsModule,
    forwardRef(() => SalesforceModule),
    forwardRef(() => OutcomeBillingModule),
  ],
  controllers: [OpportunitiesController, PipelineController],
  providers: [OpportunitiesService, PipelineIntelligenceService],
  exports: [OpportunitiesService, PipelineIntelligenceService],
})
export class OpportunitiesModule {}
