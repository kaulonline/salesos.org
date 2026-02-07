/**
 * Agent Builder Module
 * 
 * Provides dynamic agent creation, management, and execution.
 */

import { Module } from '@nestjs/common';
import { AgentBuilderController } from './agent-builder.controller';
import { AgentBuilderService } from './agent-builder.service';
import { PrismaModule } from '../../database/prisma.module';
import { AiSdkModule } from '../../ai-sdk/ai-sdk.module';
import { SalesforceModule } from '../../salesforce/salesforce.module';

@Module({
  imports: [
    PrismaModule,
    AiSdkModule,
    SalesforceModule, // For external CRM data access
  ],
  controllers: [AgentBuilderController],
  providers: [AgentBuilderService],
  exports: [AgentBuilderService],
})
export class AgentBuilderModule {}


