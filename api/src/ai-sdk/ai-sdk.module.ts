import { Module } from '@nestjs/common';
import { AiSdkService } from './ai-sdk.service';
import { QueryRouterService } from './query-router.service';
import { AiQueueService } from './ai-queue.service';
import { ToolRouterService } from './tool-router.service';
import { LLMCompilerService } from './llm-compiler.service';
import { ToolEmbeddingsService } from './tool-embeddings.service';
import { IrisOptimizerService } from './iris-optimizer.service';
import { IRISRankService } from './iris-rank.service';
import { SpeculativeCascadeService } from './speculative-cascade.service';
import { AzureOpenAIRetryService } from '../common/azure-openai-retry.service';
import { LocalSLMService } from './local-slm.service';

@Module({
  providers: [
    AiSdkService,
    QueryRouterService,
    AiQueueService,
    ToolRouterService,
    LLMCompilerService,
    ToolEmbeddingsService,
    IrisOptimizerService,
    IRISRankService,
    SpeculativeCascadeService,
    AzureOpenAIRetryService,
    LocalSLMService,
  ],
  exports: [
    AiSdkService,
    QueryRouterService,
    AiQueueService,
    ToolRouterService,
    LLMCompilerService,
    ToolEmbeddingsService,
    IrisOptimizerService,
    IRISRankService,
    SpeculativeCascadeService,
    LocalSLMService,
  ],
})
export class AiSdkModule {}
