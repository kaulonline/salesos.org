/**
 * IRIS Agent Framework - Module
 * 
 * Central module that registers all agent-related services.
 * This module provides:
 * - Agent orchestration
 * - REST API for agent management
 * - Agent Builder for user-created agents
 * - Base agent utilities
 * - Example agent implementations
 */

import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';

// Core framework
import { AgentOrchestratorService } from './orchestrator/agent-orchestrator.service';
import { AgentsController } from './agents.controller';

// Agent Builder (dynamic agents)
import { AgentBuilderModule } from './builder/agent-builder.module';
import { AgentBuilderController } from './builder/agent-builder.controller';
import { AgentBuilderService } from './builder/agent-builder.service';

// Agent implementations
import { DealHealthAgentService } from './examples/deal-health-agent.service';
import { PipelineAccelerationAgentService } from './examples/pipeline-acceleration-agent.service';
import { AccountIntelligenceAgentService } from './examples/account-intelligence-agent.service';
import { OutreachOptimizationAgentService } from './examples/outreach-optimization-agent.service';
import { SalesCoachingAgentService } from './examples/sales-coaching-agent.service';
import { NextBestActionAgentService } from './examples/next-best-action-agent.service';

// Digital Worker Agents
import { ListeningAgentService } from './digital-workers/listening-agent.service';
import { ReasoningAgentService } from './digital-workers/reasoning-agent.service';
import { LearnMoreAgentService } from './digital-workers/learn-more-agent.service';
import { EmailActionAgentService } from './digital-workers/email-action-agent.service';
import { CrmActionAgentService } from './digital-workers/crm-action-agent.service';
import { MeetingActionAgentService } from './digital-workers/meeting-action-agent.service';

// Shared modules
import { PrismaModule } from '../database/prisma.module';
import { AiSdkModule } from '../ai-sdk/ai-sdk.module';
import { RedisCacheModule } from '../cache/cache.module';
import { CacheService } from '../cache/cache.service';
import { SalesforceModule } from '../salesforce/salesforce.module'; // For external CRM data access
import { OracleCXModule } from '../oracle-cx/oracle-cx.module'; // For Oracle CX Sales Cloud data access
import { IntegrationsModule } from '../integrations/integrations.module'; // For ZoomInfo, Snowflake, etc.

// Types
import { AgentType } from './types';

@Module({
  imports: [
    PrismaModule,
    AiSdkModule,
    RedisCacheModule,
    SalesforceModule, // For external CRM data access in agents
    OracleCXModule, // For Oracle CX Sales Cloud data access in agents
    IntegrationsModule, // For ZoomInfo, Snowflake external signal sources
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 20,
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [
    // AgentBuilderController MUST be before AgentsController
    // because AgentsController has @Get(':agentType') which would catch /agents/builder
    AgentBuilderController,
    AgentsController,
  ],
  providers: [
    // Core orchestrator
    AgentOrchestratorService,
    
    // Cache service
    CacheService,
    
    // Agent Builder
    AgentBuilderService,
    
    // Built-in Agents
    DealHealthAgentService,
    PipelineAccelerationAgentService,
    AccountIntelligenceAgentService,
    OutreachOptimizationAgentService,
    SalesCoachingAgentService, // Vertiv MVP #2: AI-Enabled Sales Coaching
    NextBestActionAgentService, // Vertiv MVP #1: Next Best Action for O2O Journey

    // Digital Worker Agents
    ListeningAgentService,
    ReasoningAgentService,
    LearnMoreAgentService,
    EmailActionAgentService,
    CrmActionAgentService,
    MeetingActionAgentService,
  ],
  exports: [
    AgentOrchestratorService,
    AgentBuilderService,
    DealHealthAgentService,
    PipelineAccelerationAgentService,
    AccountIntelligenceAgentService,
    OutreachOptimizationAgentService,
    SalesCoachingAgentService,
    NextBestActionAgentService, // Vertiv MVP #1
    // Digital Worker Agents
    ListeningAgentService,
    ReasoningAgentService,
    LearnMoreAgentService,
    EmailActionAgentService,
    CrmActionAgentService,
    MeetingActionAgentService,
  ],
})
export class AgentsModule implements OnModuleInit {
  private readonly logger = new Logger(AgentsModule.name);

  constructor(
    private readonly orchestrator: AgentOrchestratorService,
    private readonly dealHealthAgent: DealHealthAgentService,
    private readonly pipelineAccelerationAgent: PipelineAccelerationAgentService,
    private readonly accountIntelligenceAgent: AccountIntelligenceAgentService,
    private readonly outreachOptimizationAgent: OutreachOptimizationAgentService,
    private readonly salesCoachingAgent: SalesCoachingAgentService,
    private readonly nextBestActionAgent: NextBestActionAgentService, // Vertiv MVP #1
    // Digital Worker Agents
    private readonly listeningAgent: ListeningAgentService,
    private readonly reasoningAgent: ReasoningAgentService,
    private readonly learnMoreAgent: LearnMoreAgentService,
    private readonly emailActionAgent: EmailActionAgentService,
    private readonly crmActionAgent: CrmActionAgentService,
    private readonly meetingActionAgent: MeetingActionAgentService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing Agent Framework...');

    // Register all agents with the orchestrator
    this.orchestrator.registerAgent(
      AgentType.DEAL_HEALTH,
      this.dealHealthAgent,
      this.dealHealthAgent['config'],
    );

    this.orchestrator.registerAgent(
      AgentType.PIPELINE_ACCELERATION,
      this.pipelineAccelerationAgent,
      this.pipelineAccelerationAgent['config'],
    );

    this.orchestrator.registerAgent(
      AgentType.ACCOUNT_INTELLIGENCE,
      this.accountIntelligenceAgent,
      this.accountIntelligenceAgent['config'],
    );

    this.orchestrator.registerAgent(
      AgentType.OUTREACH_OPTIMIZATION,
      this.outreachOptimizationAgent,
      this.outreachOptimizationAgent['config'],
    );

    this.orchestrator.registerAgent(
      AgentType.COACHING,
      this.salesCoachingAgent,
      this.salesCoachingAgent['config'],
    );

    // Vertiv MVP #1: Next Best Action Agent
    this.orchestrator.registerAgent(
      AgentType.NEXT_BEST_ACTION,
      this.nextBestActionAgent,
      this.nextBestActionAgent['config'],
    );

    // Register Digital Worker Agents
    this.orchestrator.registerAgent(
      AgentType.LISTENING,
      this.listeningAgent,
      this.listeningAgent['config'],
    );

    this.orchestrator.registerAgent(
      AgentType.REASONING,
      this.reasoningAgent,
      this.reasoningAgent['config'],
    );

    this.orchestrator.registerAgent(
      AgentType.LEARN_MORE,
      this.learnMoreAgent,
      this.learnMoreAgent['config'],
    );

    this.orchestrator.registerAgent(
      AgentType.EMAIL_ACTION,
      this.emailActionAgent,
      this.emailActionAgent['config'],
    );

    this.orchestrator.registerAgent(
      AgentType.CRM_ACTION,
      this.crmActionAgent,
      this.crmActionAgent['config'],
    );

    this.orchestrator.registerAgent(
      AgentType.MEETING_ACTION,
      this.meetingActionAgent,
      this.meetingActionAgent['config'],
    );

    this.logger.log(`Agent Framework initialized with ${12} registered agents`);
  }
}


