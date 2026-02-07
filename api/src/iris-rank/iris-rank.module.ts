/**
 * IRISRank Module
 *
 * Provides REST API endpoints for the IRISRank algorithm.
 * This module exposes IRISRank as a standalone service that can be used by:
 * - External teams (Marketing, Sales Ops, Customer Success)
 * - Third-party integrations
 * - Mobile applications
 * - Data science pipelines
 */

import { Module } from '@nestjs/common';
import { IRISRankController } from './iris-rank.controller';
import { AiSdkModule } from '../ai-sdk/ai-sdk.module';
import { AnthropicModule } from '../anthropic/anthropic.module';

@Module({
  imports: [
    AiSdkModule, // Import AiSdkModule which provides IRISRankService
    AnthropicModule, // For AI-powered next steps generation
  ],
  controllers: [IRISRankController],
})
export class IRISRankModule {}
