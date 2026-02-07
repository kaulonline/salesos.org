/**
 * LLM Module
 * 
 * Provides a unified interface to multiple LLM providers via LiteLLM.
 * All AI services should use LLMService instead of provider-specific SDKs.
 */

import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LLMService } from './llm.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [LLMService],
  exports: [LLMService],
})
export class LLMModule {}
