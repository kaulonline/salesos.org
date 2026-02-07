import { Module } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { OracleCXConversationsService } from './oracle-cx-conversations.service';
import { ConversationsController } from './conversations.controller';
import { SmartDataAnalyzerService } from './smart-data-analyzer.service';
import { AnalyticsService } from './analytics.service';
import { CallIntelligenceService } from './call-intelligence.service';
import { CallIntelligenceController } from './call-intelligence.controller';
import { AnthropicModule } from '../anthropic/anthropic.module';
import { AiSdkModule } from '../ai-sdk/ai-sdk.module';
import { LeadsModule } from '../leads/leads.module';
import { OpportunitiesModule } from '../opportunities/opportunities.module';
import { AccountsModule } from '../accounts/accounts.module';
import { SearchModule } from '../search/search.module';
import { PageIndexModule } from '../pageindex/pageindex.module';
import { FeedbackModule } from '../feedback/feedback.module';
import { MeetingsModule } from '../meetings/meetings.module';
import { EmailTrackingModule } from '../email-tracking/email-tracking.module';
import { QuotesModule } from '../quotes/quotes.module';
import { ContractsModule } from '../contracts/contracts.module';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { NotesModule } from '../notes/notes.module';
import { TasksModule } from '../tasks/tasks.module';
import { SalesforceModule } from '../salesforce/salesforce.module';
import { OracleCXModule } from '../oracle-cx/oracle-cx.module';
import { AdminModule } from '../admin/admin.module';
import { PrismaModule } from '../database/prisma.module';
import { DigitalWorkersModule } from '../digital-workers/digital-workers.module';

@Module({
  imports: [PrismaModule, AnthropicModule, AiSdkModule, LeadsModule, OpportunitiesModule, AccountsModule, SearchModule, PageIndexModule, FeedbackModule, MeetingsModule, EmailTrackingModule, QuotesModule, ContractsModule, CampaignsModule, NotesModule, TasksModule, SalesforceModule, OracleCXModule, AdminModule, DigitalWorkersModule],
  controllers: [ConversationsController, CallIntelligenceController],
  providers: [ConversationsService, OracleCXConversationsService, SmartDataAnalyzerService, AnalyticsService, CallIntelligenceService],
  exports: [ConversationsService, OracleCXConversationsService, CallIntelligenceService],
})
export class ConversationsModule {}
