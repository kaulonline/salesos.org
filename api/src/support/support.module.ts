import { Module } from '@nestjs/common';
import { SupportService } from './support.service';
import { TicketAIAnalysisService } from './ticket-ai-analysis.service';
import { EmailPollingService } from './email-polling.service';
import { SlaService } from './sla.service';
import { AIAgentsService } from './ai-agents.service';
import { SupportQueuesService } from './support-queues.service';
import {
  SupportController,
  UserSupportController,
  AdminSupportController,
  WebhookController,
  RolesGuard,
} from './support.controller';
import { PrismaModule } from '../database/prisma.module';
import { AnthropicModule } from '../anthropic/anthropic.module';
import { EmailModule } from '../email/email.module';
import { PageIndexModule } from '../pageindex/pageindex.module';

// LLM-Driven Support Agent
import {
  SupportAgentService,
  SupportAgentExecutor,
  SupportAgentContext,
  SupportAgentSafety,
} from './agent';

@Module({
  imports: [PrismaModule, AnthropicModule, EmailModule, PageIndexModule],
  controllers: [SupportController, UserSupportController, AdminSupportController, WebhookController],
  providers: [
    SupportService,
    TicketAIAnalysisService,
    EmailPollingService,
    SlaService,
    RolesGuard,
    // AI Agents & Queues
    AIAgentsService,
    SupportQueuesService,
    // Support Agent components
    SupportAgentService,
    SupportAgentExecutor,
    SupportAgentContext,
    SupportAgentSafety,
  ],
  exports: [
    SupportService,
    TicketAIAnalysisService,
    EmailPollingService,
    SupportAgentService,
    SlaService,
    AIAgentsService,
    SupportQueuesService,
  ],
})
export class SupportModule {}
