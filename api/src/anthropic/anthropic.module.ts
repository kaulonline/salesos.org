import { Module } from '@nestjs/common';
import { AnthropicService } from './anthropic.service';
import { AzureOpenAIRetryService } from '../common/azure-openai-retry.service';

@Module({
  providers: [AnthropicService, AzureOpenAIRetryService],
  exports: [AnthropicService],
})
export class AnthropicModule {}
